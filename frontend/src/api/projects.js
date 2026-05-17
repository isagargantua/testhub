import client from "./client";

export async function getProjects() {
  const response = await client.get(
    "/api/projects"
  );

  return response.data;
}

export async function createProject(data) {
  const response = await client.post(
    "/api/projects",
    data
  );

  return response.data;
}

export async function updateProject(id, data) {
  const response = await client.put(
    `/api/projects/${id}`,
    data
  );

  return response.data;
}

export async function deleteProject(id) {
  const response = await client.delete(
    `/api/projects/${id}`
  );

  return response.data;
}