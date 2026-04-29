import { z } from "zod";
import {
  HANDLE_MAX,
  HANDLE_MIN,
  HANDLE_PATTERN,
  RESERVED_HANDLES,
} from "@/lib/handle";

// v1.8: user-chosen handle. We trim + lowercase here so the same
// constraints apply regardless of casing typed by the user.
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN, `Handle must be at least ${HANDLE_MIN} characters.`)
  .max(HANDLE_MAX, `Handle must be ${HANDLE_MAX} characters or fewer.`)
  .regex(
    HANDLE_PATTERN,
    "Handle must use lowercase letters, numbers, and dashes (no leading or trailing dash, no consecutive dashes).",
  )
  .refine(
    (h) => !RESERVED_HANDLES.has(h),
    { message: "That handle is reserved." },
  );

export const changeHandleSchema = z.object({
  handle: handleSchema,
});

export type ChangeHandleInput = z.infer<typeof changeHandleSchema>;
