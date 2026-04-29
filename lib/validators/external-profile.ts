import { z } from "zod";

// v1.7: external profile platforms a user can list on their public
// profile. Two shapes:
//   - identifier-based: BattleTag "Tracer#1234", Riot ID "Goose#NA1",
//     Steam ID, Xbox/PSN/Nintendo handles
//   - URL-based: Tracker.gg / OP.gg profile URLs
// We never call these platforms' APIs in v1.7 — display only.
const externalPlatformEnum = z.enum([
  "BATTLENET",
  "TRACKER_GG",
  "STEAM",
  "RIOT_ID",
  "EPIC",
  "XBOX",
  "PSN",
  "NINTENDO",
  "OTHER",
]);

const optionalIdentifier = z
  .string()
  .trim()
  .max(64, "Identifier must be 64 characters or fewer.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(500, "URL must be 500 characters or fewer.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalLabel = z
  .string()
  .trim()
  .max(40, "Label must be 40 characters or fewer.")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const externalProfileSchema = z
  .object({
    platform: externalPlatformEnum,
    identifier: optionalIdentifier,
    url: optionalUrl,
    label: optionalLabel,
  })
  .refine(
    (data) => Boolean(data.identifier) || Boolean(data.url),
    {
      message: "Either an identifier or a URL is required.",
      path: ["identifier"],
    },
  )
  .refine(
    (data) => {
      // If a URL is provided, do a minimal sanity check — must look
      // like an http(s) URL. We don't attempt resolution.
      if (!data.url) return true;
      try {
        const u = new URL(data.url);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    {
      message: "URL must start with http:// or https://.",
      path: ["url"],
    },
  );

export type ExternalProfileInput = z.infer<typeof externalProfileSchema>;
