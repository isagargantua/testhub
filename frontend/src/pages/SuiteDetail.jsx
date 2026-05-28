import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createTestCase, deleteTestCase, getTestCases } from "../api/testcases";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";

export default function SuiteDetail() {
  const { suiteId } = useParams();
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    steps: "",
    expected: "",
    priority: "MEDIUM",
  });
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadCases = useCallback(
    async (p = page) => {
      try {
        const data = await getTestCases(suiteId, p);
        setCases(data.items);
        setTotalPages(data.pagination?.pages ?? 1);
        setError("");
      } catch {
        setError("Could not load test cases.");
      } finally {
        setLoading(false);
      }
    },
    [suiteId, page]
  );

  useEffect(() => {
    loadCases(page);
  }, [suiteId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await createTestCase(suiteId, form);
      setOpen(false);
      setForm({ title: "", description: "", steps: "", expected: "", priority: "MEDIUM" });
      setFeedback("Test case created.");
      setPage(1);
      loadCases(1);
    } catch {
      setError("Could not create the test case.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      setDeletingId(id);
      setError("");
      await deleteTestCase(id);
      setFeedback("Test case deleted.");
      loadCases(page);
    } catch {
      setError("Could not delete the test case.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="page-heading">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="eyebrow hover:text-[#5c4a36] flex items-center gap-1 mb-1"
          >
            ← Back to Suites
          </button>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">Test Cases</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a]">
            Individual test scenarios with steps, expected results, and priority levels.
          </p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          Create Test Case
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
          <div className="eyebrow">Test Cases</div>
          <div className="mt-3 display-title text-3xl">Loading cases...</div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {cases.map((tc) => (
              <div key={tc.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="eyebrow">Test Case</div>
                      <Badge>{tc.priority}</Badge>
                    </div>
                    <h2 className="mt-2 display-title text-2xl leading-snug">
                      {tc.title}
                    </h2>

                    {tc.description && (
                      <p className="mt-3 text-sm leading-6 text-[#6f6255]">
                        {tc.description}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {tc.steps && (
                        <div className="card-soft">
                          <div className="text-xs uppercase tracking-[0.18em] text-[#8a7a69] mb-1">
                            Steps
                          </div>
                          <p className="text-sm leading-6 text-[#4a3f35] whitespace-pre-line">
                            {tc.steps}
                          </p>
                        </div>
                      )}
                      {tc.expected && (
                        <div className="card-soft">
                          <div className="text-xs uppercase tracking-[0.18em] text-[#8a7a69] mb-1">
                            Expected Result
                          </div>
                          <p className="text-sm leading-6 text-[#4a3f35] whitespace-pre-line">
                            {tc.expected}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(tc.id)}
                    className="btn-secondary text-[#8e3f31] flex-shrink-0"
                    disabled={deletingId === tc.id}
                  >
                    {deletingId === tc.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}

            {!cases.length && (
              <div className="card">
                <div className="eyebrow">Empty state</div>
                <h2 className="mt-2 display-title text-3xl">No test cases yet</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#75675a]">
                  Create a test case to start defining scenarios for this suite.
                </p>
              </div>
            )}
          </div>

          <Pagination page={page} pages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create Test Case">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Steps</label>
            <textarea
              className="textarea"
              placeholder="1. Open the login page&#10;2. Enter credentials&#10;3. Click Sign In"
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Expected Result</label>
            <textarea
              className="textarea"
              placeholder="User should be redirected to dashboard"
              value={form.expected}
              onChange={(e) => setForm({ ...form, expected: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <button className="btn w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Test Case"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
