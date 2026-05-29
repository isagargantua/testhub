import { useCallback, useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getDashboardStats } from "../api/dashboard";
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

export default function Dashboard() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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
            <div className="flex flex-1 items-center justify-center py-12 text-sm text-[#8a7a69]">
              No results recorded yet. Start a run and mark test cases.
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

              {/* Legend with counts + percentage */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {chartData.map((entry) => {
                  const c = RESULT_COLORS[entry.name];
                  const labelColor = isDark ? c?.darkText : c?.text;
                  const pct = totalResults > 0
                    ? Math.round((entry.value / totalResults) * 100) : 0;
                  return (
                    <div
                      key={entry.name}
                      className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5"
                      style={{ background: c?.bg }}
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
                    </div>
                  );
                })}
              </div>
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
            <button className="btn-secondary" onClick={() => loadStats({ silent: true })}>
              Refresh
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

      {/* ── Latest Run: per-testcase breakdown ── */}
      {safe.latestRunResults?.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="eyebrow">Latest run</div>
              <h2 className="display-title mt-2 text-3xl">{safe.latestRunName}</h2>
              <p className="mt-2 text-sm text-[#75675a]">
                Per-testcase results — which cases are marked what.
              </p>
            </div>
            <Badge>{safe.latestRunStatus}</Badge>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
        </div>
      )}
    </div>
  );
}
