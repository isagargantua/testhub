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

// Download the user's test case library as a file. Goes through `client` so it
// inherits the auth header, cold-start retries, and token refresh. The response
// is a blob; we read the server's filename from Content-Disposition and trigger
// a browser download client-side.
export async function exportTestCases({ format = "csv", search = "", projectId = "" } = {}) {
  const params = new URLSearchParams({ format });
  if (search)    params.set("search",    search);
  if (projectId) params.set("projectId", projectId);

  const response = await client.get(`/api/testcases/export?${params}`, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `testhub_testcases.${format}`;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
