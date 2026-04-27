"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

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
