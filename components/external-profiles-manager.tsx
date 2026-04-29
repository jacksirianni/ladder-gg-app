"use client";

import { useActionState, useState } from "react";
import type { ExternalPlatform } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  deleteExternalProfileAction,
  saveExternalProfileAction,
  type ExternalProfileActionState,
} from "@/app/account/actions";

type ExistingProfile = {
  platform: ExternalPlatform;
  identifier: string | null;
  url: string | null;
  label: string | null;
};

type Props = {
  profiles: ExistingProfile[];
};

const PLATFORM_OPTIONS: {
  value: ExternalPlatform;
  label: string;
  /** Whether this platform is identifier-based (BattleTag, Riot ID) or
   *  primarily URL-based. Drives placeholder + helper copy. */
  primary: "identifier" | "url" | "either";
  identifierPlaceholder?: string;
  urlPlaceholder?: string;
  helper: string;
}[] = [
  {
    value: "BATTLENET",
    label: "Battle.net",
    primary: "identifier",
    identifierPlaceholder: "Tracer#1234",
    helper: "Your BattleTag, including the discriminator (#1234).",
  },
  {
    value: "TRACKER_GG",
    label: "Tracker.gg",
    primary: "url",
    urlPlaceholder: "https://overwatch.tracker.network/profile/pc/Tracer-1234",
    helper: "Your Tracker.gg profile URL for any supported game.",
  },
  {
    value: "STEAM",
    label: "Steam",
    primary: "either",
    identifierPlaceholder: "your-steam-id",
    urlPlaceholder: "https://steamcommunity.com/id/yourname",
    helper: "Steam ID or full profile URL.",
  },
  {
    value: "RIOT_ID",
    label: "Riot ID",
    primary: "identifier",
    identifierPlaceholder: "GameName#TAG",
    helper: "Your Riot ID — covers Valorant, League, TFT, Wild Rift.",
  },
  {
    value: "EPIC",
    label: "Epic",
    primary: "identifier",
    identifierPlaceholder: "your-epic-display-name",
    helper: "Epic display name (Fortnite, Rocket League, Fall Guys).",
  },
  {
    value: "XBOX",
    label: "Xbox",
    primary: "identifier",
    identifierPlaceholder: "Your gamertag",
    helper: "Xbox Live gamertag.",
  },
  {
    value: "PSN",
    label: "PSN",
    primary: "identifier",
    identifierPlaceholder: "your-psn-id",
    helper: "PlayStation Network online ID.",
  },
  {
    value: "NINTENDO",
    label: "Nintendo",
    primary: "identifier",
    identifierPlaceholder: "SW-XXXX-XXXX-XXXX",
    helper: "Nintendo Switch friend code.",
  },
  {
    value: "OTHER",
    label: "Other",
    primary: "either",
    identifierPlaceholder: "Whatever ID people use to find you",
    urlPlaceholder: "https://...",
    helper:
      "For platforms not in the list. Provide whichever value people use to find you.",
  },
];

const PLATFORM_BY_VALUE = new Map(PLATFORM_OPTIONS.map((p) => [p.value, p]));

const initialState: ExternalProfileActionState = {};

export function ExternalProfilesManager({ profiles }: Props) {
  // Add-form state.
  const [addOpen, setAddOpen] = useState(false);
  const [platform, setPlatform] = useState<ExternalPlatform>("BATTLENET");

  // Profiles already linked, derive which platforms aren't taken yet so
  // the dropdown only shows available options when adding.
  const takenPlatforms = new Set(profiles.map((p) => p.platform));
  const availableForAdd = PLATFORM_OPTIONS.filter(
    (p) => !takenPlatforms.has(p.value),
  );
  const platformMeta = PLATFORM_BY_VALUE.get(platform);

  // Wrap the save action so we can close the add form on success and
  // pre-select the next available platform — without the cascading-
  // render lint warning that comes from doing it in a useEffect.
  const wrappedAction = async (
    prev: ExternalProfileActionState,
    formData: FormData,
  ): Promise<ExternalProfileActionState> => {
    const result = await saveExternalProfileAction(prev, formData);
    if (result.success) {
      setAddOpen(false);
      const remaining = PLATFORM_OPTIONS.filter(
        (p) => p.value !== platform && !takenPlatforms.has(p.value),
      );
      if (remaining.length > 0) setPlatform(remaining[0].value);
    }
    return result;
  };
  const [state, action, pending] = useActionState(
    wrappedAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      {profiles.length === 0 && !addOpen && (
        <p className="text-sm text-foreground-muted">
          No linked profiles yet. Add your BattleTag, Tracker.gg URL,
          Riot ID, or anything else captains use to find you in-game.
        </p>
      )}

      {profiles.length > 0 && (
        <ul className="flex flex-col gap-2">
          {profiles.map((p) => {
            const meta = PLATFORM_BY_VALUE.get(p.platform);
            const value =
              p.identifier ?? p.url ?? "(empty)";
            return (
              <li
                key={p.platform}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">
                      {meta?.label ?? p.platform}
                    </span>
                    {p.label && (
                      <span className="text-xs text-foreground-subtle">
                        {p.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-foreground">
                    {value}
                  </p>
                </div>
                <form action={deleteExternalProfileAction}>
                  <input type="hidden" name="platform" value={p.platform} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {addOpen && availableForAdd.length > 0 && (
        <form
          action={action}
          className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
        >
          <FormField
            label="Platform"
            htmlFor="platform"
            error={state.fieldErrors?.platform}
          >
            <Select
              id="platform"
              name="platform"
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value as ExternalPlatform)
              }
            >
              {availableForAdd.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>

          {platformMeta?.primary !== "url" && (
            <FormField
              label="Identifier"
              htmlFor="identifier"
              hint={
                platformMeta?.primary === "identifier"
                  ? "Required for this platform."
                  : "Optional if you provide a URL below."
              }
              error={
                state.fieldErrors?.identifier
              }
            >
              <Input
                id="identifier"
                name="identifier"
                placeholder={platformMeta?.identifierPlaceholder}
                maxLength={64}
              />
            </FormField>
          )}

          {platformMeta?.primary !== "identifier" && (
            <FormField
              label="URL"
              htmlFor="url"
              hint={
                platformMeta?.primary === "url"
                  ? "Required for this platform."
                  : "Optional if you provide an identifier above."
              }
              error={state.fieldErrors?.url}
            >
              <Input
                id="url"
                name="url"
                type="url"
                placeholder={platformMeta?.urlPlaceholder}
                maxLength={500}
              />
            </FormField>
          )}

          <FormField
            label="Label (optional)"
            htmlFor="label"
            hint="Short note like 'main account' or 'support stack'."
            error={state.fieldErrors?.label}
          >
            <Input id="label" name="label" maxLength={40} />
          </FormField>

          {platformMeta?.helper && (
            <p className="text-xs text-foreground-subtle">
              {platformMeta.helper}
            </p>
          )}

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      {!addOpen && availableForAdd.length > 0 && (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setAddOpen(true);
              if (availableForAdd.length > 0)
                setPlatform(availableForAdd[0].value);
            }}
          >
            + Add a linked profile
          </Button>
        </div>
      )}

      <p className="text-xs text-foreground-subtle">
        Display only — LADDER doesn&apos;t verify these or call any
        platform&apos;s API. They show on your public profile so captains
        can find you in-game.
      </p>
    </div>
  );
}
