import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  createProject,
  deleteProject,
  getProjects,
} from "../api/projects";



import Modal from "../components/Modal";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] =
    useState([]);

  const [open, setOpen] =
    useState(false);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  async function loadProjects() {
    try {
      const data = await getProjects();

      setProjects(data.items);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    async function loadInitialProjects() {
      try {
        const data = await getProjects();

        setProjects(data.items);
      } catch (error) {
        console.log(error);
      }
    }

    loadInitialProjects();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      await createProject({
        name,
        description,
      });

      setName("");

      setDescription("");

      setOpen(false);

      loadProjects();
    } catch (error) {
      console.log(error);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteProject(id);

      loadProjects();
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          Projects
        </h1>

        <button
          className="btn"
          onClick={() => setOpen(true)}
        >
          Create Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="card cursor-pointer"
            onClick={() =>
                navigate(`/projects/${project.id}`)
            }
          >
            <h2 className="text-xl font-bold">
              {project.name}
            </h2>

            <p className="text-gray-600 mt-2">
              {project.description}
            </p>

            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {project.status}
              </span>

              <button
                onClick={() =>
                  handleDelete(project.id)
                }
                className="text-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Project"
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
            Create
          </button>
        </form>
      </Modal>
    </div>
  );
}
