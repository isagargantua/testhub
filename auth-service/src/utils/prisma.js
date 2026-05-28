const { PrismaClient } = require("@prisma/client");

// Single shared PrismaClient for the whole service. See core-service's copy for
// the full rationale: avoids opening one connection pool per route file, which
// exhausts free-tier Postgres connections during cold-start reconnects.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__testhubPrisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__testhubPrisma = prisma;
}

module.exports = prisma;
