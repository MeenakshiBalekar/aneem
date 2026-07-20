import "server-only";
import { put, del } from "@vercel/blob";

// Thin wrapper around Vercel Blob so the rest of the app never touches the
// SDK directly.
//
// Token variable name isn't just BLOB_READ_WRITE_TOKEN: when more than one
// Blob store gets connected to the same Vercel project, Vercel auto-prefixes
// every variable from the *second* store connected to avoid colliding with
// the first store's plain names (BLOB_STORE_ID / BLOB_READ_WRITE_TOKEN /
// BLOB_WEBHOOK_PUBLIC_KEY) — it does NOT rename the first store's vars.
// Confirmed against this project's actual Vercel dashboard: an old private
// store claimed the plain names first, so the public store connected after
// it got prefixed as AneemCustomInventory_READ_WRITE_TOKEN — meaning the
// plain BLOB_READ_WRITE_TOKEN silently keeps pointing at the wrong
// (private) store's token. Prefer the explicit prefixed var; fall back to
// the plain name so this still works cleanly once there's only one store.
const BLOB_TOKEN = process.env.AneemCustomInventory_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

function isBlobConfigured(): boolean {
  return Boolean(BLOB_TOKEN);
}

export { isBlobConfigured };

/** Uploads a file (from a multipart form) to Vercel Blob and returns its public URL. */
export async function uploadAsset(file: File, folder: string): Promise<string> {
  if (!BLOB_TOKEN) {
    throw new Error(
      "File storage isn't configured yet — connect a Blob store to this project (Vercel → Storage → Blob).",
    );
  }

  const ext = file.name.split(".").pop() || "bin";
  const pathname = `${folder}/${crypto.randomUUID()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    token: BLOB_TOKEN,
  });

  return blob.url;
}

export async function deleteAsset(url: string): Promise<void> {
  if (!BLOB_TOKEN) return;
  await del(url, { token: BLOB_TOKEN });
}
