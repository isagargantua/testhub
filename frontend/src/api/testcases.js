import client from "./client";

export async function getAllTestCases({ page = 1, limit = 20, search = "", projectId = "" } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search)    params.set("search",    search);
  if (projectId) params.set("projectId", projectId);
  const response = await client.get(`/api/testcases/all?${params}`);
  return response.data;
}

export async function getTestCases(suiteId, page = 1, limit = 10) {
  const response = await client.get(
    `/api/testcases/suite/${suiteId}?page=${page}&limit=${limit}`
  );
  return response.data;
}

export async function createTestCase(suiteId, data) {
  const response = await client.post(`/api/testcases/suite/${suiteId}`, data);
  return response.data;
}

export async function deleteTestCase(id) {
  const response = await client.delete(`/api/testcases/${id}`);
  return response.data;
}
