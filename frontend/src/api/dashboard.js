import client from "./client";

export async function getDashboardStats() {
  const response = await client.get(
    "/api/dashboard/stats"
  );

  return response.data;
}

// Test cases marked a given status (PASS/FAIL/SKIP/BLOCKED) across all runs.
export async function getResultsByStatus(status) {
  const response = await client.get("/api/dashboard/results", {
    params: { status },
  });

  return response.data;
}