import { Line, LineChart, ResponsiveContainer } from "recharts";

import CountUp from "./CountUp";

export default function StatsCard({
  title,
  value,
  suffix = "",
  detail,
  spark,
  sparkColor = "#4f46e5",
}) {
  const hasSpark = Array.isArray(spark) && spark.length > 1;
  const sparkData = hasSpark ? spark.map((v, i) => ({ i, v })) : [];

  return (
    <div className="card overflow-hidden relative">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(79,70,229,0.06)] blur-2xl" />
      <div className="relative">
        <div className="eyebrow">{title}</div>

        <div className="mt-4 display-title text-4xl leading-none">
          <CountUp value={value} suffix={suffix} />
        </div>

        {detail && <div className="mt-3 text-sm text-[#776a5c]">{detail}</div>}

        {hasSpark && (
          <div className="mt-3 h-8 w-full opacity-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
