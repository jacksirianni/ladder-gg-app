"use client";

import { useState } from "react";
import type { MatchFormat } from "@prisma/client";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FORMAT_RULES } from "@/lib/match-format";
import { cn } from "@/lib/cn";

type FieldErrors = Record<string, string>;

type Props = {
  /** Initial values. Parent re-keys this component (via React `key`)
   *  to force a remount when game presets push new defaults. */
  defaults?: {
    matchFormat?: MatchFormat;
    rules?: string;
    mapPool?: string;
  };
  /** Field errors keyed by field name (matches schema field names). */
  fieldErrors?: FieldErrors;
  /** When true, the matchFormat select is disabled (locked once league
   *  is IN_PROGRESS so retroactive scores can't be reinterpreted). */
  formatLocked?: boolean;
};

const FORMAT_OPTIONS: {
  value: MatchFormat;
  label: string;
  helper: string;
}[] = [
  {
    value: "BEST_OF_3",
    label: "Best of 3",
    helper: "First team to 2 game wins takes the match.",
  },
  {
    value: "BEST_OF_5",
    label: "Best of 5",
    helper: "First team to 3 game wins takes the match.",
  },
  {
    value: "BEST_OF_7",
    label: "Best of 7",
    helper: "First team to 4 game wins takes the match.",
  },
  {
    value: "SINGLE_SCORE",
    label: "Single game with score",
    helper: "One game per match. Optional structured score (goals, rounds, etc.).",
  },
  {
    value: "FREEFORM",
    label: "Free-form",
    helper: "Free-text score only — useful for cup formats or odd scoring.",
  },
];

/**
 * Shared "Match rules" fieldset. Used by the create-league form and the
 * edit-modal. Captures matchFormat + rules + mapPool.
 *
 * Parent forms that want to push new presets (e.g. game-chip clicks)
 * pass a changing `key` to remount this component with fresh defaults.
 * Local edits between remounts are preserved; a remount is the explicit
 * "throw away local edits, take the preset" signal.
 */
export function MatchRulesFields({
  defaults,
  fieldErrors,
  formatLocked,
}: Props) {
  const [format, setFormat] = useState<MatchFormat>(
    defaults?.matchFormat ?? "SINGLE_SCORE",
  );
  const [rules, setRules] = useState<string>(defaults?.rules ?? "");
  const [mapPool, setMapPool] = useState<string>(defaults?.mapPool ?? "");

  const helper = FORMAT_OPTIONS.find((o) => o.value === format)?.helper;

  return (
    <fieldset className="flex flex-col gap-5 rounded-lg border border-border bg-surface/40 p-5">
      <legend className="px-1 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        Match rules
      </legend>

      <FormField
        label="Match format"
        htmlFor="matchFormat"
        hint={
          formatLocked
            ? "Locked while the bracket is in progress."
            : helper
        }
        error={fieldErrors?.matchFormat}
      >
        <Select
          id="matchFormat"
          name="matchFormat"
          value={format}
          onChange={(e) => setFormat(e.target.value as MatchFormat)}
          disabled={formatLocked}
        >
          {FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Rules"
        htmlFor="rules"
        hint="Optional. Ruleset, region, special restrictions — anything captains should know."
        error={fieldErrors?.rules}
      >
        <Textarea
          id="rules"
          name="rules"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder='e.g. "Role queue (1-2-2). NA region. No DPS Doomfist."'
        />
      </FormField>

      <FormField
        label="Map pool"
        htmlFor="mapPool"
        hint="Optional. One map per line, or any free-form list."
        error={fieldErrors?.mapPool}
      >
        <Textarea
          id="mapPool"
          name="mapPool"
          value={mapPool}
          onChange={(e) => setMapPool(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder={"King's Row\nNumbani\nIlios\n…"}
          className={cn("font-mono text-xs")}
        />
      </FormField>
    </fieldset>
  );
}

/** Quick lookup of the format label for read-only displays. */
export function formatLabel(format: MatchFormat): string {
  return FORMAT_RULES[format].label;
}
