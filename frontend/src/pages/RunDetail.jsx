import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRun, updateResult, updateRun } from "../api/runs";
import Badge from "../components/Badge";

const RESULT_STATUSES = ["PASS", "FAIL", "SKIP", "BLOCKED"];

const RUN_STATUSES = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ABORTED", label: "Aborted" },
];

export default function RunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const [run, setRun] = useState(null);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadRun = useCallback(async () => {
    try {
      const data = await getRun(runId);
      setRun(data);
    } catch {
      setError("Could not load run.");
    }
  }, [runId]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  async function handleResultStatus(testCaseId, status) {
    try {
      await updateResult(runId, { testCaseId, status });
      loadRun();
    } catch {
      setError("Could not update result.");
    }
  }

  async function handleRunStatus(status) {
    try {
      setUpdatingStatus(true);
      await updateRun(runId, { status });
      loadRun();
    } catch {
      setError("Could not update run status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (!run) {
    return (
      <div className="card">
        <div className="eyebrow">Run</div>
        <div className="mt-3 display-title text-3xl">
          {error || "Loading run..."}
        </div>
      </div>
    );
  }

  const total = Object.values(run.summary).reduce((a, b) => a + b, 0);
  const pending = run.results.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-heading">
        <div>
          <button
            onClick={() => navigate(`/projects/${run.projectId}/runs`)}
            className="eyebrow hover:text-[#5c4a36] flex items-center gap-1 mb-1"
          >
            ← Back to Runs
          </button>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="display-title text-4xl md:text-5xl">{run.name}</h1>
            <Badge>{run.status}</Badge>
          </div>
          {run.description && (
            <p className="mt-3 text-sm leading-6 text-[#75675a]">{run.description}</p>
          )}
        </div>

        {/* Run status selector */}
        <div className="card-soft min-w-[200px]">
          <div className="eyebrow mb-2">Run Status</div>
          <select
            className="input text-sm"
            value={run.status}
            disabled={updatingStatus}
            onChange={(e) => handleRunStatus(e.target.value)}
          >
            {RUN_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-[#8a7a69]">
            Mark as Completed when all cases are evaluated.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Object.entries(run.summary).map(([key, value]) => (
          <div key={key} className="card text-center">
            <div className="eyebrow text-xs">{key}</div>
            <div className="mt-2 display-title text-3xl">{value}</div>
          </div>
        ))}
        <div className="card text-center">
          <div className="eyebrow text-xs">PENDING</div>
          <div className="mt-2 display-title text-3xl">{pending}</div>
        </div>
      </div>

      {/* Progress bar */}
      {run.results.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow">Progress</div>
            <span className="text-xs text-[#8a7a69]">
              {total} executed · {pending} pending
            </span>
          </div>
          <div className="h-3 rounded-full bg-[rgba(80,67,43,0.08)] overflow-hidden flex">
            {Object.entries(run.summary).map(([key, value]) => {
              const pct = run.results.length > 0 ? (value / run.results.length) * 100 : 0;
              const colors = {
                PASS: "#22c55e", FAIL: "#ef4444", SKIP: "#f59e0b", BLOCKED: "#8b5cf6",
              };
              return pct > 0 ? (
                <div
                  key={key}
                  style={{ width: `${pct}%`, background: colors[key] }}
                  title={`${key}: ${value}`}
                />
              ) : null;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            {Object.entries(run.summary).map(([key, value]) => {
              const colors = {
                PASS: "#22c55e", FAIL: "#ef4444", SKIP: "#f59e0b", BLOCKED: "#8b5cf6",
              };
              return (
                <div key={key} className="flex items-center gap-1.5 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: colors[key] }}
                  />
                  <span className="text-[#75675a]">{key}</span>
                  <span className="font-semibold text-[#2f2419]">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Test case results */}
      <div className="space-y-4">
        {run.results.map((result) => (
          <div key={result.id} className="card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="eyebrow">Test Case</div>
                  {result.testCase?.priority && (
                    <Badge>{result.testCase.priority}</Badge>
                  )}
                  <Badge>{result.status}</Badge>
                </div>
                <h2 className="mt-2 display-title text-2xl leading-snug">
                  {result.testCase?.title}
                </h2>
                {result.testCase?.description && (
                  <p className="mt-2 text-sm leading-6 text-[#6f6255]">
                    {result.testCase.description}
                  </p>
                )}
              </div>
            </div>

            {/* Result buttons */}
            <div className="mt-4 flex gap-2 flex-wrap">
              {RESULT_STATUSES.map((status) => {
                const colors = {
                  PASS: result.status === "PASS"
                    ? "bg-[#22c55e] text-white"
                    : "bg-[rgba(34,197,94,0.12)] text-[#166534] hover:bg-[rgba(34,197,94,0.25)]",
                  FAIL: result.status === "FAIL"
                    ? "bg-[#ef4444] text-white"
                    : "bg-[rgba(239,68,68,0.12)] text-[#991b1b] hover:bg-[rgba(239,68,68,0.25)]",
                  SKIP: result.status === "SKIP"
                    ? "bg-[#f59e0b] text-white"
                    : "bg-[rgba(245,158,11,0.12)] text-[#92400e] hover:bg-[rgba(245,158,11,0.25)]",
                  BLOCKED: result.status === "BLOCKED"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-[rgba(139,92,246,0.12)] text-[#4c1d95] hover:bg-[rgba(139,92,246,0.25)]",
                };
                return (
                  <button
                    key={status}
                    onClick={() => handleResultStatus(result.testCaseId, status)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${colors[status]}`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
