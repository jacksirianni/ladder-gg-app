"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { signinAction, type SigninActionState } from "./actions";

const initialState: SigninActionState = {};

type Props = {
  redirectTo?: string;
};

export function SigninForm({ redirectTo }: Props) {
  const [state, formAction, pending] = useActionState(
    signinAction,
    initialState,
  );

  const signupHref = redirectTo
    ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/signup";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}
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
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-foreground-muted">
        No account yet?{" "}
        <Link
          href={signupHref}
          className="rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
