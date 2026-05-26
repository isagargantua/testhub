export default function StatsCard({
  title,
  value,
  detail,
}) {
  return (
    <div className="card overflow-hidden relative">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(201,111,59,0.08)] blur-2xl" />
      <div className="relative">
      <div className="eyebrow">
        {title}
      </div>

      <div className="mt-4 display-title text-4xl leading-none">
        {value}
      </div>

      {detail && (
        <div className="mt-3 text-sm text-[#776a5c]">
          {detail}
        </div>
      )}
      </div>
    </div>
  );
}
