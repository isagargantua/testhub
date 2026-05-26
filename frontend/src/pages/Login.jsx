import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function getErrorMessage(error) {
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

  return "Could not log in. Please try again.";
}

export default function Login() {
  const { login } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setSubmitting(true);

      await login(email.trim(), password);

      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">
          Login
        </h1>

        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="label">
              Email
            </label>

            <input
              type="email"
              className="input"
              value={email}
              autoComplete="email"
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          <div>
            <label className="label">
              Password
            </label>

            <input
              type="password"
              className="input"
              value={password}
              autoComplete="current-password"
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <button
            className="btn w-full disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600 mt-6">
          New to TestHub?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
