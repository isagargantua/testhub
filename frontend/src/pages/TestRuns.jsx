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

  const loadRuns = useCallback(async () => {
    try {
      const data = await getRuns(
        projectId
      );

      setRuns(data);
    } catch (error) {
      console.log(error);
    }
  }, [projectId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      await createRun(projectId, {
        name,
        description,
      });

      setOpen(false);

      setName("");

      setDescription("");

      loadRuns();
    } catch (error) {
      console.log(error);
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
              className="input"
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
            />
          </div>

          <button className="btn w-full">
            Create Run
          </button>
        </form>
      </Modal>
    </div>
  );
}
