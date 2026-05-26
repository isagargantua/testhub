import client from "./client";

export async function login(data) {
  const response = await client.post(
    "/api/auth/login",
    data
  );

  return response.data;
}

export async function register(data) {
  const response = await client.post(
    "/api/auth/register",
    data
  );

  return response.data;
}

export async function getMe() {
  const response = await client.get(
    "/api/auth/me"
  );

  return response.data;
}

export async function logout(accessToken) {
  const response = await client.post(
    "/api/auth/logout",
    null,
    {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    }
  );

  return response.data;
}
