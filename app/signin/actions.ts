"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeInternalPath } from "@/lib/auth/redirect";
import { signinSchema } from "@/lib/validators/auth";

export type SigninActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function signinAction(
  _prev: SigninActionState,
  formData: FormData,
): Promise<SigninActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = signinSchema.safeParse(raw);
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

  const { email, password } = parsed.data;
  const requestedRedirect =
    safeInternalPath(String(formData.get("redirectTo") ?? "")) ?? "/dashboard";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: requestedRedirect,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err;
  }

  return {};
}
