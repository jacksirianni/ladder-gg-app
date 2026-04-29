// v2.0: avatar upload endpoint. Mirrors /api/upload-evidence — stream
// to Vercel Blob, return URL. Caller updates the user's avatarUrl.
//
// Display-only — the avatar is shown on /p/[handle], champion-hero,
// captain links, and other identity surfaces. Reuses Vercel Blob from
// v1.8.

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/current-user";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — avatars don't need to be huge
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
      { error: "Sign in to upload an avatar." },
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
      { error: "Image must be 4 MB or smaller." },
      { status: 400 },
    );
  }

  // Namespace by user so blobs are easy to audit / GC.
  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const filename = `avatars/${user.id}/avatar${ext || ".png"}`;

  try {
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload failed unexpectedly.";
    console.error("[upload-avatar] failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
