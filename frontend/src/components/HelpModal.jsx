import { useState } from "react";
import { createPortal } from "react-dom";

const SECTIONS = [
  {
    id: "overview",
    title: "Overview",
    emoji: "🗺️",
    content: (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-[#4a3f35]">
          <strong>testHub</strong> is a test management platform for organising, executing, and
          tracking your software testing. The hierarchy is:
        </p>
        <div className="space-y-2">
          {[
            ["Project", "Top-level workspace. Represents a product or repo you're testing."],
            ["Test Suite", "A group of related test cases (e.g. Login Suite, Cart Suite)."],
            ["Test Case", "A single scenario with steps, expected result, and priority."],
            ["Test Run", "An execution session where you mark each test case as PASS / FAIL / SKIP / BLOCKED."],
          ].map(([term, def]) => (
            <div key={term} className="rounded-[14px] bg-[rgba(80,67,43,0.05)] px-4 py-3">
              <span className="font-semibold text-[#2f2419]">{term}</span>
              <span className="text-sm text-[#6f6255] ml-2">— {def}</span>
            </div>
          ))}
        </div>
        <p className="text-sm leading-6 text-[#6f6255]">
          Dashboard aggregates results across all runs so you can see pass rate, breakdowns, and which test cases were marked what in the latest run.
        </p>
      </div>
    ),
  },
  {
    id: "projects",
    title: "Projects",
    emoji: "📁",
    content: (
      <div className="space-y-4 text-sm leading-6 text-[#4a3f35]">
        <p>A <strong>Project</strong> is your top-level workspace — think "one project per app or repo".</p>
        <div className="space-y-2">
          <div className="card-soft">
            <div className="font-semibold mb-1">How to create</div>
            <ol className="list-decimal list-inside space-y-1 text-[#6f6255]">
              <li>Go to <strong>Projects</strong> in the sidebar.</li>
              <li>Click <strong>Create Project</strong>.</li>
              <li>Enter a name and optional description, then submit.</li>
            </ol>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">What's inside</div>
            <p className="text-[#6f6255]">
              Each project contains <strong>Test Suites</strong> (click the project card to enter)
              and <strong>Test Runs</strong> (use the "View Runs" button inside a project).
            </p>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">Status</div>
            <p className="text-[#6f6255]">Projects are ACTIVE by default. Status is informational only.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "suites",
    title: "Test Suites",
    emoji: "🗂️",
    content: (
      <div className="space-y-4 text-sm leading-6 text-[#4a3f35]">
        <p>A <strong>Test Suite</strong> groups related test cases — e.g. one suite per feature or user flow.</p>
        <div className="space-y-2">
          <div className="card-soft">
            <div className="font-semibold mb-1">How to create</div>
            <ol className="list-decimal list-inside space-y-1 text-[#6f6255]">
              <li>Open a project.</li>
              <li>Click <strong>Create Suite</strong>.</li>
              <li>Give it a name (e.g. "Login", "Checkout", "API Auth").</li>
            </ol>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">Tip</div>
            <p className="text-[#6f6255]">
              Organise suites by feature area or user story. Smaller focused suites are easier
              to execute in a single run session.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "testcases",
    title: "Test Cases",
    emoji: "✅",
    content: (
      <div className="space-y-4 text-sm leading-6 text-[#4a3f35]">
        <p>A <strong>Test Case</strong> is one scenario: what to do, and what to expect.</p>
        <div className="space-y-2">
          <div className="card-soft">
            <div className="font-semibold mb-1">Fields</div>
            <ul className="space-y-1 text-[#6f6255]">
              <li><strong>Title</strong> — Short name, e.g. "Login with valid credentials".</li>
              <li><strong>Description</strong> — What is being tested and why.</li>
              <li><strong>Steps</strong> — Numbered steps to reproduce (one per line).</li>
              <li><strong>Expected Result</strong> — What should happen if the app works correctly.</li>
              <li><strong>Priority</strong> — LOW / MEDIUM / HIGH / CRITICAL. Drives which cases to fix first when they fail.</li>
            </ul>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">How to create</div>
            <ol className="list-decimal list-inside space-y-1 text-[#6f6255]">
              <li>Open a suite.</li>
              <li>Click <strong>Create Test Case</strong>.</li>
              <li>Fill in the fields — scroll the modal if needed.</li>
              <li>Submit.</li>
            </ol>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "runs",
    title: "Test Runs",
    emoji: "▶️",
    content: (
      <div className="space-y-4 text-sm leading-6 text-[#4a3f35]">
        <p>A <strong>Test Run</strong> is one execution session. It pulls all test cases from the project's suites and lets you mark each as PASS, FAIL, SKIP, or BLOCKED.</p>
        <div className="space-y-2">
          <div className="card-soft">
            <div className="font-semibold mb-1">How to create & run</div>
            <ol className="list-decimal list-inside space-y-1 text-[#6f6255]">
              <li>Inside a project, click <strong>View Runs</strong>.</li>
              <li>Click <strong>Create Run</strong> and give it a name (e.g. "Sprint 3 Regression").</li>
              <li>Open the run — each test case is listed.</li>
              <li>Click <strong>PASS / FAIL / SKIP / BLOCKED</strong> for each case.</li>
              <li>When done, change Run Status to <strong>Completed</strong> using the dropdown.</li>
            </ol>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">Run statuses</div>
            <ul className="space-y-1 text-[#6f6255]">
              <li><strong>In Progress</strong> — Active execution session.</li>
              <li><strong>Completed</strong> — All cases evaluated, run closed.</li>
              <li><strong>Aborted</strong> — Stopped early (e.g. environment failure).</li>
            </ul>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">Result statuses</div>
            <ul className="space-y-1 text-[#6f6255]">
              <li><strong>PASS</strong> — Test case executed successfully as expected.</li>
              <li><strong>FAIL</strong> — Actual result differs from expected (bug found).</li>
              <li><strong>SKIP</strong> — Not executed this cycle (e.g. feature not deployed yet).</li>
              <li><strong>BLOCKED</strong> — Could not execute due to a dependency or blocker.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    emoji: "📊",
    content: (
      <div className="space-y-4 text-sm leading-6 text-[#4a3f35]">
        <p>The <strong>Dashboard</strong> gives you a live summary of all testing activity.</p>
        <div className="space-y-2">
          <div className="card-soft">
            <div className="font-semibold mb-1">Stats cards</div>
            <p className="text-[#6f6255]">Projects, Test Cases, Runs, and Pass Rate across everything.</p>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">Result Breakdown</div>
            <p className="text-[#6f6255]">
              Donut chart + legend showing PASS / FAIL / SKIP / BLOCKED counts and percentages
              across all recorded test results globally.
            </p>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">Latest Run Results</div>
            <p className="text-[#6f6255]">
              Shows per-testcase status for the most recently created run, so you can see exactly
              which test cases are marked as what without leaving the dashboard.
            </p>
          </div>
          <div className="card-soft">
            <div className="font-semibold mb-1">Auto-refresh</div>
            <p className="text-[#6f6255]">Dashboard refreshes every 15 seconds and on window focus.</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function HelpModal({ open, onClose }) {
  const [active, setActive] = useState("overview");

  if (!open) return null;

  const section = SECTIONS.find((s) => s.id === active);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,18,15,0.38)] p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card w-full flex flex-col"
        // Fixed height so the modal stays the same size on every tab — short
        // sections no longer shrink it and long ones (Runs) scroll internally.
        style={{ maxWidth: 720, height: "min(640px, 85vh)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0 mb-5">
          <div>
            <div className="eyebrow">Guide</div>
            <h2 className="mt-2 display-title text-3xl">User Guide</h2>
          </div>
          <button onClick={onClose} className="btn-secondary px-3 flex-shrink-0">
            Close
          </button>
        </div>

        <div className="flex flex-1 gap-5 overflow-hidden min-h-0">
          {/* Sidebar tabs */}
          <div className="flex flex-col gap-1 w-36 flex-shrink-0">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`rounded-[12px] px-3 py-2.5 text-left text-sm font-medium transition ${
                  active === s.id
                    ? "bg-[rgba(80,67,43,0.1)] text-[#2f2419]"
                    : "text-[#75675a] hover:bg-[rgba(80,67,43,0.05)]"
                }`}
              >
                <span className="mr-1.5">{s.emoji}</span>
                {s.title}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            <h3 className="display-title text-2xl mb-4">{section?.title}</h3>
            {section?.content}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
