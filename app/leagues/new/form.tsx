"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChipPicker } from "@/components/chip-picker";
import { PaymentTemplatePicker } from "@/components/payment-template-picker";
import {
  createLeagueAction,
  type CreateLeagueActionState,
} from "./actions";

const initialState: CreateLeagueActionState = {};

type Props = {
  /** Names of seasons the organizer already owns, for the chip picker. */
  existingSeasonNames?: string[];
};

const GAME_SUGGESTIONS = [
  "Super Smash Bros Ultimate",
  "Rocket League",
  "Mario Kart 8 Deluxe",
  "Valorant",
  "League of Legends",
  "FIFA",
  "NBA 2K",
  "Madden",
  "Fortnite",
  "Call of Duty",
] as const;

// v1.4: round counts so organizers can picture the bracket before publishing.
function roundsForTeams(n: number): number {
  if (n < 2) return 0;
  return Math.ceil(Math.log2(n));
}

export function CreateLeagueForm({ existingSeasonNames = [] }: Props) {
  const [state, action, pending] = useActionState(
    createLeagueAction,
    initialState,
  );

  // Controlled bits so the chips and templates can write into them.
  const [game, setGame] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [teamSize, setTeamSize] = useState<number>(1);
  const [maxTeams, setMaxTeams] = useState<number>(8);
  const [seasonName, setSeasonName] = useState("");

  const rounds = roundsForTeams(maxTeams);
  const teamSizeLabel =
    teamSize === 1 ? "1v1 (solo)" : `${teamSize}v${teamSize}`;

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormField
        label="League name"
        htmlFor="name"
        hint="What you'll call the bracket. Captains and viewers see this everywhere."
        error={state.fieldErrors?.name}
      >
        <Input
          id="name"
          name="name"
          placeholder="Saturday Smash Cup"
          required
          maxLength={80}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor="description"
        hint='Optional. Shown on the public page. e.g. "Friday-night 1v1 at my place. Pizza on the house."'
        error={state.fieldErrors?.description}
      >
        <Input id="description" name="description" maxLength={500} />
      </FormField>

      <FormField
        label="Season"
        htmlFor="seasonName"
        hint="Optional. Group multiple leagues into a recurring series. Leave blank for a one-off bracket."
        error={state.fieldErrors?.seasonName}
      >
        <Input
          id="seasonName"
          name="seasonName"
          placeholder="Friday Smash Night"
          maxLength={80}
          value={seasonName}
          onChange={(e) => setSeasonName(e.target.value)}
        />
        {existingSeasonNames.length > 0 && (
          <ChipPicker
            ariaLabel="Your existing seasons"
            options={existingSeasonNames}
            value={seasonName}
            onSelect={setSeasonName}
            className="mt-2"
          />
        )}
      </FormField>

      <FormField
        label="Game"
        htmlFor="game"
        hint="Pick a common one or type your own."
        error={state.fieldErrors?.game}
      >
        <Input
          id="game"
          name="game"
          placeholder="Mario Kart 8 Deluxe"
          required
          maxLength={50}
          value={game}
          onChange={(e) => setGame(e.target.value)}
        />
        <ChipPicker
          ariaLabel="Game suggestions"
          options={GAME_SUGGESTIONS}
          value={game}
          onSelect={setGame}
          className="mt-2"
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          label="Team size"
          htmlFor="teamSize"
          hint={`Players per team. ${teamSizeLabel}.`}
          error={state.fieldErrors?.teamSize}
        >
          <Input
            id="teamSize"
            name="teamSize"
            type="number"
            min={1}
            max={10}
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value) || 1)}
            required
          />
        </FormField>

        <FormField
          label="Max teams"
          htmlFor="maxTeams"
          hint={
            rounds > 0
              ? `${rounds} round${rounds === 1 ? "" : "s"} for ${maxTeams} teams. Byes fill any gaps.`
              : "Cap on registered teams."
          }
          error={state.fieldErrors?.maxTeams}
        >
          <Input
            id="maxTeams"
            name="maxTeams"
            type="number"
            min={2}
            max={32}
            value={maxTeams}
            onChange={(e) => setMaxTeams(Number(e.target.value) || 2)}
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
          defaultValue="0"
          required
        />
      </FormField>

      <FormField
        label="Prize split"
        htmlFor="payoutPreset"
        hint="How you'll divide the prize. You manage the actual payout."
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
        hint="Optional. Tell captains exactly how to pay. Pick a template and edit your handle in."
        error={state.fieldErrors?.paymentInstructions}
      >
        <Textarea
          id="paymentInstructions"
          name="paymentInstructions"
          maxLength={500}
          rows={3}
          value={paymentInstructions}
          onChange={(e) => setPaymentInstructions(e.target.value)}
        />
        <div className="mt-2">
          <PaymentTemplatePicker onSelect={setPaymentInstructions} />
        </div>
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
