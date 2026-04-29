"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { externalProfileSchema } from "@/lib/validators/external-profile";
import { changeHandleSchema } from "@/lib/validators/handle";
import { updateProfileSchema } from "@/lib/validators/user";
import { HANDLE_HISTORY_GRACE_MS } from "@/lib/handle";
import { setFlashToast } from "@/lib/toast";

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

  await setFlashToast({ kind: "success", message: "Password changed." });
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
  await setFlashToast({ kind: "success", message: "Profile saved." });
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
  await setFlashToast({ kind: "info", message: "Profile removed." });
}

// ---------------------------------------------------------------
// v1.8: editable handles
// ---------------------------------------------------------------

export type ChangeHandleState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

/**
 * Update the user's URL handle. The previous handle (if any) is moved
 * to `UserHandleHistory` with a 60-day grace period so existing
 * `/p/[handle]` links keep working — the public profile route will
 * permanent-redirect from the old handle to the new one.
 */
export async function changeHandleAction(
  _prev: ChangeHandleState,
  formData: FormData,
): Promise<ChangeHandleState> {
  const user = await requireAuth();

  const parsed = changeHandleSchema.safeParse({
    handle: String(formData.get("handle") ?? ""),
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

  const newHandle = parsed.data.handle;
  if (newHandle === user.handle) {
    // No-op — saves a transaction and avoids polluting history.
    return { success: true };
  }

  // Atomic uniqueness + history move. A handle is "taken" if it's:
  //   (a) the current handle of any User other than us, or
  //   (b) parked in UserHandleHistory by another user and not yet expired.
  // We allow reusing one of our own historical handles freely.
  try {
    await prisma.$transaction(async (tx) => {
      const userCollision = await tx.user.findUnique({
        where: { handle: newHandle },
        select: { id: true },
      });
      if (userCollision && userCollision.id !== user.id) {
        throw new HandleTakenError();
      }

      const now = new Date();
      const historyCollision = await tx.userHandleHistory.findUnique({
        where: { handle: newHandle },
        select: { userId: true, expiresAt: true },
      });
      if (
        historyCollision &&
        historyCollision.userId !== user.id &&
        historyCollision.expiresAt.getTime() > now.getTime()
      ) {
        throw new HandleTakenError();
      }

      // If the new handle exists in *our own* history, reclaim it
      // (delete the history row to avoid the unique constraint).
      if (historyCollision && historyCollision.userId === user.id) {
        await tx.userHandleHistory.delete({
          where: { handle: newHandle },
        });
      }

      // Park the old handle in history (if we had one) so old links
      // redirect to the new handle for the grace period.
      if (user.handle) {
        const expiresAt = new Date(now.getTime() + HANDLE_HISTORY_GRACE_MS);
        await tx.userHandleHistory.upsert({
          where: { handle: user.handle },
          create: {
            userId: user.id,
            handle: user.handle,
            expiresAt,
          },
          update: { expiresAt },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: { handle: newHandle },
      });
    });
  } catch (err) {
    if (err instanceof HandleTakenError) {
      return {
        fieldErrors: { handle: "That handle is already taken." },
      };
    }
    throw err;
  }

  // Revalidate the new + old profile URLs so anyone with cached pages
  // gets fresh data on next request.
  revalidatePath("/account");
  revalidatePath(`/p/${newHandle}`);
  if (user.handle) revalidatePath(`/p/${user.handle}`);

  await setFlashToast({
    kind: "success",
    message: `Handle changed to @${newHandle}.`,
  });
  return { success: true };
}

class HandleTakenError extends Error {
  constructor() {
    super("Handle taken");
  }
}

// ---------------------------------------------------------------
// v2.0: profile (avatar URL + bio)
// ---------------------------------------------------------------

export type UpdateProfileState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

/**
 * Update the current user's avatar URL + bio. Avatar URL comes from
 * /api/upload-avatar (Vercel Blob); the bio is plain text capped at
 * 200 characters.
 *
 * Either field can be cleared by submitting an empty value.
 */
export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const user = await requireAuth();

  const parsed = updateProfileSchema.safeParse({
    avatarUrl: String(formData.get("avatarUrl") ?? ""),
    bio: String(formData.get("bio") ?? ""),
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      avatarUrl: parsed.data.avatarUrl ?? null,
      bio: parsed.data.bio ?? null,
    },
  });

  revalidatePath("/account");
  if (user.handle) revalidatePath(`/p/${user.handle}`);
  await setFlashToast({ kind: "success", message: "Profile saved." });
  return { success: true };
}

// ---------------------------------------------------------------
// v2.0-B: email notification preferences (master opt-out)
// ---------------------------------------------------------------

export async function setEmailNotificationsAction(formData: FormData) {
  const user = await requireAuth();
  // Checkbox: present + "on" → true, absent → false.
  const enabled = formData.get("emailNotifications") === "on";

  await prisma.user.update({
    where: { id: user.id },
    data: { emailNotifications: enabled },
  });

  revalidatePath("/account");
  await setFlashToast({
    kind: "success",
    message: enabled ? "Emails turned on." : "Emails turned off.",
  });
}
