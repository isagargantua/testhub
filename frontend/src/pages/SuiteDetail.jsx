import {
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

  async function loadCases() {
    try {
      const data =
        await getTestCases(suiteId);

      setCases(data.items);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    loadCases();
  }, [suiteId]);

  async function handleCreate(e) {
    e.preventDefault();

    try {
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
    } catch (error) {
      console.log(error);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTestCase(id);

      loadCases();
    } catch (error) {
      console.log(error);
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
                onClick={() =>
                  handleDelete(
                    testcase.id
                  )
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
              className="input"
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
              className="input"
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
              className="input"
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

          <button className="btn w-full">
            Create
          </button>
        </form>
      </Modal>
    </div>
  );
}