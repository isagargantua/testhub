// Shimmering placeholder primitives used while data loads.

export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

// A grid of stat-card placeholders (matches the dashboard stats row).
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

// A list of card-shaped placeholders (Projects / generic lists).
export function SkeletonCards({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="mt-2 h-7 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Placeholder rows for a table body. Render inside <tbody>.
export function SkeletonTableRows({ rows = 6, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-[rgba(80,67,43,0.06)] last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-4">
              <Skeleton className={`h-4 ${c === 0 ? "w-40" : "w-20"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
