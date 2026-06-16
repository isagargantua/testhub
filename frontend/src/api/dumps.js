import client from "./client";

export async function getDumps(params) {
  const response = await client.get("/api/dumps", { params });

  return response.data;
}

export async function uploadDumps(files, notes, onProgress) {
  const form = new FormData();

  for (const file of files) {
    form.append("files", file);
  }

  if (notes) {
    form.append("notes", notes);
  }

  const response = await client.post("/api/dumps", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return response.data;
}

export async function downloadDump(id, filename) {
  const response = await client.get(`/api/dumps/${id}/download`, {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteDump(id) {
  const response = await client.delete(`/api/dumps/${id}`);

  return response.data;
}
