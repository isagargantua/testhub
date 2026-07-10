import { useCallback, useEffect, useMemo, useState } from "react";

import {
  bulkDeleteUsers,
  deleteUser,
  getUsers,
  resetUserPassword,
} from "../api/users";

import Modal from "../components/Modal";
import { SkeletonTableRows } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

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
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("Test@12345");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getUsers({
        page,
        limit: 12,
        search,
      });

      setUsers(data.items);
      setPagination(data.pagination);
      // Selection is per loaded page — a fresh list means a fresh selection.
      setSelectedIds([]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load users right now."));
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

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

  // Bulk delete never touches ADMIN accounts or your own account (the backend
  // enforces the same), so only the remaining rows are selectable.
  const selectableUsers = useMemo(
    () => users.filter((u) => u.role !== "ADMIN" && u.id !== me?.id),
    [users, me]
  );

  const allSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((u) => selectedIds.includes(u.id));

  function toggleSelect(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : selectableUsers.map((u) => u.id));
  }

  async function handleBulkDelete() {
    const count = selectedIds.length;

    const confirmed = await confirm({
      title: `Delete ${count} selected user(s)?`,
      message:
        "This permanently removes the selected accounts and cannot be undone. " +
        "Admin accounts and your own account are never included.",
      confirmLabel: `Delete ${count} user(s)`,
    });

    if (!confirmed) {
      return;
    }

    try {
      setBulkDeleting(true);

      const result = await bulkDeleteUsers(selectedIds);

      toast.success(result.message || `Deleted ${count} user(s).`);

      // If we wiped every row on this page, step back a page instead of
      // landing on an empty one.
      if (selectedIds.length === users.length && page > 1) {
        setPage((current) => current - 1);
        return;
      }

      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the selected users."));
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(user) {
    const confirmed = await confirm({
      title: `Delete ${user.email}?`,
      message: "This permanently removes the account. This cannot be undone.",
      confirmLabel: "Delete",
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(user.id);

      await deleteUser(user.id);

      toast.success(`Deleted ${user.email}`);

      if (users.length === 1 && page > 1) {
        setPage((current) => current - 1);
        return;
      }

      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the user."));
    } finally {
      setDeletingId("");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();

    try {
      setSubmittingReset(true);

      await resetUserPassword(
        resetTarget.id,
        newPassword
      );

      toast.success(
        `Password for ${resetTarget.email} was reset to "${newPassword}".`
      );

      setResetTarget(null);
      setNewPassword("Test@12345");
      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not reset the password."));
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
            Manage team members, control access roles, and reset credentials for your QA workspace.
          </p>
        </div>

        <div className="card-soft max-w-sm">
          <div className="eyebrow">Note</div>
          <p className="mt-3 text-sm leading-6 text-[#75675a]">
            Passwords are stored as hashes and cannot be viewed. Use the reset function to set a known password for any account.
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

      </div>

      <div className="card overflow-hidden">
        {selectedIds.length > 0 && (
          <div
            className="mb-4 flex flex-col gap-3 rounded-[14px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.06)] px-4 py-3 md:flex-row md:items-center md:justify-between"
            data-testid="bulk-action-bar"
          >
            <span className="text-sm font-semibold text-[#8b4335]">
              {selectedIds.length} user(s) selected
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedIds([])}
              >
                Clear selection
              </button>
              <button
                type="button"
                className="btn btn-danger"
                data-testid="bulk-delete"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
              >
                {bulkDeleting
                  ? "Deleting..."
                  : `Delete selected (${selectedIds.length})`}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(80,67,43,0.08)] text-xs uppercase tracking-[0.18em] text-[#7d6f60]">
                <th className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-[#8e3f31] disabled:cursor-not-allowed"
                    data-testid="select-all-users"
                    title={
                      selectableUsers.length
                        ? "Select all deletable users on this page"
                        : "No deletable users on this page"
                    }
                    checked={allSelected}
                    disabled={!selectableUsers.length || loading}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 font-semibold">Name</th>
                <th className="px-4 py-4 font-semibold">Email</th>
                <th className="px-4 py-4 font-semibold">Role</th>
                <th className="px-4 py-4 font-semibold">Created</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : users.length ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="row-lift border-b border-[rgba(80,67,43,0.06)] align-top last:border-b-0"
                  >
                    <td className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-[#8e3f31] disabled:cursor-not-allowed disabled:opacity-35"
                        data-testid="select-user"
                        title={
                          user.id === me?.id
                            ? "You can't bulk-delete your own account"
                            : user.role === "ADMIN"
                            ? "Admin accounts can't be bulk-deleted"
                            : `Select ${user.email}`
                        }
                        checked={selectedIds.includes(user.id)}
                        disabled={user.role === "ADMIN" || user.id === me?.id}
                        onChange={() => toggleSelect(user.id)}
                      />
                    </td>
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
                  <td colSpan="6">
                    <EmptyState
                      title="No users found"
                      description="No accounts match the current filter. Try a different search."
                    />
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
