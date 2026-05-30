const prisma = require("./prisma");

// ---------------------------------------------------------------------------
// Per-user data isolation.
//
// Every domain resource is owned by the user who created its PROJECT. A project
// has `createdById`; suites/test-cases/runs all hang off a project, so their
// owner is the project's owner. These helpers return the entity only when the
// current user owns it (else null), so routes can answer 404 for anything that
// isn't theirs — a user never sees or touches another user's data.
// ---------------------------------------------------------------------------

async function ownedProject(projectId, userId) {
  if (!projectId) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.createdById !== userId) return null;
  return project;
}

async function ownedSuite(suiteId, userId) {
  if (!suiteId) return null;
  const suite = await prisma.testSuite.findUnique({
    where: { id: suiteId },
    include: { project: { select: { createdById: true } } },
  });
  if (!suite || suite.project?.createdById !== userId) return null;
  return suite;
}

async function ownedTestCase(caseId, userId) {
  if (!caseId) return null;
  const testCase = await prisma.testCase.findUnique({
    where: { id: caseId },
    include: {
      suite: { select: { project: { select: { createdById: true } } } },
    },
  });
  if (!testCase || testCase.suite?.project?.createdById !== userId) return null;
  return testCase;
}

async function ownedRun(runId, userId) {
  if (!runId) return null;
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: { project: { select: { createdById: true } } },
  });
  if (!run || run.project?.createdById !== userId) return null;
  return run;
}

module.exports = { ownedProject, ownedSuite, ownedTestCase, ownedRun };
