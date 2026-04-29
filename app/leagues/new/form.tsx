"use client";

import { useActionState, useState } from "react";
import type { MatchFormat } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChipPicker } from "@/components/chip-picker";
import { MatchRulesFields } from "@/components/match-rules-fields";
import { PaymentTemplatePicker } from "@/components/payment-template-picker";
import { RegistrationAccessFields } from "@/components/registration-access-fields";
import { describeFormatSplit, getGamePreset } from "@/lib/match-format";
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
  "Overwatch 2",
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

/**
 * v1.9: form is now visually sectioned (About / Format & rules / Money /
 * Access & schedule). Game-preset chips hydrate teamSize, maxTeams,
 * matchFormat, finalMatchFormat, rules, and mapPool — not just format.
 */
export function CreateLeagueForm({ existingSeasonNames = [] }: Props) {
  const [state, action, pending] = useActionState(
    createLeagueAction,
    initialState,
  );

  // Form state — controlled where chips/templates need to write.
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [teamSize, setTeamSize] = useState<number>(1);
  const [maxTeams, setMaxTeams] = useState<number>(8);
  const [seasonName, setSeasonName] = useState("");
  const [buyInDollars, setBuyInDollars] = useState<number>(0);

  // v1.7 + v1.9: game-preset hydration. Chip click bumps `presetVersion`
  // which remounts <MatchRulesFields> with new defaults. v1.9 also
  // pushes teamSize / maxTeams down to local state so the bracket-size
  // hint updates immediately.
  const [presetMatchFormat, setPresetMatchFormat] =
    useState<MatchFormat>("SINGLE_SCORE");
  const [presetFinalMatchFormat, setPresetFinalMatchFormat] = useState<
    MatchFormat | null
  >(null);
  const [presetRules, setPresetRules] = useState<string>("");
  const [presetMapPool, setPresetMapPool] = useState<string>("");
  const [presetVersion, setPresetVersion] = useState(0);

  const handleGameSelect = (value: string) => {
    setGame(value);
    const preset = getGamePreset(value);
    if (preset) {
      setPresetMatchFormat(preset.matchFormat);
      setPresetFinalMatchFormat(preset.finalMatchFormat ?? null);
      setPresetRules(preset.rules ?? "");
      setPresetMapPool(preset.mapPool ?? "");
      // v1.9: hydrate size/maxTeams too so the entire shape of the
      // league snaps to the preset on a single click.
      if (preset.teamSize !== undefined) setTeamSize(preset.teamSize);
      if (preset.maxTeams !== undefined) setMaxTeams(preset.maxTeams);
      setPresetVersion((v) => v + 1);
    }
  };

  const rounds = roundsForTeams(maxTeams);
  const teamSizeLabel =
    teamSize === 1 ? "1v1 (solo)" : `${teamSize}v${teamSize}`;
  const formatPreview = describeFormatSplit(
    presetMatchFormat,
    presetFinalMatchFormat,
  );

  return (
    <form action={action} className="flex flex-col gap-8">
      {/* v1.9: live preview card so the organizer can sanity-check what
          they're configuring without scrolling around. */}
      <PreviewCard
        name={name}
        game={game}
        teamSizeLabel={teamSizeLabel}
        maxTeams={maxTeams}
        rounds={rounds}
        buyInDollars={buyInDollars}
        formatPreview={formatPreview}
      />

      {/* SECTION 1 — ABOUT */}
      <FormSection
        title="About"
        description="Where captains and viewers see your league."
      >
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
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          label="Game"
          htmlFor="game"
          hint="Pick a common one to auto-fill format, team size, and map pool — or type your own."
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
            onSelect={handleGameSelect}
            className="mt-2"
          />
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
      </FormSection>

      {/* SECTION 2 — FORMAT & RULES */}
      <FormSection
        title="Format & rules"
        description="How matches are played and counted."
      >
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

        {/* v1.7 + v1.9 + v2.0: match format + game depth + tournament
            format. Game-preset chips remount this fieldset (via key) with
            new match-format/rules/mapPool defaults. v2.0-A note: a chip
            click resets the tournament-format selector back to single-
            elim — acceptable since most organizers pick game first, then
            tournament format. */}
        <MatchRulesFields
          key={presetVersion}
          defaults={{
            matchFormat: presetMatchFormat,
            finalMatchFormat: presetFinalMatchFormat,
            rules: presetRules,
            mapPool: presetMapPool,
          }}
          fieldErrors={state.fieldErrors}
        />
      </FormSection>

      {/* SECTION 3 — MONEY (or note that it's free) */}
      <FormSection
        title="Money"
        description="Entry fee and prize. LADDER tracks status — you handle payments."
      >
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
            value={buyInDollars}
            onChange={(e) => setBuyInDollars(Number(e.target.value) || 0)}
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
      </FormSection>

      {/* SECTION 4 — ACCESS & SCHEDULE */}
      <FormSection
        title="Access & schedule"
        description="Who can join, when registration closes, and when the bracket starts."
      >
        <RegistrationAccessFields fieldErrors={state.fieldErrors} />
      </FormSection>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create league"}
        </Button>
      </div>
    </form>
  );
}

/**
 * v1.9: visual section header. Long forms are hard to scan; this gives
 * each conceptual chunk a heading + one-line description and a gentle
 * border so the whole form has a clear rhythm.
 */
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t border-border pt-6 first:border-0 first:pt-0">
      <header>
        <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
          {title}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">{description}</p>
      </header>
      {children}
    </section>
  );
}

/**
 * v1.9: live preview of the league as the organizer fills the form.
 * Pulls the most-meaningful fields into a compact summary so first-time
 * organizers can see what they're shaping.
 */
function PreviewCard({
  name,
  game,
  teamSizeLabel,
  maxTeams,
  rounds,
  buyInDollars,
  formatPreview,
}: {
  name: string;
  game: string;
  teamSizeLabel: string;
  maxTeams: number;
  rounds: number;
  buyInDollars: number;
  formatPreview: string;
}) {
  const displayName = name.trim() || "Your league name";
  const displayGame = game.trim() || "Game";
  const entryLabel =
    buyInDollars > 0 ? `$${buyInDollars.toFixed(2)} entry` : "Free entry";

  return (
    <aside
      aria-label="League preview"
      className="rounded-lg border border-primary/30 bg-primary/5 p-5"
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-primary">
        Preview
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">
        {displayName}
      </h3>
      <p className="mt-1 text-sm text-foreground-muted">
        <span>{displayGame}</span>
        <span className="px-2 text-foreground-subtle">·</span>
        <span>{teamSizeLabel}</span>
        <span className="px-2 text-foreground-subtle">·</span>
        <span>
          up to {maxTeams} teams
          {rounds > 0 && ` (${rounds} round${rounds === 1 ? "" : "s"})`}
        </span>
      </p>
      <p className="mt-2 font-mono text-xs text-foreground-subtle">
        {formatPreview}
        <span className="px-2">·</span>
        {entryLabel}
      </p>
    </aside>
  );
}
