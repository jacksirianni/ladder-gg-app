"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { externalProfileSchema } from "@/lib/validators/external-profile";

export type ChangePasswordState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"],
  });

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireAuth();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmNewPassword: String(formData.get("confirmNewPassword") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return {
      fieldErrors: { currentPassword: "Current password is incorrect." },
    };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { success: true };
}

// ---------------------------------------------------------------
// v1.7: external profiles (BattleTag, Tracker.gg, Riot ID, etc.)
// ---------------------------------------------------------------

export type ExternalProfileActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

/**
 * Upsert (create or update) an external profile for the current user.
 * One row per (userId, platform) — re-submitting BATTLENET overwrites
 * the existing row.
 */
export async function saveExternalProfileAction(
  _prev: ExternalProfileActionState,
  formData: FormData,
): Promise<ExternalProfileActionState> {
  const user = await requireAuth();

  const parsed = externalProfileSchema.safeParse({
    platform: String(formData.get("platform") ?? ""),
    identifier: String(formData.get("identifier") ?? ""),
    url: String(formData.get("url") ?? ""),
    label: String(formData.get("label") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { platform, identifier, url, label } = parsed.data;

  await prisma.userExternalProfile.upsert({
    where: { userId_platform: { userId: user.id, platform } },
    create: {
      userId: user.id,
      platform,
      identifier: identifier ?? null,
      url: url ?? null,
      label: label ?? null,
    },
    update: {
      identifier: identifier ?? null,
      url: url ?? null,
      label: label ?? null,
    },
  });

  revalidatePath("/account");
  if (user.handle) revalidatePath(`/p/${user.handle}`);
  return { success: true };
}

/**
 * Delete an external profile by platform. Idempotent — deleting a
 * non-existent row is a no-op.
 */
export async function deleteExternalProfileAction(formData: FormData) {
  const user = await requireAuth();
  const platform = String(formData.get("platform") ?? "");
  if (!platform) return;

  await prisma.userExternalProfile
    .delete({
      where: {
        userId_platform: {
          userId: user.id,
          // Cast — runtime validates against the enum on the DB side
          // anyway. Bad values throw a P2025 which we swallow.
          platform: platform as never,
        },
      },
    })
    .catch(() => undefined);

  revalidatePath("/account");
  if (user.handle) revalidatePath(`/p/${user.handle}`);
}
