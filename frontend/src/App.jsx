import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmDialog";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Everything behind the login wall is lazy-loaded so the entry bundle stays
// lean: a visitor on /login doesn't download recharts, the admin pages, or any
// in-app view. Each page becomes its own chunk, fetched on first navigation
// (Layout renders a skeleton fallback while a chunk loads).
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const Users = lazy(() => import("./pages/Users"));
const Dump = lazy(() => import("./pages/Dump"));
const AllTestCases = lazy(() => import("./pages/AllTestCases"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const SuiteDetail = lazy(() => import("./pages/SuiteDetail"));
const TestRuns = lazy(() => import("./pages/TestRuns"));
const RunDetail = lazy(() => import("./pages/RunDetail"));

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="projects" element={<Projects />} />
                  <Route
                    path="users"
                    element={
                      <ProtectedRoute roles={["ADMIN"]}>
                        <Users />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="dump"
                    element={
                      <ProtectedRoute roles={["ADMIN"]}>
                        <Dump />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="projects/:projectId" element={<ProjectDetail />} />
                  <Route path="suites/:suiteId" element={<SuiteDetail />} />
                  <Route path="projects/:projectId/runs" element={<TestRuns />} />
                  <Route path="runs/:runId" element={<RunDetail />} />
                  <Route path="test-cases" element={<AllTestCases />} />
                </Route>
              </Routes>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
