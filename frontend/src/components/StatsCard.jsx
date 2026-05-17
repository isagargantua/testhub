export default function StatsCard({
  title,
  value,
}) {
  return (
    <div className="card">
      <div className="text-gray-500 text-sm">
        {title}
      </div>

      <div className="text-3xl font-bold mt-2">
        {value}
      </div>
    </div>
  );
}
