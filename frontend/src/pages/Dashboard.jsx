import { useCallback, useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getDashboardStats, getResultsByStatus } from "../api/dashboard";
import Badge from "../components/Badge";
import StatsCard from "../components/StatsCard";
import { useTheme } from "../context/ThemeContext";

const RESULT_COLORS = {
  PASS:    { hex: "#22c55e", bg: "rgba(34,197,94,0.12)",    text: "#166534", darkText: "#4ade80" },
  FAIL:    { hex: "#ef4444", bg: "rgba(239,68,68,0.12)",    text: "#991b1b", darkText: "#f87171" },
  SKIP:    { hex: "#f59e0b", bg: "rgba(245,158,11,0.12)",   text: "#92400e", darkText: "#fbbf24" },
  BLOCKED: { hex: "#8b5cf6", bg: "rgba(139,92,246,0.12)",   text: "#4c1d95", darkText: "#a78bfa" },
};

const REFRESH_INTERVAL_MS = 15000;

function getErrorMessage(error) {
  const response = error?.response?.data;
  if (response?.message) return response.message;
  return "Could not load dashboard data.";
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  const c = RESULT_COLORS[name];
  return (
    <div
      className="rounded-[14px] border px-4 py-2 text-sm shadow-lg"
      style={{
        background: "rgba(255,250,243,0.97)",
        borderColor: "rgba(80,67,43,0.12)",
        color: c?.text ?? "#2f2419",
      }}
    >
      <span className="font-semibold uppercase tracking-wide">{name}</span>
      <span className="ml-3 font-bold">{value}</span>
    </div>
  );
}

const WORKFLOW_STEPS = [
  { n: "1", label: "Create a Project",    desc: "Go to Projects → New Project." },
  { n: "2", label: "Add a Test Suite",    desc: "Open the project → Create Test Suite." },
  { n: "3", label: "Add Test Cases",      desc: "Inside the suite, add your test cases." },
  { n: "4", label: "Create a Test Run",   desc: "Go to Runs → Create Run → pick a suite and choose test cases." },
  { n: "5", label: "Mark Results",        desc: "Open the run and mark each test case PASS / FAIL / SKIP / BLOCKED." },
  { n: "✓", label: "See it here",         desc: "Results appear in the Result Breakdown and Recent Runs above." },
];

