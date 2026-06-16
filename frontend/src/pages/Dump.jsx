import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteDump,
  downloadDump,
  downloadDumpsZip,
  getDumps,
  uploadDumps,
} from "../api/dumps";

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
  const [items, setItems] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

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
      setError("");
      const data = await getDumps({ limit: 100 });
      setItems(data.items);
      setUsage(data.usage);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load the dump vault right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!files.length) {
      setError("Pick at least one file to upload.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setFeedback("");
      setProgress(0);

      const data = await uploadDumps(files, notes, setProgress);

      setFeedback(`Stored ${data.items.length} item(s).`);
      setFiles([]);
      setNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDownload(item) {
    try {
      setError("");
      await downloadDump(item.id, item.filename);
    } catch (err) {
      setError(getErrorMessage(err, "Could not download that item."));
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.filename}"? This cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(item.id);
      setError("");
      setFeedback("");
      await deleteDump(item.id);
      setFeedback(`Deleted "${item.filename}".`);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete that item."));
    } finally {
      setDeletingId("");
    }
  }

  function enterSelect() {
    setSelecting(true);
    setSelected(new Set());
    setError("");
    setFeedback("");
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
      setError("");
      setFeedback("");
      await downloadDumpsZip([...selected]);
      setFeedback(`Zipped ${selected.size} item(s).`);
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
      setError(message);
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
          <h1 className="display-title mt-2 text-4xl md:text-5xl">Data Dump</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a] md:text-base">
            A private vault for admins to stash arbitrary artefacts — large text
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
                {usage ? formatBytes(usage.maxFileBytes) : "10 MB"}
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
            <span className="font-semibold text-[#2d241a]">Vault usage</span>
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
            <label className="label">Files</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="input file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(79,70,229,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#4f46e5]"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            {files.length > 0 && (
              <p className="mt-2 text-xs text-[#8a7a69]">
                {files.length} file(s) selected ·{" "}
                {formatBytes(files.reduce((s, f) => s + f.size, 0))}
              </p>
            )}
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

          <button className="btn" disabled={uploading}>
            {uploading ? `Uploading… ${progress}%` : "Upload to vault"}
          </button>
        </form>

        {feedback && (
          <div className="mt-4 rounded-[18px] border border-[rgba(88,137,102,0.18)] bg-[rgba(88,137,102,0.08)] px-4 py-3 text-sm text-[#466451]">
            {feedback}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
            {error}
          </div>
        )}
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
                <tr>
                  <td colSpan={colCount} className="px-4 py-8 text-sm text-[#75675a]">
                    Loading vault…
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[rgba(80,67,43,0.06)] align-top last:border-b-0"
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
                  <td colSpan={colCount} className="px-4 py-8 text-sm text-[#75675a]">
                    The vault is empty. Upload something above to get started.
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
