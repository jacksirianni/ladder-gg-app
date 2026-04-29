"use client";

import { useState } from "react";
import type { LeagueVisibility } from "@prisma/client";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type FieldErrors = Record<string, string>;

type Props = {
  /** Initial values when editing — undefined for create. */
  defaults?: {
    visibility?: LeagueVisibility;
    registrationClosesAt?: string;
    startsAt?: string;
    lookingForTeams?: boolean;
  };
  /** Field errors keyed by field name (matches schema field names). */
  fieldErrors?: FieldErrors;
};

const VISIBILITY_OPTIONS: {
  value: LeagueVisibility;
  label: string;
  helper: string;
  recommended?: boolean;
}[] = [
  {
    value: "INVITE_ONLY",
    label: "Invite only",
    helper:
      "Captains need an invite link from you to register. The public page works for anyone with the URL but isn't promoted.",
  },
  {
    value: "UNLISTED",
    label: "Unlisted",
    helper:
      "Anyone can view the public page. Captains still need an invite link to register a team.",
    recommended: true,
  },
  {
    value: "OPEN_JOIN",
    label: "Open registration",
    helper:
      "Anyone signed in can register from the public page while spots are open. No invite link needed.",
  },
];

/**
 * Shared "Registration & Access" form section used by the create-league
 * form and the edit-modal. Handles visibility, registration deadline,
 * scheduled start, and the looking-for-teams toggle.
 *
 * Fields submit via standard form names so the parent's existing
 * `<form action={...}>` server action picks them up — no JS plumbing.
 */
export function RegistrationAccessFields({
  defaults,
  fieldErrors,
}: Props) {
  const [visibility, setVisibility] = useState<LeagueVisibility>(
    defaults?.visibility ?? "UNLISTED",
  );

  return (
    <fieldset className="flex flex-col gap-5 rounded-lg border border-border bg-surface/40 p-5">
      <legend className="px-1 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        Registration &amp; Access
      </legend>

      <FormField
        label="Visibility"
        htmlFor="visibility-UNLISTED"
        hint="Choose how captains can join."
        error={fieldErrors?.visibility}
      >
        <div role="radiogroup" className="flex flex-col gap-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const id = `visibility-${opt.value}`;
            const active = visibility === opt.value;
            return (
              <label
                key={opt.value}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-surface hover:border-zinc-600",
                )}
              >
                <input
                  type="radio"
                  id={id}
                  name="visibility"
                  value={opt.value}
                  checked={active}
                  onChange={() => setVisibility(opt.value)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {opt.label}
                    {opt.recommended && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                        recommended
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {opt.helper}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          label="Registration closes"
          htmlFor="registrationClosesAt"
          hint="Optional. Captains can't register after this. Leave blank for no deadline."
          error={fieldErrors?.registrationClosesAt}
        >
          <Input
            id="registrationClosesAt"
            name="registrationClosesAt"
            type="datetime-local"
            defaultValue={defaults?.registrationClosesAt ?? ""}
          />
        </FormField>

        <FormField
          label="Scheduled start"
          htmlFor="startsAt"
          hint="Optional. When you plan to start the bracket. Informational only — you can start earlier."
          error={fieldErrors?.startsAt}
        >
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={defaults?.startsAt ?? ""}
          />
        </FormField>
      </div>

      <p className="font-mono text-[11px] text-foreground-subtle">
        Times are in your local time zone.
      </p>

      <FormField
        label="Looking for teams"
        htmlFor="lookingForTeams"
        hint="Surfaces a green badge on your public page when there are open spots. Auto-hides once you fill up or registration closes."
        error={fieldErrors?.lookingForTeams}
      >
        <label
          htmlFor="lookingForTeams"
          className="inline-flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type="checkbox"
            id="lookingForTeams"
            name="lookingForTeams"
            defaultChecked={defaults?.lookingForTeams ?? false}
            className="h-4 w-4 accent-primary"
          />
          <span>Show &quot;Looking for teams&quot; on the public page</span>
        </label>
      </FormField>
    </fieldset>
  );
}

/**
 * Convert a Prisma Date (or null) into the value attribute format
 * expected by `<input type="datetime-local">` (`YYYY-MM-DDTHH:MM`).
 *
 * The browser interprets the value as local time, which matches how
 * the form submits. Round-tripping through this helper preserves the
 * organizer's wall-clock intent without any timezone gymnastics.
 */
export function toDatetimeLocalValue(date: Date | null | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
