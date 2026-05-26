import client from "./client";

export async function getUsers(params) {
  const response = await client.get("/api/auth/users", {
    params,
  });

  return response.data;
}

export async function resetUserPassword(id, password) {
  const response = await client.patch(
    `/api/auth/users/${id}/reset-password`,
    { password }
  );

  return response.data;
}

export async function deleteUser(id) {
  const response = await client.delete(
    `/api/auth/users/${id}`
  );

  return response.data;
}
