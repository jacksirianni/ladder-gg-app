"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
        label="Buy-in (USD)"
        htmlFor="buyInDollars"
        hint="Per team. Enter 0 for a free league."
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
        label="Payout preset"
        htmlFor="payoutPreset"
        hint="How the pool splits among top teams. Platform rake of 10% applies."
        error={state.fieldErrors?.payoutPreset}
      >
        <Select id="payoutPreset" name="payoutPreset" defaultValue="WTA">
          <option value="WTA">Winner takes all</option>
          <option value="TOP_2">Top 2: 70 / 30</option>
          <option value="TOP_3">Top 3: 60 / 30 / 10</option>
        </Select>
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
