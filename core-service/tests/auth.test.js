const test = require("node:test");
const assert = require("node:assert");

const {
  requireRole,
} = require("../src/middleware/auth");

test("requireRole allows valid role", () => {
  const req = {
    user: {
      role: "ADMIN",
    },
  };

  let nextCalled = false;

  const res = {
    status() {
      return this;
    },
    json() {},
  };

  const next = () => {
    nextCalled = true;
  };

  requireRole("ADMIN")(req, res, next);

  assert.equal(nextCalled, true);
});

test("requireRole blocks invalid role", () => {
  const req = {
    user: {
      role: "VIEWER",
    },
  };

  let statusCode = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {},
  };

  requireRole("ADMIN")(req, res, () => {});

  assert.equal(statusCode, 403);
});