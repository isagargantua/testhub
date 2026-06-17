import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTestCases, exportTestCases } from "../api/testcases";
import { getProjects } from "../api/projects";
import Badge from "../components/Badge";
import Pagination from "../components/Pagination";
import { SkeletonCards } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

const PRIORITY_COLORS = {
  CRITICAL: { bg: "bg-[rgba(239,68,68,0.12)]",   text: "text-[#991b1b]",  dark: "text-[#f87171]"  },
  HIGH:     { bg: "bg-[rgba(245,158,11,0.12)]",  text: "text-[#92400e]",  dark: "text-[#fbbf24]"  },
  MEDIUM:   { bg: "bg-[rgba(79,70,229,0.10)]",   text: "text-[#4338ca]",  dark: "text-[#a5b4fc]"  },
  LOW:      { bg: "bg-[rgba(100,116,139,0.10)]", text: "text-[#475569]",  dark: "text-[#94a3b8]"  },
};

const RESULT_COLORS = {
  PASS:    { bg: "bg-[rgba(34,197,94,0.12)]",   text: "text-[#166534]"  },
  FAIL:    { bg: "bg-[rgba(239,68,68,0.12)]",   text: "text-[#991b1b]"  },
  SKIP:    { bg: "bg-[rgba(245,158,11,0.12)]",  text: "text-[#92400e]"  },
  BLOCKED: { bg: "bg-[rgba(139,92,246,0.12)]",  text: "text-[#4c1d95]"  },
};

function PriorityChip({ priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${c.bg} ${c.text}`}>
      {priority}
    </span>
  );
}

function ResultChip({ status }) {
  const c = RESULT_COLORS[status];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] ${c.bg} ${c.text}`}>
      {status}
    </span>
  );
}

export default function AllTestCases() {
  const navigate = useNavigate();

  const [items,      setItems]      = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState("");
  const [projectId,  setProjectId]  = useState("");
  const [projects,   setProjects]   = useState([]);
  const [exporting,  setExporting]  = useState(null); // null | "csv" | "json"

  // debounce search input
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // load project list for the filter dropdown (once)
  useEffect(() => {
    getProjects()
      .then((d) => setProjects(d.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllTestCases({ page, limit: 20, search: debouncedSearch, projectId });
      setItems(data.items);
      setPagination(data.pagination);
    } catch {
      setError("Could not load test cases.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, projectId]);

  useEffect(() => { load(); }, [load]);

  // Export the current filtered view (not just the visible page) as a file.
  async function handleExport(format) {
    setExporting(format);
    setError("");
    try {
      await exportTestCases({ format, search: debouncedSearch, projectId });
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Test Library</div>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">All Test Cases</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a] md:text-base">
            Every test case across all your projects and suites, with their run history and latest result.
          </p>
        </div>
        {!loading && (
          <div className="card-soft min-w-[160px] text-center">
            <div className="eyebrow">Unique Test Cases</div>
            <div className="mt-2 display-title text-3xl">{pagination.total}</div>
            <p className="mt-1 text-xs text-[#8a7a69]">across all projects</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          className="input flex-1"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-56"
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value); setPage(1); }}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null || loading || pagination.total === 0}
            title="Download the current filtered view as CSV"
          >
            {exporting === "csv" ? "Exporting…" : "Export CSV"}
          </button>
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => handleExport("json")}
            disabled={exporting !== null || loading || pagination.total === 0}
            title="Download the current filtered view as JSON"
          >
            {exporting === "json" ? "Exporting…" : "Export JSON"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonCards count={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No test cases found"
          description={
            debouncedSearch || projectId
              ? "Try adjusting your search or filter."
              : "Create a project, add a suite, and add test cases to see them here."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((tc) => (
              <div key={tc.id} className="card flex flex-col gap-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="eyebrow">Test Case</div>
                  <PriorityChip priority={tc.priority} />
                </div>

                {/* Title */}
                <h2 className="display-title text-2xl leading-snug">{tc.title}</h2>

                {/* Description preview */}
                {tc.description && (
                  <p className="text-sm leading-5 text-[#75675a] line-clamp-2">
                    {tc.description}
                  </p>
                )}

                {/* Project → Suite breadcrumb */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <button
                    onClick={() => navigate(`/projects/${tc.project.id}`)}
                    className="font-semibold text-[#4f46e5] hover:underline"
                  >
                    {tc.project.name}
                  </button>
                  <span className="text-[#8a7a69]">›</span>
                  <button
                    onClick={() => navigate(`/suites/${tc.suite.id}`)}
                    className="text-[#75675a] hover:text-[#4f46e5] hover:underline"
                  >
                    {tc.suite.name}
                  </button>
                </div>

                {/* Tags */}
                {tc.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[rgba(79,70,229,0.08)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#4338ca]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Runs + results */}
                <div className="mt-auto pt-2 border-t border-[rgba(80,67,43,0.08)]">
                  {tc.runs.length === 0 ? (
                    <p className="text-xs text-[#8a7a69]">Not included in any run yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#8a7a69]">
                        Runs
                      </p>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {tc.runs.map((r) => (
                          <div
                            key={r.runId}
                            className="flex items-center justify-between gap-2 cursor-pointer hover:bg-[rgba(79,70,229,0.06)] rounded-lg px-2 py-1 transition"
                            onClick={() => navigate(`/runs/${r.runId}`)}
                          >
                            <span className="text-xs text-[#54473a] truncate">{r.runName}</span>
                            <ResultChip status={r.resultStatus} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} pages={pagination.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
