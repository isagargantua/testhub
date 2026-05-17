export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) {
    return null;
  }

  return (
    <div className="flex gap-2 justify-center mt-6">
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="btn disabled:opacity-50"
      >
        Previous
      </button>

      <div className="flex items-center px-4">
        {page} / {pages}
      </div>

      <button
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
        className="btn disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
