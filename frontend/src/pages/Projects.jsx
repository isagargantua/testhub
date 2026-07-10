import {
  useCallback,
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
import { SkeletonCards } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";

const REFRESH_INTERVAL_MS = 15000;

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

export default function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const loadProjects = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await getProjects();
        setProjects(data.items);
      } catch (err) {
        if (!silent) {
          toast.error(getErrorMessage(err, "Could not load projects."));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // `toast` is a stable useMemo'd API from ToastProvider, so including it
    // satisfies exhaustive-deps without re-creating the callback per render.
    [toast]
  );

  useEffect(() => {
    loadProjects();

    const intervalId = window.setInterval(() => {
      loadProjects({ silent: true });
    }, REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadProjects({ silent: true });
      }
    }

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadProjects]);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      setSubmitting(true);

      const project = await createProject({
        name: name.trim(),
        description: description.trim(),
      });

      setProjects((current) => [project, ...current]);
      setName("");
      setDescription("");
      setOpen(false);
      toast.success(`Created “${project.name}”`);

      loadProjects({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not create the project."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(project, event) {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = await confirm({
      title: `Delete “${project.name}”?`,
      message:
        "This also removes its suites, cases, and runs. This cannot be undone.",
      confirmLabel: "Delete",
    });

    if (!confirmed) {
      return;
    }

    const previousProjects = projects;

    try {
      setDeletingId(project.id);
      setProjects((current) =>
        current.filter((item) => item.id !== project.id)
      );

      await deleteProject(project.id);
      toast.success(`Deleted “${project.name}”`);
      loadProjects({ silent: true });
    } catch (err) {
      setProjects(previousProjects);
      toast.error(getErrorMessage(err, "Could not delete the project."));
    } finally {
      setDeletingId("");
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

        <div className="flex items-center gap-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[#8a7a69]">
            {refreshing ? "Refreshing" : "Live"}
          </div>
          <button
            className="btn"
            onClick={() => setOpen(true)}
          >
            Create Project
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonCards count={6} />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="card card-interactive flex h-full flex-col"
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
                {project.description ||
                  "No description yet. Use this space to define the testing focus and environment intent."}
              </p>

              <div className="mt-auto flex items-center justify-between pt-6">
                <span className="text-xs uppercase tracking-[0.22em] text-[#8a7a69]">
                  Open workspace
                </span>
                <button
                  type="button"
                  onClick={(event) =>
                    handleDelete(project, event)
                  }
                  className="btn-secondary text-[#8e3f31]"
                  disabled={deletingId === project.id}
                >
                  {deletingId === project.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          ))}

          {!projects.length && (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                title="No projects yet"
                description="Use “Create Project” above to start grouping suites, cases, and runs into a clean testing workspace."
              />
            </div>
          )}
        </div>
      )}

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
                setDescription(e.target.value)
              }
            />
          </div>

          <button
            className="btn w-full"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
