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
    return <div>Loading dashboard...</div>;
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
      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Projects"
          value={stats.totalProjects}
        />

        <StatsCard
          title="Test Cases"
          value={stats.totalTestCases}
        />

        <StatsCard
          title="Runs"
          value={stats.totalRuns}
        />

        <StatsCard
          title="Pass Rate"
          value={`${stats.passRatePercent}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card h-96">
          <h2 className="text-xl font-bold mb-4">
            Result Breakdown
          </h2>

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

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">
            Recent Runs
          </h2>

          <div className="space-y-3">
            {stats.recentRuns.map(
              (run) => (
                <div
                  key={run.id}
                  className="border rounded p-3"
                >
                  <div className="font-semibold">
                    {run.name}
                  </div>

                  <div className="text-sm text-gray-500">
                    {run.status}
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
