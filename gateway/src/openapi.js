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
          email: { type: "string", format: "email", example: "tester@testhub.dev" },
          password: { type: "string", example: "Password123" },
        },
      },
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Jane Tester" },
          email: { type: "string", format: "email", example: "jane@testhub.dev" },
          password: { type: "string", minLength: 6, example: "secret123" },
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
          role: { type: "string", enum: ["ADMIN", "TESTER"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ResetPasswordInput: {
        type: "object",
        required: ["password"],
        properties: {
          password: { type: "string", minLength: 6, example: "newSecret123" },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          pages: { type: "integer" },
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
          updatedAt: { type: "string", format: "date-time" },
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
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SuiteInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Login tests" },
          description: { type: "string" },
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
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          status: { type: "string", enum: ["ACTIVE", "DEPRECATED"] },
          tags: { type: "array", items: { type: "string" } },
          suiteId: { type: "string" },
          createdById: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TestCaseInput: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "Verify login with valid credentials" },
          description: { type: "string" },
          steps: { type: "string", example: "1. Navigate to /login\n2. Enter credentials\n3. Click Submit" },
          expected: { type: "string", example: "User is redirected to dashboard" },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            default: "MEDIUM",
          },
          tags: { type: "array", items: { type: "string" }, example: ["smoke", "auth"] },
        },
      },
      TestCaseUpdateInput: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          steps: { type: "string" },
          expected: { type: "string" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          status: { type: "string", enum: ["ACTIVE", "DEPRECATED"] },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      Run: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          status: { type: "string", enum: ["IN_PROGRESS", "COMPLETED", "ABORTED"] },
          selectedCaseIds: { type: "array", items: { type: "string" } },
          projectId: { type: "string" },
          createdById: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RunInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Sprint 12 smoke run" },
          description: { type: "string" },
          testCaseIds: {
            type: "array",
            items: { type: "string" },
            description: "Subset of test case IDs to include. Omit to include all cases in the project.",
          },
        },
      },
      Result: {
        type: "object",
        required: ["testCaseId", "status"],
        properties: {
          testCaseId: { type: "string" },
          status: { type: "string", enum: ["PASS", "FAIL", "SKIP", "BLOCKED"] },
          comment: { type: "string", nullable: true },
        },
      },
    },
  },
  paths: {
    // ── Auth ─────────────────────────────────────────────────────────────────
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user account (role: TESTER)",
        description:
          "Creates a new user with the TESTER role. Admin promotion is handled " +
          "separately from the backend — it cannot be done through this endpoint.",
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
            description: "User created",
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
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/api/auth/users": {
      get: {
        tags: ["Auth"],
        summary: "List all users (ADMIN only)",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Filter by name or email" },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/User" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
        },
      },
    },
    "/api/auth/users/{id}/reset-password": {
      patch: {
        tags: ["Auth"],
        summary: "Reset a user's password (ADMIN only)",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Password updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    "/api/auth/users/{id}": {
      delete: {
        tags: ["Auth"],
        summary: "Delete a user account (ADMIN only)",
        description: "Cannot delete your own account or the last remaining ADMIN.",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "User deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },

    // ── Projects ─────────────────────────────────────────────────────────────
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "List your projects (paginated)",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Project" } },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          401: errorResponse,
        },
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
          401: errorResponse,
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
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      put: {
        tags: ["Projects"],
        summary: "Update a project",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  status: { type: "string", enum: ["ACTIVE", "ARCHIVED"] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
    },

    // ── Suites ───────────────────────────────────────────────────────────────
    "/api/suites/project/{projectId}": {
      get: {
        tags: ["Suites"],
        summary: "List suites in a project",
        security: bearerAuth,
        parameters: [
          { name: "projectId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Suite" } },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      post: {
        tags: ["Suites"],
        summary: "Create a suite in a project",
        security: bearerAuth,
        parameters: [
          { name: "projectId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuiteInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Suite" },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuiteInput" },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Suite" },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      delete: {
        tags: ["Suites"],
        summary: "Delete a suite",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
    },

    // ── Test Cases ────────────────────────────────────────────────────────────
    "/api/testcases/export": {
      get: {
        tags: ["Test Cases"],
        summary: "Export your whole test case library as CSV or JSON",
        description:
          "Downloads the full authoring detail (including steps and expected " +
          "result) of every test case you own. Honours the same search and " +
          "projectId filters as GET /api/testcases/all.",
        security: bearerAuth,
        parameters: [
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["csv", "json"], default: "csv" },
            description:
              "csv columns: Test Case ID, Title, Description, Steps, Expected Result, Priority, Status, Tags, Project, Suite, Latest Result, Created At",
          },
          { name: "search", in: "query", schema: { type: "string" }, description: "Filter by title" },
          { name: "projectId", in: "query", schema: { type: "string" }, description: "Filter by project" },
        ],
        responses: {
          200: {
            description: "Downloadable report",
            content: {
              "text/csv": { schema: { type: "string" } },
              "application/json": { schema: { type: "object" } },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/api/testcases/all": {
      get: {
        tags: ["Test Cases"],
        summary: "List all your test cases across all projects and suites",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Filter by title" },
          { name: "projectId", in: "query", schema: { type: "string" }, description: "Filter by project" },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        allOf: [
                          { $ref: "#/components/schemas/TestCase" },
                          {
                            type: "object",
                            properties: {
                              project: { $ref: "#/components/schemas/Project" },
                              suite: { $ref: "#/components/schemas/Suite" },
                              latestResult: {
                                type: "string",
                                enum: ["PASS", "FAIL", "SKIP", "BLOCKED"],
                                nullable: true,
                              },
                            },
                          },
                        ],
                      },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/api/testcases/suite/{suiteId}": {
      get: {
        tags: ["Test Cases"],
        summary: "List test cases in a suite (paginated)",
        security: bearerAuth,
        parameters: [
          { name: "suiteId", in: "path", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/TestCase" } },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      post: {
        tags: ["Test Cases"],
        summary: "Create a test case in a suite",
        security: bearerAuth,
        parameters: [
          { name: "suiteId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TestCaseInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TestCase" },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TestCaseUpdateInput" },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TestCase" },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      delete: {
        tags: ["Test Cases"],
        summary: "Delete a test case",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
    },

    // ── Runs ─────────────────────────────────────────────────────────────────
    "/api/runs/project/{projectId}": {
      get: {
        tags: ["Runs"],
        summary: "List runs in a project",
        security: bearerAuth,
        parameters: [
          { name: "projectId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Run" } },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      post: {
        tags: ["Runs"],
        summary: "Create a run in a project",
        security: bearerAuth,
        parameters: [
          { name: "projectId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RunInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Run" },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
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
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/Run" },
                    {
                      type: "object",
                      properties: {
                        results: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              testCaseId: { type: "string" },
                              status: { type: "string", enum: ["PASS", "FAIL", "SKIP", "BLOCKED"] },
                              comment: { type: "string", nullable: true },
                              executedAt: { type: "string", format: "date-time" },
                            },
                          },
                        },
                        summary: {
                          type: "object",
                          properties: {
                            PASS: { type: "integer" },
                            FAIL: { type: "integer" },
                            SKIP: { type: "integer" },
                            BLOCKED: { type: "integer" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      put: {
        tags: ["Runs"],
        summary: "Update a run (e.g. set status to COMPLETED)",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  status: { type: "string", enum: ["IN_PROGRESS", "COMPLETED", "ABORTED"] },
                  selectedCaseIds: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Run" },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
      delete: {
        tags: ["Runs"],
        summary: "Delete a run",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
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
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    runId: { type: "string" },
                    testCaseId: { type: "string" },
                    status: { type: "string", enum: ["PASS", "FAIL", "SKIP", "BLOCKED"] },
                    comment: { type: "string", nullable: true },
                    executedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    "/api/runs/{id}/export": {
      get: {
        tags: ["Runs"],
        summary: "Export a run's results as CSV or JSON",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["csv", "json"], default: "csv" },
            description: "csv columns: Test Case ID, Title, Priority, Status, Comment, Executed At",
          },
        ],
        responses: {
          200: {
            description: "Downloadable report",
            content: {
              "text/csv": { schema: { type: "string" } },
              "application/json": { schema: { type: "object" } },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
    },

    // ── Dashboard ─────────────────────────────────────────────────────────────
    "/api/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Aggregate counts, pass rate, and recent run breakdown",
        security: bearerAuth,
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalProjects: { type: "integer" },
                    activeProjects: { type: "integer" },
                    totalTestCases: { type: "integer" },
                    totalRuns: { type: "integer" },
                    activeRuns: { type: "integer" },
                    passRatePercent: { type: "number" },
                    resultBreakdown: {
                      type: "object",
                      properties: {
                        PASS: { type: "integer" },
                        FAIL: { type: "integer" },
                        SKIP: { type: "integer" },
                        BLOCKED: { type: "integer" },
                      },
                    },
                    recentRuns: { type: "array", items: { $ref: "#/components/schemas/Run" } },
                    latestRunName: { type: "string", nullable: true },
                    latestRunStatus: { type: "string", nullable: true },
                    latestRunResults: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
          401: errorResponse,
        },
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
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      status: { type: "string" },
                      comment: { type: "string", nullable: true },
                      executedAt: { type: "string", format: "date-time" },
                      testCaseTitle: { type: "string" },
                      priority: { type: "string" },
                      runName: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
  },
};

module.exports = openapiSpec;
