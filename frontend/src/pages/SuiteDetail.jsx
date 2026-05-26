import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useParams } from "react-router-dom";

import {
  createTestCase,
  deleteTestCase,
  getTestCases,
} from "../api/testcases";

import Modal from "../components/Modal";

export default function SuiteDetail() {
  const { suiteId } = useParams();

  const [cases, setCases] =
    useState([]);

  const [open, setOpen] =
    useState(false);

  const [form, setForm] =
    useState({
      title: "",
      description: "",
      steps: "",
      expected: "",
      priority: "MEDIUM",
    });

  const [error, setError] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");

  const loadCases = useCallback(async () => {
    try {
      const data =
        await getTestCases(suiteId);

      setCases(data.items);
      setError("");
    } catch {
      setError("Could not load test cases.");
    }
  }, [suiteId]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      await createTestCase(
        suiteId,
        form
      );

      setOpen(false);

      setForm({
        title: "",
        description: "",
        steps: "",
        expected: "",
        priority: "MEDIUM",
      });

      loadCases();
    } catch {
      setError("Could not create the test case.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      setDeletingId(id);
      setError("");

      await deleteTestCase(id);

      loadCases();
    } catch {
      setError("Could not delete the test case.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          Test Cases
        </h1>

        <button
          className="btn"
          onClick={() => setOpen(true)}
        >
          Create Test Case
        </button>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[rgba(168,80,63,0.18)] bg-[rgba(168,80,63,0.08)] px-4 py-3 text-sm text-[#8b4335]">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {cases.map((testcase) => (
          <div
            key={testcase.id}
            className="card"
          >
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {testcase.title}
                </h2>

                <p className="text-gray-600 mt-2">
                  {
                    testcase.description
                  }
                </p>

                <div className="mt-3 text-sm">
                  <div>
                    <strong>
                      Priority:
                    </strong>{" "}
                    {
                      testcase.priority
                    }
                  </div>

                  <div className="mt-2">
                    <strong>
                      Steps:
                    </strong>{" "}
                    {testcase.steps}
                  </div>

                  <div className="mt-2">
                    <strong>
                      Expected:
                    </strong>{" "}
                    {
                      testcase.expected
                    }
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleDelete(
                    testcase.id
                  )
                }
                className="text-red-500"
              >
                {deletingId === testcase.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Test Case"
      >
        <form
          onSubmit={handleCreate}
          className="space-y-4"
        >
          <div>
            <label className="label">
              Title
            </label>

            <input
              className="input"
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Description
            </label>

            <textarea
              className="textarea"
              value={
                form.description
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  description:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Steps
            </label>

            <textarea
              className="textarea"
              value={form.steps}
              onChange={(e) =>
                setForm({
                  ...form,
                  steps:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Expected Result
            </label>

            <textarea
              className="textarea"
              value={form.expected}
              onChange={(e) =>
                setForm({
                  ...form,
                  expected:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Priority
            </label>

            <select
              className="input"
              value={form.priority}
              onChange={(e) =>
                setForm({
                  ...form,
                  priority:
                    e.target.value,
                })
              }
            >
              <option>
                LOW
              </option>
              <option>
                MEDIUM
              </option>
              <option>
                HIGH
              </option>
              <option>
                CRITICAL
              </option>
            </select>
          </div>

          <button className="btn w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
