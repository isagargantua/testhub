// OpenAPI 3.0 spec for testHub, served as interactive docs at GET /docs.
//
// This is a hand-maintained spec describing the public API surface exposed
// through the gateway. It exists primarily as a practice target: you can import
// it into Postman ("Import > OpenAPI"), generate client stubs, or do contract
// testing against it. It is a static document — serving it does no DB work and
// has zero impact on the proxied endpoints.

const bearerAuth = [{ bearerAuth: [] }];

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "testHub API",
    version: "1.0.0",
    description:
      "Test management platform API. All routes are reached through the " +
      "gateway. Authenticate via /api/auth/login, then send the returned " +
      "accessToken as a Bearer token on protected endpoints.",
  },
  servers: [
    { url: "/", description: "This gateway" },
    {
      url: "https://testhub-gateway.onrender.com",
      description: "Production gateway",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication & user management" },
    { name: "Projects" },
    { name: "Suites" },
    { name: "Test Cases" },
    { name: "Runs" },
    { name: "Dashboard" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { message: { type: "string" } },
      },
      Credentials: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@testhub.dev" },
          password: { type: "string", example: "Password123" },
        },
      },
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Admin" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["ADMIN", "TESTER", "VIEWER"] },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          status: { type: "string", enum: ["ACTIVE", "ARCHIVED"] },
          createdById: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ProjectInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Checkout flow" },
          description: { type: "string" },
        },
      },
      Suite: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          projectId: { type: "string" },
        },
      },
      TestCase: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          steps: { type: "string", nullable: true },
          expected: { type: "string", nullable: true },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          },
          status: { type: "string", enum: ["ACTIVE", "DEPRECATED"] },
          tags: { type: "array", items: { type: "string" } },
          suiteId: { type: "string" },
        },
      },
      Run: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["IN_PROGRESS", "COMPLETED", "ABORTED"],
          },
          selectedCaseIds: { type: "array", items: { type: "string" } },
          projectId: { type: "string" },
        },
      },
      Result: {
        type: "object",
        required: ["testCaseId", "status"],
        properties: {
          testCaseId: { type: "string" },
          status: { type: "string", enum: ["PASS", "FAIL", "SKIP", "BLOCKED"] },
          comment: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a user (first user becomes ADMIN)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: errorResponse,
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and receive tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Credentials" },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the current authenticated user",
        security: bearerAuth,
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Exchange a refresh token for a new access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { accessToken: { type: "string" } },
                },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out (blacklists the access token if Redis is available)",
        security: bearerAuth,
        responses: { 200: { description: "OK" }, 401: errorResponse },
      },
    },
    "/api/auth/users": {
      get: {
        tags: ["Auth"],
        summary: "List users (ADMIN only)",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 403: errorResponse },
      },
    },
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects (paginated)",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: { 200: { description: "OK" }, 401: errorResponse },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProjectInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          400: errorResponse,
        },
      },
    },
    "/api/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get a project",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
      put: {
        tags: ["Projects"],
        summary: "Update a project",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
    },
    "/api/suites/project/{projectId}": {
      get: {
        tags: ["Suites"],
        summary: "List suites in a project",
        security: bearerAuth,
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "OK" } },
      },
      post: {
        tags: ["Suites"],
        summary: "Create a suite in a project",
        security: bearerAuth,
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 201: { description: "Created" }, 400: errorResponse },
      },
    },
    "/api/suites/{id}": {
      put: {
        tags: ["Suites"],
        summary: "Update a suite",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
      delete: {
        tags: ["Suites"],
        summary: "Delete a suite",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
    },
    "/api/testcases/suite/{suiteId}": {
      get: {
        tags: ["Test Cases"],
        summary: "List test cases in a suite (paginated)",
        security: bearerAuth,
        parameters: [
          {
            name: "suiteId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: { 200: { description: "OK" } },
      },
      post: {
        tags: ["Test Cases"],
        summary: "Create a test case in a suite",
        security: bearerAuth,
        parameters: [
          {
            name: "suiteId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 201: { description: "Created" }, 400: errorResponse },
      },
    },
    "/api/testcases/{id}": {
      put: {
        tags: ["Test Cases"],
        summary: "Update a test case",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
      delete: {
        tags: ["Test Cases"],
        summary: "Delete a test case",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
    },
    "/api/runs/project/{projectId}": {
      get: {
        tags: ["Runs"],
        summary: "List runs in a project",
        security: bearerAuth,
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { description: "OK" } },
      },
      post: {
        tags: ["Runs"],
        summary: "Create a run (optionally scoped to selected test cases)",
        security: bearerAuth,
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  testCaseIds: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" }, 400: errorResponse },
      },
    },
    "/api/runs/{id}": {
      get: {
        tags: ["Runs"],
        summary: "Get a run with its results and summary",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
      put: {
        tags: ["Runs"],
        summary: "Update a run (e.g. set status to COMPLETED)",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
      delete: {
        tags: ["Runs"],
        summary: "Delete a run",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK" }, 404: errorResponse },
      },
    },
    "/api/runs/{id}/results": {
      post: {
        tags: ["Runs"],
        summary: "Record (upsert) a result for a test case in a run",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Result" },
            },
          },
        },
        responses: { 200: { description: "OK" }, 400: errorResponse },
      },
    },
    "/api/runs/{id}/export": {
      get: {
        tags: ["Runs"],
        summary: "Export a run's results as a downloadable CSV or JSON report",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["csv", "json"], default: "csv" },
          },
        ],
        responses: {
          200: {
            description: "A downloadable report attachment",
            content: {
              "text/csv": { schema: { type: "string" } },
              "application/json": { schema: { type: "object" } },
            },
          },
          404: errorResponse,
        },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Aggregate counts, pass rate, and recent run breakdown",
        security: bearerAuth,
        responses: { 200: { description: "OK" }, 401: errorResponse },
      },
    },
    "/api/dashboard/results": {
      get: {
        tags: ["Dashboard"],
        summary: "Test cases marked a given status across all runs",
        security: bearerAuth,
        parameters: [
          {
            name: "status",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["PASS", "FAIL", "SKIP", "BLOCKED"] },
          },
        ],
        responses: {
          200: { description: "OK" },
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
  },
};

module.exports = openapiSpec;
