import {
  useEffect,
  useState,
} from "react";

import { useParams } from "react-router-dom";

import { getRun, updateResult } from "../api/runs";

const statuses = [
  "PASS",
  "FAIL",
  "SKIP",
  "BLOCKED",
];

export default function RunDetail() {
  const { runId } = useParams();

  const [run, setRun] =
    useState(null);

  async function loadRun() {
    try {
      const data = await getRun(runId);

      setRun(data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    loadRun();
  }, [runId]);

  async function handleStatus(
    testCaseId,
    status
  ) {
    try {
      await updateResult(runId, {
        testCaseId,
        status,
      });

      loadRun();
    } catch (error) {
      console.log(error);
    }
  }

  if (!run) {
    return <div>Loading run...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {run.name}
        </h1>

        <p className="text-gray-600 mt-2">
          {run.description}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Object.entries(run.summary).map(
          ([key, value]) => (
            <div
              key={key}
              className="card text-center"
            >
              <div className="text-gray-500">
                {key}
              </div>

              <div className="text-3xl font-bold">
                {value}
              </div>
            </div>
          )
        )}
      </div>

      <div className="space-y-4">
        {run.results.map((result) => (
          <div
            key={result.id}
            className="card"
          >
            <h2 className="text-xl font-bold">
              {
                result.testCase
                  .title
              }
            </h2>

            <p className="text-gray-600 mt-2">
              {
                result.testCase
                  .description
              }
            </p>

            <div className="flex gap-2 mt-4 flex-wrap">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    handleStatus(
                      result.testCaseId,
                      status
                    )
                  }
                  className={`px-4 py-2 rounded text-white ${
                    status ===
                    "PASS"
                      ? "bg-green-500"
                      : status ===
                        "FAIL"
                      ? "bg-red-500"
                      : status ===
                        "SKIP"
                      ? "bg-yellow-500"
                      : "bg-gray-500"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-4">
              Current Status:
              <span className="font-bold ml-2">
                {result.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}