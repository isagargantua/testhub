import client from "./client";

export async function getRuns(projectId) {
  const response = await client.get(`/api/runs/project/${projectId}`);
  return response.data;
}

export async function createRun(projectId, data) {
  const response = await client.post(`/api/runs/project/${projectId}`, data);
  return response.data;
}

export async function getRun(id) {
  const response = await client.get(`/api/runs/${id}`);
  return response.data;
}

export async function updateRun(id, data) {
  const response = await client.put(`/api/runs/${id}`, data);
  return response.data;
}

export async function updateResult(runId, data) {
  const response = await client.post(`/api/runs/${runId}/results`, data);
  return response.data;
}

export async function deleteRun(id) {
  const response = await client.delete(`/api/runs/${id}`);
  return response.data;
}
