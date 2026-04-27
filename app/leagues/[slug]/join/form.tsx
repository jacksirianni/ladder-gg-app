"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  createTeamAction,
  type CreateTeamActionState,
} from "./actions";

type Props = {
  slug: string;
  token: string;
  teamSize: number;
  buyInCents: number;
  paymentInstructions: string | null;
  captainDisplayName: string;
};

const initialState: CreateTeamActionState = {};

export function JoinForm({
  slug,
  token,
  teamSize,
  buyInCents,
  paymentInstructions,
  captainDisplayName,
}: Props) {
  const [state, action, pending] = useActionState(
    createTeamAction,
    initialState,
  );

  const rosterCount = Math.max(0, teamSize - 1);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />

      <FormField
        label="Team name"
        htmlFor="name"
        error={state.fieldErrors?.name}
      >
        <Input id="name" name="name" maxLength={80} required />
      </FormField>

      <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <p className="font-medium">Captain</p>
        <p className="text-foreground-muted">
          {captainDisplayName}{" "}
          <span className="text-foreground-subtle">(you)</span>
        </p>
      </div>

      {rosterCount > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">
            Roster ({rosterCount} other{" "}
            {rosterCount === 1 ? "player" : "players"})
          </p>
          {Array.from({ length: rosterCount }).map((_, i) => (
            <FormField
              key={i}
              label={`Player ${i + 2}`}
              htmlFor={`roster-${i}`}
              error={state.fieldErrors?.[`rosterMembers.${i}`]}
            >
              <Input
                id={`roster-${i}`}
                name="rosterMembers"
                maxLength={50}
                required
              />
            </FormField>
          ))}
        </div>
      )}

      {buyInCents > 0 && (
        <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
          <p className="font-medium">
            Entry fee: ${(buyInCents / 100).toFixed(2)}
          </p>
          <p className="mt-1 text-foreground-muted">
            Paid to the organizer outside LADDER. Your team will be marked
            PENDING until the organizer confirms your payment.
          </p>
          {paymentInstructions && (
            <p className="mt-2 whitespace-pre-wrap text-foreground-muted">
              {paymentInstructions}
            </p>
          )}
        </div>
      )}

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Registering…" : "Register team"}
      </Button>
    </form>
  );
}
