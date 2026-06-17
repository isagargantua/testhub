import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteDump,
  downloadDump,
  downloadDumpsZip,
  getDumps,
  uploadDumps,
} from "../api/dumps";
import { SkeletonTableRows } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

const KIND_STYLES = {
  IMAGE: "bg-[rgba(79,70,229,0.12)] text-[#4f46e5]",
  ARCHIVE: "bg-[rgba(201,111,59,0.12)] text-[#9d552c]",
  TEXT: "bg-[rgba(88,137,102,0.14)] text-[#466451]",
  OTHER: "bg-[rgba(100,116,139,0.14)] text-[#64748b]",
};

function getErrorMessage(error, fallback) {
  const response = error?.response?.data;
  if (response?.message) return response.message;
  if (Array.isArray(response?.errors)) {
    return response.errors
      .map((item) => item.msg || item.message)
      .filter(Boolean)
      .join(", ");
  }
  return fallback;
}

export default function Dump() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deletingId, setDeletingId] = useState("");
  const fileInputRef = useRef(null);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [zipping, setZipping] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDumps({ limit: 100 });
      setItems(data.items);
      setUsage(data.usage);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load file storage right now."));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!files.length) {
      toast.error("Pick at least one file to upload.");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const data = await uploadDumps(files, notes, setProgress);

      toast.success(`Stored ${data.items.length} item(s).`);
      setFiles([]);
      setNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDownload(item) {
    try {
      await downloadDump(item.id, item.filename);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not download that item."));
    }
  }

  async function handleDelete(item) {
    const confirmed = await confirm({
      title: `Delete “${item.filename}”?`,
      message: "This permanently removes the file. This cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!confirmed) {
      return;
    }
    try {
      setDeletingId(item.id);
      await deleteDump(item.id);
      toast.success(`Deleted “${item.filename}”`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete that item."));
    } finally {
      setDeletingId("");
    }
  }

  function enterSelect() {
    setSelecting(true);
    setSelected(new Set());
  }

  function cancelSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))
    );
  }

  async function handleZip() {
    if (!selected.size) return;
    try {
      setZipping(true);
      await downloadDumpsZip([...selected]);
      toast.success(`Zipped ${selected.size} item(s).`);
      cancelSelect();
    } catch (err) {
      // With responseType "blob", an error body comes back as a Blob, so the
      // usual error-message extraction needs the text decoded first.
      let message = "Could not create the ZIP.";
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          if (parsed.message) message = parsed.message;
        } catch {
          /* keep default message */
        }
      } else {
        message = getErrorMessage(err, message);
      }
      toast.error(message);
    } finally {
      setZipping(false);
    }
  }

  const usedPct = usage
    ? Math.min(100, Math.round((usage.usedBytes / usage.limitBytes) * 100))
    : 0;
  const colCount = selecting ? 6 : 5;
  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Admin · Storage</div>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">File Storage</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a] md:text-base">
            A private space for admins to store arbitrary artefacts — large text
            files, zipped folders, screenshots and more. Upload, download, and
            clean up below.
          </p>
        </div>

        <div className="card-soft max-w-sm">
          <div className="eyebrow">Good to know</div>
          <ul className="mt-3 space-y-1.5 text-sm leading-6 text-[#75675a]">
            <li>
              • Up to{" "}
              <strong>
                {usage ? formatBytes(usage.maxFileBytes) : "25 MB"}
              </strong>{" "}
              per file, {usage?.maxFiles || 20} files per upload.
            </li>
            <li>• Folders aren't uploadable directly — zip them first.</li>
            <li>• No virus scanning; don't store secrets here.</li>
          </ul>
        </div>
      </div>

      {usage && (
        <div className="card">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[#2d241a]">Storage usage</span>
            <span className="text-[#75675a]">
              {formatBytes(usage.usedBytes)} of {formatBytes(usage.limitBytes)} (
              {usedPct}%)
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(80,67,43,0.08)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#6366f1] transition-[width] duration-300"
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="label">Step 1 — Choose files</label>
            <label className="dump-dropzone">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {files.length > 0 ? (
                <span>
                  <span className="dump-dropzone-title">
                    {files.length} file{files.length > 1 ? "s" : ""} ready
                  </span>
                  <span className="dump-dropzone-sub">
                    {formatBytes(files.reduce((s, f) => s + f.size, 0))} · click to change
                  </span>
                </span>
              ) : (
                <span>
                  <span className="dump-dropzone-title">Click to choose files</span>
                  <span className="dump-dropzone-sub">
                    Text, zip, screenshots — up to{" "}
                    {usage ? formatBytes(usage.maxFileBytes) : "25 MB"} each
                  </span>
                </span>
              )}
            </label>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input
              className="input"
              value={notes}
              placeholder="e.g. failing-run screenshots, 2026-06-17"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {uploading && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(80,67,43,0.08)]">
              <div
                className="h-full rounded-full bg-[#4f46e5] transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button className="btn w-full" disabled={uploading || !files.length}>
            {uploading
              ? `Uploading… ${progress}%`
              : files.length
              ? `Step 2 — Upload ${files.length} file${files.length > 1 ? "s" : ""}`
              : "Upload files"}
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-[#2d241a]">
            Stored items
          </div>
          {selecting ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#75675a]">
                {selected.size} selected
              </span>
              <button
                className="btn"
                disabled={!selected.size || zipping}
                onClick={handleZip}
              >
                {zipping ? "Zipping…" : `Download ${selected.size || ""} as ZIP`}
              </button>
              <button
                className="btn-secondary"
                disabled={zipping}
                onClick={cancelSelect}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="btn-secondary"
              disabled={!items.length}
              onClick={enterSelect}
            >
              Select &amp; download as ZIP
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(80,67,43,0.08)] text-xs uppercase tracking-[0.18em] text-[#7d6f60]">
                {selecting && (
                  <th className="w-10 px-4 py-4 font-semibold">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                <th className="px-4 py-4 font-semibold">File</th>
                <th className="px-4 py-4 font-semibold">Type</th>
                <th className="px-4 py-4 font-semibold">Size</th>
                <th className="px-4 py-4 font-semibold">Uploaded</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={5} cols={colCount} />
              ) : items.length ? (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="row-lift border-b border-[rgba(80,67,43,0.06)] align-top last:border-b-0"
                  >
                    {selecting && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.filename}`}
                          checked={selected.has(item.id)}
                          onChange={() => toggleOne(item.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#2d241a] break-all">
                        {item.filename}
                      </div>
                      {item.notes && (
                        <div className="mt-1 text-xs text-[#8a7a69]">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          KIND_STYLES[item.kind] || KIND_STYLES.OTHER
                        }`}
                      >
                        {item.kind}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#54473a]">
                      {formatBytes(item.sizeBytes)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#54473a]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => handleDownload(item)}
                        >
                          Download
                        </button>
                        <button
                          className="btn-secondary text-[#8e3f31]"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item)}
                        >
                          {deletingId === item.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={colCount}>
                    <EmptyState
                      title="No files yet"
                      description="Upload something above to get started — text files, zipped folders, screenshots, anything."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
