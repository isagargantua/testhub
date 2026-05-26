import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteUser,
  getUsers,
  resetUserPassword,
} from "../api/users";

import Modal from "../components/Modal";

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function getErrorMessage(error, fallback) {
  const response = error?.response?.data;

  if (response?.message) {
    return response.message;
  }

  if (Array.isArray(response?.errors)) {
    return response.errors
      .map((item) => item.msg || item.message)
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("Test@12345");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getUsers({
        page,
        limit: 12,
        search,
      });

      setUsers(data.items);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not load users right now."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const canGoPrev = useMemo(
    () => pagination?.page > 1,
    [pagination]
  );

  const canGoNext = useMemo(
    () =>
      pagination?.page &&
      pagination?.pages &&
      pagination.page < pagination.pages,
    [pagination]
  );

  async function handleDelete(user) {
    const confirmed = window.confirm(
      `Delete ${user.email}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(user.id);
      setError("");
      setFeedback("");

      await deleteUser(user.id);

      setFeedback(`Deleted ${user.email}`);

      if (users.length === 1 && page > 1) {
        setPage((current) => current - 1);
        return;
      }

      loadUsers();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not delete the user."
        )
      );
    } finally {
      setDeletingId("");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();

    try {
      setSubmittingReset(true);
      setError("");
      setFeedback("");

      await resetUserPassword(
        resetTarget.id,
        newPassword
      );

      setFeedback(
        `Password for ${resetTarget.email} was reset to "${newPassword}".`
      );

      setResetTarget(null);
      setNewPassword("Test@12345");
      loadUsers();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not reset the password."
        )
      );
    } finally {
      setSubmittingReset(false);
    }
  }

  function submitSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Admin controls</div>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">
            Users
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a] md:text-base">
            View the stored identity data for test accounts, delete disposable
            users, and reset passwords to known values for automation.
          </p>
        </div>

        <div className="card-soft max-w-sm">
          <div className="eyebrow">Important</div>
          <p className="mt-3 text-sm leading-6 text-[#75675a]">
            Existing passwords cannot be viewed because they are stored only as
            hashes. Use reset to set a new test password you can reuse.
          </p>
        </div>
      </div>

      <div className="card">
        <form
          onSubmit={submitSearch}
          className="flex flex-col gap-3 md:flex-row"
        >
          <input
            className="input"
            value={searchInput}
            placeholder="Search by name or email"
            onChange={(e) =>
              setSearchInput(e.target.value)
            }
          />
          <button className="btn md:min-w-[140px]">
            Search
          </button>
        </form>

        {feedback && (
          <div className="mt-4 rounded-[18px] border border-[rgba(88,137,102,0.18)] bg-[rgba(88,137,102,0.08)] px-4 py-3 text-sm text-[#466451]">
            {feedback}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
            {error}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(80,67,43,0.08)] text-xs uppercase tracking-[0.18em] text-[#7d6f60]">
                <th className="px-4 py-4 font-semibold">Name</th>
                <th className="px-4 py-4 font-semibold">Email</th>
                <th className="px-4 py-4 font-semibold">Role</th>
                <th className="px-4 py-4 font-semibold">Created</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-sm text-[#75675a]"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : users.length ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[rgba(80,67,43,0.06)] align-top last:border-b-0"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#2d241a]">
                        {user.name}
                      </div>
                      <div className="mt-1 text-xs text-[#8a7a69]">
                        {user.id}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#54473a]">
                      {user.email}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[rgba(201,111,59,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9d552c]">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#54473a]">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setResetTarget(user);
                            setNewPassword("Test@12345");
                          }}
                        >
                          Reset password
                        </button>
                        <button
                          className="btn-secondary text-[#8e3f31]"
                          disabled={deletingId === user.id}
                          onClick={() =>
                            handleDelete(user)
                          }
                        >
                          {deletingId === user.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-sm text-[#75675a]"
                  >
                    No users matched the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[rgba(80,67,43,0.08)] px-2 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-[#75675a]">
            {pagination
              ? `${pagination.total} total user(s) across ${pagination.pages} page(s)`
              : "No pagination data yet"}
          </div>

          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={!canGoPrev}
              onClick={() =>
                setPage((current) => current - 1)
              }
            >
              Previous
            </button>
            <button
              className="btn-secondary"
              disabled={!canGoNext}
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title="Reset Password"
      >
        <form
          onSubmit={handleResetPassword}
          className="space-y-4"
        >
          <div className="text-sm leading-6 text-[#75675a]">
            Set a new password for{" "}
            <strong>{resetTarget?.email}</strong>. This lets you reuse a known
            credential for automation.
          </div>

          <div>
            <label className="label">
              New password
            </label>
            <input
              className="input"
              value={newPassword}
              minLength={6}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
            />
          </div>

          <button
            className="btn w-full"
            disabled={submittingReset}
          >
            {submittingReset
              ? "Resetting..."
              : "Reset password"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
