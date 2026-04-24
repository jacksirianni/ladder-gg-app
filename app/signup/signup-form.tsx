"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { signupAction, type SignupActionState } from "./actions";

const initialState: SignupActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </FormField>

      <FormField
        label="Display name"
        htmlFor="displayName"
        hint="Shown to captains and organizers."
        error={state.fieldErrors?.displayName}
      >
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="ageConfirmed"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-surface accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <span className="text-foreground-muted">
            I confirm I am 18 or older and agree to participate in skill-based
            competition for money.
          </span>
        </label>
        {state.fieldErrors?.ageConfirmed && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.ageConfirmed}
          </p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
