const { PrismaClient } = require("@prisma/client");

// Single shared PrismaClient for the whole service.
//
// Previously every route file did `new PrismaClient()`, so this one service
// opened ~5 independent connection pools. On free-tier Postgres (a low
// connection cap) that exhausted connections during cold-start reconnects and
// surfaced as random 500s. A singleton keeps exactly one pool per process.
//
// The globalThis guard prevents a second instance if a dev hot-reload (nodemon)
// re-requires this module mid-process.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__testhubPrisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__testhubPrisma = prisma;
}

module.exports = prisma;
