import { useEffect, useState } from "react";

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

  async function loadSuites() {
    try {
      const data = await getSuites(projectId);

      setSuites(data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    loadSuites();
  }, [projectId]);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      await createSuite(projectId, {
        name,
        description,
      });

      setName("");

      setDescription("");

      setOpen(false);

      loadSuites();
    } catch (error) {
      console.log(error);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteSuite(id);

      loadSuites();
    } catch (error) {
      console.log(error);
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
              onClick={(e) => {
                e.stopPropagation();

                handleDelete(suite.id);
              }}
              className="text-red-500 mt-4"
            >
              Delete
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
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button className="btn w-full">Create</button>
        </form>
      </Modal>
    </div>
  );
}
