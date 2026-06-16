const express = require("express");
const multer = require("multer");
const archiver = require("archiver");

const { verifyToken, requireRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { parsePagination, isNotFoundError } = require("../utils/http");

const router = express.Router();

/* ============================================================================
   Admin "data dump" vault.

   A deliberately simple, self-contained store for arbitrary uploaded
   artefacts: large text files, zipped folders, screenshots, anything. Raw
   bytes are kept in Postgres (DumpItem.content / bytea). Every endpoint is
   gated to ADMIN.

   LIMITATIONS (by design — this is a practice target, not production storage):
   • Per-file cap (DUMP_MAX_FILE_MB, default 10MB) and per-request file count
     (DUMP_MAX_FILES, default 20). Render's free tier has ~512MB RAM and multer
     buffers each upload in memory, so big files can OOM the service — keep the
     cap modest.
   • Soft total cap (DUMP_TOTAL_LIMIT_MB, default 200MB). Bytes share the same
     Postgres instance as the app's real data; the free Postgres plan is ~1GB,
     so an unbounded dump would starve projects/test-cases/runs.
   • A browser can't upload a *folder* as one object — zip it first (stored as
     an ARCHIVE), or multi-select files. Nothing is unzipped server-side.
   • No virus scanning, no de-duplication, no thumbnails, no resumable uploads.
   • Download streams the whole file back through memory (no range requests).
   • To make this production-grade, swap `content` for an object-storage key
     (S3 / Cloudflare R2) and stream to/from there instead of bytea.
   ========================================================================== */

const MAX_FILE_BYTES = (Number(process.env.DUMP_MAX_FILE_MB) || 10) * 1024 * 1024;
const MAX_FILES = Number(process.env.DUMP_MAX_FILES) || 20;
const TOTAL_LIMIT_BYTES =
  (Number(process.env.DUMP_TOTAL_LIMIT_MB) || 200) * 1024 * 1024;
// Cap a single zip request — archiver streams the compressed output, but each
// source file is pulled into memory as a bytea buffer, so guard against OOM.
const ZIP_MAX_BYTES = (Number(process.env.DUMP_ZIP_MAX_MB) || 100) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
});

// Coarse bucket for the UI, derived from the reported mime type / extension.
function classify(file) {
  const type = file.mimetype || "";
  const name = (file.originalname || "").toLowerCase();

  if (type.startsWith("image/")) return "IMAGE";
  if (
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    type === "application/gzip" ||
    type === "application/x-tar" ||
    /\.(zip|gz|tar|tgz|rar|7z)$/.test(name)
  ) {
    return "ARCHIVE";
  }
  if (
    type.startsWith("text/") ||
    type === "application/json" ||
    /\.(txt|log|csv|json|md|xml|yml|yaml)$/.test(name)
  ) {
    return "TEXT";
  }
  return "OTHER";
}

// Fields safe to return in listings — never the (potentially huge) content.
const LIST_SELECT = {
  id: true,
  filename: true,
  mimeType: true,
  sizeBytes: true,
  kind: true,
  notes: true,
  uploadedById: true,
  createdAt: true,
};

router.use(verifyToken);
router.use(requireRole("ADMIN"));

// List items (metadata only) + aggregate usage so the UI can show a quota bar.
router.get("/", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { maxLimit: 100 });

    const [items, total, usage] = await Promise.all([
      prisma.dumpItem.findMany({
        select: LIST_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.dumpItem.count(),
      prisma.dumpItem.aggregate({ _sum: { sizeBytes: true } }),
    ]);

    res.json({
      items,
      usage: {
        usedBytes: usage._sum.sizeBytes || 0,
        limitBytes: TOTAL_LIMIT_BYTES,
        maxFileBytes: MAX_FILE_BYTES,
        maxFiles: MAX_FILES,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Upload one or more files in a single request (field name: "files").
router.post("/", (req, res) => {
  upload.array("files", MAX_FILES)(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: `Each file must be ${MAX_FILE_BYTES / (1024 * 1024)}MB or smaller.`,
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res
          .status(413)
          .json({ message: `Upload at most ${MAX_FILES} files at a time.` });
      }
      return res.status(400).json({ message: "Upload failed." });
    }

    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ message: "No files were provided." });
    }

    try {
      const incoming = files.reduce((sum, f) => sum + f.size, 0);
      const current = await prisma.dumpItem.aggregate({ _sum: { sizeBytes: true } });
      const used = current._sum.sizeBytes || 0;

      if (used + incoming > TOTAL_LIMIT_BYTES) {
        return res.status(413).json({
          message: `Storage limit reached (${TOTAL_LIMIT_BYTES / (1024 * 1024)}MB). Delete some items and try again.`,
        });
      }

      const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";

      const created = await prisma.$transaction(
        files.map((file) =>
          prisma.dumpItem.create({
            data: {
              filename: file.originalname || "upload.bin",
              mimeType: file.mimetype || "application/octet-stream",
              sizeBytes: file.size,
              kind: classify(file),
              notes: notes || null,
              content: file.buffer,
              uploadedById: req.user.id,
            },
            select: LIST_SELECT,
          })
        )
      );

      res.status(201).json({ items: created });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
});

// Bundle a selection of items into a single streamed zip.
router.post("/zip", async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids)
      ? req.body.ids.filter((id) => typeof id === "string")
      : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: "Select at least one item to zip." });
    }

    // Size guard up front (metadata only, no content fetched yet).
    const metas = await prisma.dumpItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, sizeBytes: true },
    });

    if (metas.length === 0) {
      return res.status(404).json({ message: "None of the selected items exist." });
    }

    const totalBytes = metas.reduce((sum, m) => sum + m.sizeBytes, 0);
    if (totalBytes > ZIP_MAX_BYTES) {
      return res.status(413).json({
        message: `Selection is too large to zip (max ${ZIP_MAX_BYTES / (1024 * 1024)}MB). Pick fewer items.`,
      });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="dump-export-${Date.now()}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.log(err);
      res.destroy(err);
    });
    archive.pipe(res);

    // Pull each file's bytes one at a time (rather than one big findMany) to
    // keep peak memory down, and de-duplicate identical filenames so the zip
    // doesn't silently overwrite entries.
    const usedNames = new Map();
    for (const id of ids) {
      const item = await prisma.dumpItem.findUnique({ where: { id } });
      if (!item) continue;

      let name = item.filename || `${id}.bin`;
      const seen = usedNames.get(name) || 0;
      usedNames.set(name, seen + 1);
      if (seen > 0) {
        const dot = name.lastIndexOf(".");
        name =
          dot > 0
            ? `${name.slice(0, dot)} (${seen})${name.slice(dot)}`
            : `${name} (${seen})`;
      }

      archive.append(item.content, { name });
    }

    await archive.finalize();
  } catch (error) {
    console.log(error);
    // Headers may already be sent once piping starts; only send JSON if not.
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error" });
    } else {
      res.destroy(error);
    }
  }
});

// Stream a single item's bytes back as a download.
router.get("/:id/download", async (req, res) => {
  try {
    const item = await prisma.dumpItem.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const safeName = item.filename.replace(/[\r\n"]/g, "_");
    res.setHeader("Content-Type", item.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", item.sizeBytes);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"`
    );
    res.send(item.content);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.dumpItem.delete({ where: { id: req.params.id } });
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    if (isNotFoundError(error)) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
