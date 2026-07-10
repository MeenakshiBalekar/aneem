import "server-only";
import { put, del } from "@vercel/blob";

// Thin wrapper around Vercel Blob so the rest of the app never touches the
// SDK directly. Requires BLOB_READ_WRITE_TOKEN (auto-provisioned when you
// connect a Blob store to your Vercel project — see docs/DEPLOYMENT.md).
function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export { isBlobConfigured };

/** Uploads a file (from a multipart form) to Vercel Blob and returns its public URL. */
export async function uploadAsset(file: File, folder: string): Promise<string> {
  if (!isBlobConfigured()) {
    throw new Error(
      "File storage isn't configured yet — set BLOB_READ_WRITE_TOKEN (Vercel Project Settings → Storage → Blob).",
    );
  }

  const ext = file.name.split(".").pop() || "bin";
  const pathname = `${folder}/${crypto.randomUUID()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
  });

  return blob.url;
}

export async function deleteAsset(url: string): Promise<void> {
  if (!isBlobConfigured()) return;
  await del(url);
}
