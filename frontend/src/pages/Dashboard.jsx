import { useCallback, useEffect, useState } from "react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getDashboardStats } from "../api/dashboard";

import StatsCard from "../components/StatsCard";

const COLORS = [
  "#22c55e",
  "#ef4444",
  "#eab308",
  "#6b7280",
];

const REFRESH_INTERVAL_MS = 15000;

function getErrorMessage(error) {
  const response = error?.response?.data;

  if (response?.message) {
    return response.message;
  }

  return "Could not load dashboard data.";
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStats = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await getDashboardStats();

        setStats(data);
        setError("");
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadStats();

    const intervalId = window.setInterval(() => {
      loadStats({ silent: true });
    }, REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadStats({ silent: true });
      }
    }

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadStats]);

  if (loading && !stats) {
    return (
      <div className="card">
        <div className="eyebrow">Dashboard</div>
        <div className="mt-3 display-title text-3xl">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="card">
        <div className="eyebrow">Dashboard</div>
        <div className="mt-3 display-title text-3xl">
          Dashboard unavailable
        </div>
        <p className="mt-3 text-sm leading-6 text-[#8b4335]">
          {error}
        </p>
        <button
          className="btn mt-5 w-full md:w-auto"
          onClick={() => loadStats()}
        >
          Retry
        </button>
      </div>
    );
  }

  const safeStats = stats || {
    totalProjects: 0,
    totalTestCases: 0,
    totalRuns: 0,
    passRatePercent: 0,
    recentRuns: [],
    resultBreakdown: {
      PASS: 0,
      FAIL: 0,
      SKIP: 0,
      BLOCKED: 0,
    },
  };

  const chartData = [
    {
      name: "PASS",
      value: safeStats.resultBreakdown.PASS,
    },
    {
      name: "FAIL",
      value: safeStats.resultBreakdown.FAIL,
    },
    {
      name: "SKIP",
      value: safeStats.resultBreakdown.SKIP,
    },
    {
      name: "BLOCKED",
      value: safeStats.resultBreakdown.BLOCKED,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Command center</div>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a] md:text-base">
            Track execution health, recent momentum, and the shape of your test
            estate in one composed view.
          </p>
        </div>

        <div className="card-soft min-w-[220px]">
          <div className="flex items-center justify-between gap-3">
            <div className="eyebrow">Signal</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a7a69]">
              {refreshing ? "Refreshing" : "Live"}
            </div>
          </div>
          <div className="mt-3 display-title text-3xl">
            {safeStats.passRatePercent}%
          </div>
          <p className="mt-2 text-sm text-[#75675a]">
            Current overall pass rate across recorded runs.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Projects"
          value={safeStats.totalProjects}
          detail="Active workspaces currently tracked"
        />

        <StatsCard
          title="Test Cases"
          value={safeStats.totalTestCases}
          detail="Scenarios available for execution"
        />

        <StatsCard
          title="Runs"
          value={safeStats.totalRuns}
          detail="Recorded executions across all projects"
        />

        <StatsCard
          title="Pass Rate"
          value={`${safeStats.passRatePercent}%`}
          detail="Success ratio based on completed outcomes"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card h-[28rem]">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Outcomes</div>
              <h2 className="display-title mt-2 text-3xl">
                Result Breakdown
              </h2>
            </div>
            <div className="rounded-full bg-[rgba(201,111,59,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#a55d31]">
              Live mix
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                outerRadius={120}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index]}
                  />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  borderRadius: 18,
                  border: "1px solid rgba(80,67,43,0.12)",
                  background: "rgba(255,250,243,0.96)",
                  boxShadow:
                    "0 18px 38px rgba(44, 28, 12, 0.12)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Activity</div>
              <h2 className="display-title mt-2 text-3xl">
                Recent Runs
              </h2>
            </div>
            <button
              className="btn-secondary"
              onClick={() => loadStats({ silent: true })}
            >
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {safeStats.recentRuns.length ? (
              safeStats.recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="card-soft"
                >
                  <div className="font-semibold text-[#2f2419]">
                    {run.name}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-sm text-[#75675a]">
                      Execution status
                    </div>
                    <div className="rounded-full bg-[rgba(102,120,95,0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#55644d]">
                      {run.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card-soft text-sm text-[#75675a]">
                No runs recorded yet. Create a project and run to start seeing
                activity here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
