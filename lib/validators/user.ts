import { z } from "zod";

// v2.0: profile fields (avatar URL + bio). The avatar URL itself is
// produced by /api/upload-avatar (Vercel Blob), so we just sanity-check
// the shape here; the bio gets a hard length cap so it stays a "short
// blurb" not a full About page.

const optionalUrl = z
  .string()
  .trim()
  .max(500, "Avatar URL must be 500 characters or fewer.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalBio = z
  .string()
  .trim()
  .max(200, "Bio must be 200 characters or fewer.")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const updateProfileSchema = z.object({
  avatarUrl: optionalUrl.refine(
    (v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Avatar URL must start with http:// or https://." },
  ),
  bio: optionalBio,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
