import client from "./client";

export async function getDashboardStats() {
  const response = await client.get(
    "/api/dashboard/stats"
  );

  return response.data;
}