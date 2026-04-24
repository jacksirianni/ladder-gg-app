import { z } from "zod";

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters."),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(50, "Display name must be 50 characters or fewer."),
  ageConfirmed: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must be 18 or older to sign up.",
    }),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type SigninInput = z.infer<typeof signinSchema>;
