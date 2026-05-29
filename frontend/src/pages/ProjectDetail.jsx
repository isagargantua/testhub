import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createSuite, deleteSuite, getSuites } from "../api/suites";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";

const SUITES_PER_PAGE = 6;

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [suites, setSuites] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadSuites = useCallback(async () => {
    try {
      const data = await getSuites(projectId);
      setSuites(data);
      setError("");
    } catch {
      setError("Could not load suites.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSuites();
  }, [loadSuites]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await createSuite(projectId, { name, description });
      setName("");
      setDescription("");
      setOpen(false);
      setFeedback("Suite created.");
      loadSuites();
    } catch {
      setError("Could not create the suite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      setDeletingId(id);
      setError("");
      await deleteSuite(id);
      setFeedback("Suite deleted.");
      loadSuites();
    } catch {
      setError("Could not delete the suite.");
    } finally {
      setDeletingId("");
    }
  }

  const pages = Math.ceil(suites.length / SUITES_PER_PAGE);
  const visible = suites.slice((page - 1) * SUITES_PER_PAGE, page * SUITES_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="page-heading">
        <div>
          <button
            onClick={() => navigate("/projects")}
            className="eyebrow hover:text-[#5c4a36] flex items-center gap-1 mb-1"
          >
            ← Projects
          </button>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">Test Suites</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a]">
            Group related test cases into suites to keep your coverage organized by feature or flow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn"
            onClick={() => navigate(`/projects/${projectId}/runs`)}
          >
            View Runs
          </button>
          <button className="btn" onClick={() => setOpen(true)}>
            Create Suite
          </button>
        </div>
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
          <div className="eyebrow">Suites</div>
          <div className="mt-3 display-title text-3xl">Loading suites...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((suite) => (
              <div
                key={suite.id}
                className="card card-interactive"
                onClick={() => navigate(`/suites/${suite.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="eyebrow">Suite</div>
                    <h2 className="mt-2 display-title text-2xl leading-tight truncate">
                      {suite.name}
                    </h2>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6f6255] min-h-[48px]">
                  {suite.description || "No description provided."}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.22em] text-[#8a7a69]">
                    Open suite
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(suite.id); }}
                    className="btn-secondary text-[#8e3f31]"
                    disabled={deletingId === suite.id}
                  >
                    {deletingId === suite.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}

            {!suites.length && (
              <div className="card md:col-span-2 xl:col-span-3">
                <div className="eyebrow">Empty state</div>
                <h2 className="mt-2 display-title text-3xl">No suites yet</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#75675a]">
                  Create a suite to start organizing test cases by feature, module, or flow.
                </p>
              </div>
            )}
          </div>

          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create Suite">
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
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
