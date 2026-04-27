"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "./actions";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField
        label="Current password"
        htmlFor="currentPassword"
        error={state.fieldErrors?.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
      <FormField
        label="New password"
        htmlFor="newPassword"
        hint="At least 8 characters."
        error={state.fieldErrors?.newPassword}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField
        label="Confirm new password"
        htmlFor="confirmNewPassword"
        error={state.fieldErrors?.confirmNewPassword}
      >
        <Input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-success">Password updated.</p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
