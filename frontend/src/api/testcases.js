import client from "./client";

export async function getTestCases(
  suiteId
) {
  const response = await client.get(
    `/api/testcases/suite/${suiteId}`
  );

  return response.data;
}

export async function createTestCase(
  suiteId,
  data
) {
  const response = await client.post(
    `/api/testcases/suite/${suiteId}`,
    data
  );

  return response.data;
}

export async function deleteTestCase(id) {
  const response = await client.delete(
    `/api/testcases/${id}`
  );

  return response.data;
}