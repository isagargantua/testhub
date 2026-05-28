import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRun, deleteRun, getRuns, updateRun } from "../api/runs";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";

const RUNS_PER_PAGE = 6;

const RUN_STATUSES = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ABORTED", label: "Aborted" },
];

export default function TestRuns() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [runs, setRuns] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadRuns = useCallback(async () => {
    try {
      const data = await getRuns(projectId);
      setRuns(data);
      setError("");
    } catch {
      setError("Could not load runs.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await createRun(projectId, { name, description });
      setOpen(false);
      setName("");
      setDescription("");
      setFeedback("Run created.");
      loadRuns();
    } catch {
      setError("Could not create the run.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      setDeletingId(id);
      setError("");
      await deleteRun(id);
      setFeedback("Run deleted.");
      loadRuns();
    } catch {
      setError("Could not delete the run.");
    } finally {
      setDeletingId("");
    }
  }

  async function handleStatusChange(id, status) {
    try {
      setUpdatingId(id);
      await updateRun(id, { status });
      setFeedback(`Status updated to ${status.replace("_", " ")}.`);
      loadRuns();
    } catch {
      setError("Could not update run status.");
    } finally {
      setUpdatingId("");
    }
  }

  const pages = Math.ceil(runs.length / RUNS_PER_PAGE);
  const visible = runs.slice((page - 1) * RUNS_PER_PAGE, page * RUNS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="page-heading">
        <div>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="eyebrow hover:text-[#5c4a36] flex items-center gap-1 mb-1"
          >
            ← Back to Suites
          </button>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">Test Runs</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a]">
            Execute test cases and record results. Mark a run as Completed when all cases are evaluated.
          </p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          Create Run
        </button>
      </div>

      {feedback && (
        <div className="rounded-[18px] border border-[rgba(88,137,102,0.18)] bg-[rgba(88,137,102,0.08)] px-4 py-3 text-sm text-[#466451]">
          {feedback}
        </div>
      )}

      {error && (
        <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="eyebrow">Runs</div>
          <div className="mt-3 display-title text-3xl">Loading runs...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((run) => (
              <div
                key={run.id}
                className="card cursor-pointer transition duration-200 hover:-translate-y-1"
                onClick={() => navigate(`/runs/${run.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="eyebrow">Run</div>
                    <h2 className="mt-2 display-title text-2xl leading-tight">
                      {run.name}
                    </h2>
                  </div>
                  <Badge>{run.status}</Badge>
                </div>

                {run.description && (
                  <p className="mt-3 text-sm leading-6 text-[#6f6255]">
                    {run.description}
                  </p>
                )}

                {/* Status changer — stops card click propagation */}
                <div
                  className="mt-4 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs uppercase tracking-[0.18em] text-[#8a7a69]">
                    Status
                  </span>
                  <select
                    className="input text-sm py-1 flex-1"
                    value={run.status}
                    disabled={updatingId === run.id}
                    onChange={(e) => handleStatusChange(run.id, e.target.value)}
                  >
                    {RUN_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div
                  className="mt-4 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs uppercase tracking-[0.22em] text-[#8a7a69]">
                    Open run
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(run.id)}
                    className="btn-secondary text-[#8e3f31]"
                    disabled={deletingId === run.id}
                  >
                    {deletingId === run.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}

            {!runs.length && (
              <div className="card md:col-span-2 xl:col-span-3">
                <div className="eyebrow">Empty state</div>
                <h2 className="mt-2 display-title text-3xl">No runs yet</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#75675a]">
                  Create a test run to begin executing test cases and recording results.
                </p>
              </div>
            )}
          </div>

          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create Test Run">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button className="btn w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Run"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
