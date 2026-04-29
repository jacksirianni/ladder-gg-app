// v1.8: native screenshot upload endpoint for the evidence panel.
//
// Authenticated users can upload an image; we stream it straight to
// Vercel Blob (public bucket) and return the URL. The caller pastes
// that URL into a SCREENSHOT evidence row — same shape as paste-URL
// flow, just without the imgur detour.
//
// Manual reporting remains the source of truth — uploaded images are
// "evidence content", never auto-confirmation. Per the integration
// philosophy in docs/integration-philosophy.md.

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/current-user";

// Hard limits — protect against pathological uploads.
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export async function POST(req: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json(
      { error: "Sign in to upload evidence." },
      { status: 401 },
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, WebP, or GIF images are allowed." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 8MB or smaller." },
      { status: 400 },
    );
  }

  // Pathname is namespaced by user so blobs are easy to audit / GC.
  // Vercel Blob's `addRandomSuffix` keeps every upload at a unique URL.
  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const filename = `evidence/${user.id}/screenshot${ext || ".png"}`;

  try {
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    // Vercel Blob isn't configured locally — surface the actual error
    // so the dev knows to wire BLOB_READ_WRITE_TOKEN.
    const message =
      err instanceof Error ? err.message : "Upload failed unexpectedly.";
    console.error("[upload-evidence] failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
