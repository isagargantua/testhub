import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createRun,
  deleteRun,
  getRuns,
} from "../api/runs";

import Modal from "../components/Modal";

export default function TestRuns() {
  const { projectId } = useParams();

  const navigate = useNavigate();

  const [runs, setRuns] =
    useState([]);

  const [open, setOpen] =
    useState(false);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");

  const loadRuns = useCallback(async () => {
    try {
      const data = await getRuns(
        projectId
      );

      setRuns(data);
      setError("");
    } catch {
      setError("Could not load runs.");
    }
  }, [projectId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      await createRun(projectId, {
        name,
        description,
      });

      setOpen(false);

      setName("");

      setDescription("");

      loadRuns();
    } catch {
      setError("Could not create the run.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      setDeletingId(id);
      setError("");

      await deleteRun(id);
      loadRuns();
    } catch {
      setError("Could not delete the run.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          Test Runs
        </h1>

        <button
          className="btn"
          onClick={() => setOpen(true)}
        >
          Create Run
        </button>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {runs.map((run) => (
          <div
            key={run.id}
            className="card cursor-pointer"
            onClick={() =>
              navigate(`/runs/${run.id}`)
            }
          >
            <h2 className="text-xl font-bold">
              {run.name}
            </h2>

            <p className="text-gray-600 mt-2">
              {run.description}
            </p>

            <div className="mt-4">
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                {run.status}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(run.id);
              }}
              className="mt-4 text-red-500"
            >
              {deletingId === run.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Test Run"
      >
        <form
          onSubmit={handleCreate}
          className="space-y-4"
        >
          <div>
            <label className="label">
              Name
            </label>

            <input
              className="input"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div>
            <label className="label">
              Description
            </label>

            <textarea
              className="textarea"
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
            />
          </div>

          <button className="btn w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Run"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
