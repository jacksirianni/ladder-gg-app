"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  changeHandleAction,
  type ChangeHandleState,
} from "@/app/account/actions";
import { HANDLE_MAX, HANDLE_MIN } from "@/lib/handle";

const initialState: ChangeHandleState = {};

type Props = {
  /** Current handle (or null if somehow missing — shouldn't happen post-backfill). */
  currentHandle: string | null;
};

/**
 * v1.8: lets a user pick / change their `/p/[handle]` slug. Old
 * handles redirect to the new one for a 60-day grace period.
 */
export function ChangeHandleForm({ currentHandle }: Props) {
  const [draft, setDraft] = useState<string>(currentHandle ?? "");
  const [state, action, pending] = useActionState(
    changeHandleAction,
    initialState,
  );

  const previewDisabled =
    !draft.trim() ||
    draft.trim().toLowerCase() === currentHandle?.toLowerCase();

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField
        label="URL handle"
        htmlFor="handle"
        hint="Your public profile URL. Lowercase letters, numbers, and dashes."
        error={state.fieldErrors?.handle}
      >
        <Input
          id="handle"
          name="handle"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          minLength={HANDLE_MIN}
          maxLength={HANDLE_MAX}
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="your-handle"
        />
      </FormField>

      <p className="font-mono text-xs text-foreground-subtle">
        Preview:{" "}
        <span className="text-foreground-muted">
          ladder.gg/p/{draft.trim().toLowerCase() || "your-handle"}
        </span>
      </p>

      {currentHandle && (
        <p className="text-xs text-foreground-subtle">
          Current: <code className="font-mono">@{currentHandle}</code> · old
          handles redirect for 60 days, so any links you&apos;ve already
          shared will keep working.
        </p>
      )}

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-success">
          Saved — your profile is now at{" "}
          <span className="font-mono">/p/{draft.trim().toLowerCase()}</span>.
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending || previewDisabled}>
          {pending ? "Saving…" : "Save handle"}
        </Button>
      </div>
    </form>
  );
}
