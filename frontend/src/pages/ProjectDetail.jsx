import { useCallback, useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { createSuite, deleteSuite, getSuites } from "../api/suites";

import Modal from "../components/Modal";

export default function ProjectDetail() {
  const { projectId } = useParams();

  const navigate = useNavigate();

  const [suites, setSuites] = useState([]);

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState("");

  const loadSuites = useCallback(async () => {
    try {
      const data = await getSuites(projectId);

      setSuites(data);
      setError("");
    } catch {
      setError("Could not load suites.");
    }
  }, [projectId]);

  useEffect(() => {
    loadSuites();
  }, [loadSuites]);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      await createSuite(projectId, {
        name,
        description,
      });

      setName("");

      setDescription("");

      setOpen(false);

      loadSuites();
    } catch {
      setError("Could not create the suite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      setDeletingId(id);
      setError("");

      await deleteSuite(id);

      loadSuites();
    } catch {
      setError("Could not delete the suite.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Test Suites</h1>

        <div className="flex gap-3">
          <button
            className="btn"
            onClick={() => navigate(`/projects/${projectId}/runs`)}
          >
            View Runs
          </button>

          <button className="btn" onClick={() => setOpen(true)}>
            Create Suite
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suites.map((suite) => (
          <div
            key={suite.id}
            className="card cursor-pointer"
            onClick={() => navigate(`/suites/${suite.id}`)}
          >
            <h2 className="text-xl font-bold">{suite.name}</h2>

            <p className="text-gray-600 mt-2">{suite.description}</p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();

                handleDelete(suite.id);
              }}
              className="text-red-500 mt-4"
            >
              {deletingId === suite.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Suite">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Name</label>

            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Description</label>

            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button className="btn w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
