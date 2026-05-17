import client from "./client";

export async function getSuites(projectId) {
  const response = await client.get(
    `/api/suites/project/${projectId}`
  );

  return response.data;
}

export async function createSuite(
  projectId,
  data
) {
  const response = await client.post(
    `/api/suites/project/${projectId}`,
    data
  );

  return response.data;
}

export async function deleteSuite(id) {
  const response = await client.delete(
    `/api/suites/${id}`
  );

  return response.data;
}