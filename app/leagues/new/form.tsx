"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createLeagueAction,
  type CreateLeagueActionState,
} from "./actions";

const initialState: CreateLeagueActionState = {};

export function CreateLeagueForm() {
  const [state, action, pending] = useActionState(
    createLeagueAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormField
        label="League name"
        htmlFor="name"
        error={state.fieldErrors?.name}
      >
        <Input
          id="name"
          name="name"
          placeholder="Saturday MK8 Cup"
          required
          maxLength={80}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor="description"
        hint="Optional. Shown on the public league page."
        error={state.fieldErrors?.description}
      >
        <Input id="description" name="description" maxLength={500} />
      </FormField>

      <FormField
        label="Game"
        htmlFor="game"
        hint="Any game you play. Free text."
        error={state.fieldErrors?.game}
      >
        <Input
          id="game"
          name="game"
          placeholder="Mario Kart 8 Deluxe"
          required
          maxLength={50}
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          label="Team size"
          htmlFor="teamSize"
          hint="Players per team."
          error={state.fieldErrors?.teamSize}
        >
          <Input
            id="teamSize"
            name="teamSize"
            type="number"
            min={1}
            max={10}
            defaultValue={1}
            required
          />
        </FormField>

        <FormField
          label="Max teams"
          htmlFor="maxTeams"
          hint="Cap on registered teams."
          error={state.fieldErrors?.maxTeams}
        >
          <Input
            id="maxTeams"
            name="maxTeams"
            type="number"
            min={2}
            max={32}
            defaultValue={8}
            required
          />
        </FormField>
      </div>

      <FormField
        label="Entry fee (USD)"
        htmlFor="buyInDollars"
        hint="Per team. Captains pay you directly off-platform. Enter 0 for a free league."
        error={state.fieldErrors?.buyInDollars}
      >
        <Input
          id="buyInDollars"
          name="buyInDollars"
          type="number"
          min={0}
          step="0.01"
          defaultValue="5"
          required
        />
      </FormField>

      <FormField
        label="Prize split"
        htmlFor="payoutPreset"
        hint="How you'll split the prize among top finishers. You manage the actual payout."
        error={state.fieldErrors?.payoutPreset}
      >
        <Select id="payoutPreset" name="payoutPreset" defaultValue="WTA">
          <option value="WTA">Winner takes all</option>
          <option value="TOP_2">Top 2: 70 / 30</option>
          <option value="TOP_3">Top 3: 60 / 30 / 10</option>
        </Select>
      </FormField>

      <FormField
        label="Payment instructions"
        htmlFor="paymentInstructions"
        hint='Optional. Tell captains how to pay you. e.g. "Venmo @your-handle by Friday."'
        error={state.fieldErrors?.paymentInstructions}
      >
        <Textarea
          id="paymentInstructions"
          name="paymentInstructions"
          maxLength={500}
          rows={3}
        />
      </FormField>

      <FormField
        label="Prize notes"
        htmlFor="prizeNotes"
        hint='Optional. Describe the prize. e.g. "$50 winner, $20 runner-up, paid via Venmo within 48h."'
        error={state.fieldErrors?.prizeNotes}
      >
        <Textarea
          id="prizeNotes"
          name="prizeNotes"
          maxLength={500}
          rows={3}
        />
      </FormField>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create league"}
      </Button>
    </form>
  );
}
