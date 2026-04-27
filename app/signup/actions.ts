"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { signupSchema } from "@/lib/validators/auth";

export type SignupActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function signupAction(
  _prev: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    ageConfirmed: formData.get("ageConfirmed") === "on",
    acceptTerms: formData.get("acceptTerms") === "on",
  };

  const parsed = signupSchema.safeParse(raw);
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

  const { email, password, displayName, ageConfirmed } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      fieldErrors: { email: "An account with this email already exists." },
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      ageConfirmed,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        error:
          "Your account was created, but automatic sign-in failed. Please sign in manually.",
      };
    }
    throw err;
  }

  return {};
}
