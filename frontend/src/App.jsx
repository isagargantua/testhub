import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProjectDetail from "./pages/ProjectDetail";

import SuiteDetail from "./pages/SuiteDetail";

import TestRuns from "./pages/TestRuns";

import RunDetail from "./pages/RunDetail";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Layout from "./components/Layout";

import Login from "./pages/Login";

import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";

import Projects from "./pages/Projects";
import Users from "./pages/Users";
import AllTestCases from "./pages/AllTestCases";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
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

            <Route path="projects/:projectId" element={<ProjectDetail />} />

            <Route path="suites/:suiteId" element={<SuiteDetail />} />
            <Route path="projects/:projectId/runs" element={<TestRuns />} />
            <Route path="runs/:runId" element={<RunDetail />} />
            <Route path="test-cases" element={<AllTestCases />} />
          </Route>
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
