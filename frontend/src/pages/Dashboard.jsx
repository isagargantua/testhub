import { useEffect, useState } from "react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getDashboardStats } from "../api/dashboard";

import StatsCard from "../components/StatsCard";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data =
          await getDashboardStats();

        setStats(data);
      } catch (error) {
        console.log(error);
      }
    }

    loadStats();
  }, []);

  if (!stats) {
    return (
      <div className="card">
        <div className="eyebrow">Dashboard</div>
        <div className="mt-3 display-title text-3xl">
          Loading dashboard...
        </div>
      </div>
    );
  }

  const chartData = [
    {
      name: "PASS",
      value:
        stats.resultBreakdown.PASS,
    },
    {
      name: "FAIL",
      value:
        stats.resultBreakdown.FAIL,
    },
    {
      name: "SKIP",
      value:
        stats.resultBreakdown.SKIP,
    },
    {
      name: "BLOCKED",
      value:
        stats.resultBreakdown.BLOCKED,
    },
  ];

  const COLORS = [
    "#22c55e",
    "#ef4444",
    "#eab308",
    "#6b7280",
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
          <div className="eyebrow">Signal</div>
          <div className="mt-3 display-title text-3xl">
            {stats.passRatePercent}%
          </div>
          <p className="mt-2 text-sm text-[#75675a]">
            Current overall pass rate across recorded runs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Projects"
          value={stats.totalProjects}
          detail="Active workspaces currently tracked"
        />

        <StatsCard
          title="Test Cases"
          value={stats.totalTestCases}
          detail="Scenarios available for execution"
        />

        <StatsCard
          title="Runs"
          value={stats.totalRuns}
          detail="Recorded executions across all projects"
        />

        <StatsCard
          title="Pass Rate"
          value={`${stats.passRatePercent}%`}
          detail="Success ratio based on completed outcomes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                outerRadius={120}
                label
              >
                {chartData.map(
                  (entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        COLORS[index]
                      }
                    />
                  )
                )}
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
          <div className="mb-4">
            <div className="eyebrow">Activity</div>
            <h2 className="display-title mt-2 text-3xl">
              Recent Runs
            </h2>
          </div>

          <div className="space-y-3">
            {stats.recentRuns.map(
              (run) => (
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
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
