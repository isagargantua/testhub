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
      <div className="page-heading">
        <div>
          <div className="eyebrow">Workspaces</div>
          <h1 className="display-title mt-2 text-4xl md:text-5xl">
            Projects
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#75675a] md:text-base">
            Organize test assets by product surface, keep environments tidy,
            and spin up focused automation spaces without clutter.
          </p>
        </div>

        <button
          className="btn"
          onClick={() => setOpen(true)}
        >
          Create Project
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="card cursor-pointer transition duration-200 hover:-translate-y-1"
            onClick={() =>
                navigate(`/projects/${project.id}`)
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow">Project</div>
                <h2 className="mt-2 display-title text-3xl leading-tight">
                  {project.name}
                </h2>
              </div>
              <span className="rounded-full bg-[rgba(201,111,59,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a25a30]">
                {project.status}
              </span>
            </div>

            <p className="mt-4 min-h-[72px] text-sm leading-6 text-[#6f6255]">
              {project.description || "No description yet. Use this space to define the testing focus and environment intent."}
            </p>

            <div className="mt-6 flex justify-between items-center">
              <span className="text-xs uppercase tracking-[0.22em] text-[#8a7a69]">
                Open workspace
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(project.id);
                }}
                className="btn-secondary text-[#8e3f31]"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {!projects.length && (
          <div className="card md:col-span-2 xl:col-span-3">
            <div className="eyebrow">Empty state</div>
            <h2 className="mt-2 display-title text-3xl">
              No projects yet
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#75675a]">
              Create a first project to start grouping suites, cases, and runs
              into a clean testing workspace.
            </p>
          </div>
        )}
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
              className="textarea"
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