function WorkflowSteps() {
  return (
    <div className="space-y-2.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[#8a7a69]">
        How results reach this dashboard
      </p>
      {WORKFLOW_STEPS.map(({ n, label, desc }) => (
        <div key={n} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(79,70,229,0.12)] text-[0.6rem] font-bold text-indigo-500">
            {n}
          </span>
          <div>
            <span className="text-xs font-semibold text-[#2f2419]">{label}</span>
            <span className="ml-1.5 text-xs text-[#8a7a69]">{desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const [latestRunOpen, setLatestRunOpen] = useState(true);

  // Clicking a Result Breakdown status loads every test case marked that status
  // (across all runs, matching the global chart).
  const [statusFilter, setStatusFilter] = useState(null);
  const [statusResults, setStatusResults] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusPage, setStatusPage] = useState(1);
  const STATUS_PER_PAGE = 10;

  const selectStatus = useCallback(
    async (name) => {
      if (statusFilter === name) {
        setStatusFilter(null);
        setStatusResults([]);
        setStatusPage(1);
        return;
      }
      setStatusFilter(name);
      setStatusPage(1);
      setStatusLoading(true);
      setStatusError("");
      try {
        setStatusResults(await getResultsByStatus(name));
      } catch {
        setStatusError("Could not load test cases for this status.");
        setStatusResults([]);
      } finally {
        setStatusLoading(false);
      }
    },
    [statusFilter]
  );

  const loadStats = useCallback(async ({ silent = false } = {}) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const id = window.setInterval(() => loadStats({ silent: true }), REFRESH_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") loadStats({ silent: true }); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadStats]);

  if (loading && !stats) {
    return (
      <div className="card">
        <div className="eyebrow">Dashboard</div>
        <div className="mt-3 display-title text-3xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="card">
        <div className="eyebrow">Dashboard</div>
        <div className="mt-3 display-title text-3xl">Dashboard unavailable</div>
        <p className="mt-3 text-sm leading-6 text-[#8b4335]">{error}</p>
        <button className="btn mt-5 w-full md:w-auto" onClick={() => loadStats()}>
          Retry
        </button>
      </div>
    );
  }

  const safe = stats || {
    totalProjects: 0, totalTestCases: 0, totalRuns: 0, passRatePercent: 0,
    recentRuns: [], resultBreakdown: { PASS: 0, FAIL: 0, SKIP: 0, BLOCKED: 0 },
    latestRunName: null, latestRunResults: [],
  };

  const chartData = Object.entries(safe.resultBreakdown).map(([name, value]) => ({ name, value }));
  const totalResults = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Command center</div>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a] md:text-base">
            Track execution health, recent momentum, and the shape of your test estate in one view.
          </p>
        </div>
        <div className="card-soft min-w-[220px]">
          <div className="flex items-center justify-between gap-3">
            <div className="eyebrow">Signal</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a7a69]">
              {refreshing ? "Refreshing" : "Live"}
            </div>
          </div>
          <div className="mt-3 display-title text-3xl">{safe.passRatePercent}%</div>
          <p className="mt-2 text-sm text-[#75675a]">Overall pass rate across all runs.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Projects"   value={safe.totalProjects}   detail="Active workspaces" />
        <StatsCard title="Test Cases" value={safe.totalTestCases}  detail="Scenarios available" />
        <StatsCard title="Runs"       value={safe.totalRuns}       detail="Recorded executions" />
        <StatsCard title="Pass Rate"  value={`${safe.passRatePercent}%`} detail="Success ratio" />
      </div>

      {/* Result Breakdown + Recent Runs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Result Breakdown (redesigned) ── */}
        <div className="card flex flex-col">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Outcomes</div>
              <h2 className="display-title mt-2 text-3xl">Result Breakdown</h2>
            </div>
            <div className="rounded-full bg-[rgba(201,111,59,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#a55d31]">
              {totalResults} total
            </div>
          </div>

          {totalResults === 0 ? (
            <div className="flex flex-1 flex-col gap-5 py-4">
              <p className="text-sm text-[#8a7a69]">No results recorded yet — follow the steps below to get started.</p>
              <WorkflowSteps />
            </div>
          ) : (
            <>
              {/* Donut chart */}
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={RESULT_COLORS[entry.name]?.hex ?? "#ccc"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend with counts + percentage — click a status to see its
                  test cases (from the latest run) in the panel below. */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {chartData.map((entry) => {
                  const c = RESULT_COLORS[entry.name];
                  const labelColor = isDark ? c?.darkText : c?.text;
                  const selected = statusFilter === entry.name;
                  const pct = totalResults > 0
                    ? Math.round((entry.value / totalResults) * 100) : 0;
                  return (
                    <button
                      type="button"
                      key={entry.name}
                      onClick={() => selectStatus(entry.name)}
                      className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition hover:brightness-95"
                      style={{
                        background: c?.bg,
                        boxShadow: selected ? `0 0 0 2px ${c?.hex}` : "none",
                      }}
                      title={`Show all ${entry.name} test cases`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: c?.hex }}
                      />
                      <span
                        className="text-xs font-semibold uppercase tracking-[0.16em] flex-1"
                        style={{ color: labelColor }}
                      >
                        {entry.name}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: labelColor }}
                      >
                        {entry.value}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: labelColor, opacity: 0.7 }}
                      >
                        {pct}%
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[#8a7a69]">
                Tip: click a status to see exactly which test cases are marked that, below.
              </p>
              <button
                type="button"
                onClick={() => setShowWorkflowGuide((v) => !v)}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#4f46e5] hover:underline"
              >
                How are results recorded here?
                <span>{showWorkflowGuide ? "↑" : "↓"}</span>
              </button>
              {showWorkflowGuide && (
                <div className="mt-3">
                  <WorkflowSteps />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Recent Runs ── */}
        <div className="card">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Activity</div>
              <h2 className="display-title mt-2 text-3xl">Recent Runs</h2>
            </div>
            <button
              className="btn-secondary transition active:scale-95 disabled:opacity-60"
              onClick={() => loadStats({ silent: true })}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="space-y-3">
            {safe.recentRuns.length ? (
              safe.recentRuns.map((run) => (
                <div key={run.id} className="card-soft">
                  <div className="font-semibold text-[#2f2419]">{run.name}</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-sm text-[#75675a]">Status</div>
                    <Badge>{run.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="card-soft text-sm text-[#75675a]">
                No runs recorded yet. Create a project and run to see activity here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status filter results (global, set by clicking the breakdown) ── */}
      {statusFilter && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="eyebrow">Result filter</div>
              <h2 className="display-title mt-2 text-3xl">
                {statusFilter} test cases
              </h2>
              <p className="mt-2 text-sm text-[#75675a]">
                Every test case marked {statusFilter}, across all runs
                {statusResults.length > 0 ? ` (${statusResults.length})` : ""}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectStatus(statusFilter)}
              className="btn-secondary"
            >
              Clear
            </button>
          </div>

          {statusLoading ? (
            <div className="card-soft text-sm text-[#75675a]">Loading test cases…</div>
          ) : statusError ? (
            <div className="card-soft text-sm text-[#8b4335]">{statusError}</div>
          ) : statusResults.length === 0 ? (
            <div className="card-soft text-sm text-[#75675a]">
              No test cases are marked {statusFilter} yet.
            </div>
          ) : (() => {
            const totalPages = Math.ceil(statusResults.length / STATUS_PER_PAGE);
            const pageItems  = statusResults.slice(
              (statusPage - 1) * STATUS_PER_PAGE,
              statusPage * STATUS_PER_PAGE,
            );
            return (
              <>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {pageItems.map((r) => {
                    const c = RESULT_COLORS[r.status];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-[14px] px-3 py-2.5"
                        style={{ background: c?.bg ?? "rgba(120,116,108,0.08)" }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: c?.hex ?? "#999" }}
                        />
                        <span
                          className="text-sm text-[#2f2419] flex-1 truncate"
                          title={r.testCaseTitle}
                        >
                          {r.testCaseTitle}
                        </span>
                        {r.priority && <Badge>{r.priority}</Badge>}
                        <span
                          className="hidden sm:block max-w-[38%] truncate text-xs text-[#8a7a69]"
                          title={r.runName}
                        >
                          {r.runName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#8a7a69]">
                      Page {statusPage} of {totalPages} · {statusResults.length} results
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                        onClick={() => setStatusPage((p) => Math.max(1, p - 1))}
                        disabled={statusPage === 1}
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                        onClick={() => setStatusPage((p) => Math.min(totalPages, p + 1))}
                        disabled={statusPage === totalPages}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Latest Run: per-testcase breakdown ── */}
      {safe.latestRunResults?.length > 0 && (
        <div className="card">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="eyebrow">Latest run</div>
              <h2 className="display-title mt-2 text-3xl">{safe.latestRunName}</h2>
              {latestRunOpen && (
                <p className="mt-2 text-sm text-[#75675a]">
                  Per-testcase results — which cases are marked what.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge>{safe.latestRunStatus}</Badge>
              <button
                type="button"
                onClick={() => setLatestRunOpen((v) => !v)}
                className="btn-secondary px-3 py-2 text-sm"
                aria-label={latestRunOpen ? "Collapse latest run" : "Expand latest run"}
                title={latestRunOpen ? "Hide" : "Show"}
              >
                {latestRunOpen ? "↑" : "↓"}
              </button>
            </div>
          </div>

          {latestRunOpen && (
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {safe.latestRunResults.map((result) => {
                const c = RESULT_COLORS[result.status];
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 rounded-[14px] px-3 py-2.5"
                    style={{ background: c?.bg ?? "rgba(120,116,108,0.08)" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: c?.hex ?? "#999" }}
                    />
                    <span className="text-sm text-[#2f2419] flex-1 truncate">
                      {result.testCase?.title}
                    </span>
                    {result.testCase?.priority && (
                      <Badge>{result.testCase.priority}</Badge>
                    )}
                    <Badge>{result.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
