import { useMemo, useState } from "react";

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

  return "Could not create account. Please try again.";
}

export default function Register() {
  const { register } = useAuth();

  const navigate = useNavigate();

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const validationError = useMemo(() => {
    if (!name.trim()) {
      return "Name is required.";
    }

    if (!email.trim()) {
      return "Email is required.";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  }, [name, email, password, confirmPassword]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError("");
      setSubmitting(true);

      await register(
        name.trim(),
        email.trim(),
        password
      );

      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">
          Create account
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
              Name
            </label>

            <input
              className="input"
              value={name}
              autoComplete="name"
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

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
              autoComplete="new-password"
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <div>
            <label className="label">
              Confirm password
            </label>

            <input
              type="password"
              className="input"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />
          </div>

          <button
            className="btn w-full disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting
              ? "Creating account..."
              : "Create account"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
