import { getClerkToken } from "./auth-token";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Upload an image via the authenticated upload-image edge function.
 * Returns the public URL of the uploaded image.
 */
export async function uploadImage(
  file: File,
  filePath: string,
  options?: { requireAdmin?: boolean },
): Promise<string> {
  const token = await getClerkToken();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("filePath", filePath);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (options?.requireAdmin) {
    headers["x-require-admin"] = "true";
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }

  const data = await res.json();
  return data.publicUrl;
}
