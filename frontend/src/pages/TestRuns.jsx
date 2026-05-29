import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRun, deleteRun, getRuns, updateRun } from "../api/runs";
import { getSuites } from "../api/suites";
import { getTestCases } from "../api/testcases";
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
  const [step, setStep] = useState(1);

  // Step 1 state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 state
  const [suites, setSuites] = useState([]);
  const [suiteTestCases, setSuiteTestCases] = useState({}); // suiteId -> testCase[]
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingTcs, setLoadingTcs] = useState(false);

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

  function openModal() {
    setStep(1);
    setName("");
    setDescription("");
    setSuites([]);
    setSuiteTestCases({});
    setSelectedIds([]);
    setError("");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setStep(1);
  }

  async function handleNextStep(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setStep(2);
    setLoadingTcs(true);
    setError("");

    try {
      const fetchedSuites = await getSuites(projectId);
      setSuites(fetchedSuites);

      const tcMap = {};
      await Promise.all(
        fetchedSuites.map(async (suite) => {
          const data = await getTestCases(suite.id, 1, 1000);
          const items = Array.isArray(data) ? data : (data.items || []);
          tcMap[suite.id] = items;
        })
      );
      setSuiteTestCases(tcMap);
    } catch {
      setError("Could not load test cases. Please try again.");
    } finally {
      setLoadingTcs(false);
    }
  }

  function toggleCase(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSuite(suiteId) {
    const ids = (suiteTestCases[suiteId] || []).map((tc) => tc.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await createRun(projectId, { name, description, testCaseIds: selectedIds });
      closeModal();
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

  const allTestCases = Object.values(suiteTestCases).flat();
  const totalTcCount = allTestCases.length;

  const pages = Math.ceil(runs.length / RUNS_PER_PAGE);
  const visible = runs.slice((page - 1) * RUNS_PER_PAGE, page * RUNS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="page-heading">
        <div>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="eyebrow hover:text-[#4f46e5] flex items-center gap-1 mb-1"
          >
            ← Back to Suites
          </button>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">Test Runs</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748b]">
            Execute test cases and record results. Mark a run as Completed when all cases are evaluated.
          </p>
        </div>
        <button className="btn" onClick={openModal}>
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
                className="card card-interactive flex h-full flex-col"
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
                  <p className="mt-3 text-sm leading-6 text-[#64748b]">
                    {run.description}
                  </p>
                )}

                {/* Status changer — stops card click propagation. mt-auto pins
                    this + the footer to the bottom so the Delete row aligns
                    across cards regardless of description length. */}
                <div
                  className="mt-auto flex items-center gap-2 pt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs uppercase tracking-[0.18em] text-[#64748b]">
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
                  <span className="text-xs uppercase tracking-[0.22em] text-[#64748b]">
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
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748b]">
                  Create a test run to begin executing test cases and recording results.
                </p>
              </div>
            )}
          </div>

          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={open}
        onClose={closeModal}
        title={step === 1 ? "Create Test Run" : "Choose Test Cases"}
      >
        {step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Smoke Test – Sprint 12"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this run"
              />
            </div>
            <button className="btn w-full" type="submit" disabled={!name.trim()}>
              Next: Choose Test Cases →
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {loadingTcs ? (
              <div className="py-8 text-center text-sm text-[#64748b]">
                Loading test cases...
              </div>
            ) : totalTcCount === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[#64748b]">
                  No test cases found across all suites. Add test cases to a suite before creating a run.
                </p>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-4 pr-1">
                {suites.map((suite) => {
                  const tcs = suiteTestCases[suite.id] || [];
                  if (tcs.length === 0) return null;
                  const suiteIds = tcs.map((tc) => tc.id);
                  const allChecked = suiteIds.every((id) => selectedIds.includes(id));

                  return (
                    <div key={suite.id} className="card-soft">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-[#0f172a]">
                          {suite.name}
                        </span>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#4f46e5] hover:text-[#4338ca] transition"
                          onClick={() => toggleSuite(suite.id)}
                        >
                          {allChecked ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {tcs.map((tc) => (
                          <label
                            key={tc.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 cursor-pointer transition"
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(tc.id)}
                              onChange={() => toggleCase(tc.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                            />
                            <span className="text-sm text-[#0f172a] leading-snug">
                              {tc.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer: count + actions */}
            <div className="border-t border-[#e2e8f0] pt-4 space-y-3">
              <p className="text-xs text-[#64748b]">
                {selectedIds.length} of {totalTcCount} test case{totalTcCount !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn flex-1"
                  disabled={submitting || selectedIds.length === 0}
                  onClick={handleCreate}
                >
                  {submitting
                    ? "Creating..."
                    : `Create Run (${selectedIds.length} selected)`}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
                {error}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
