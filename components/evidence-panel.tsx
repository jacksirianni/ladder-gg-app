"use client";

import { useRef, useState } from "react";
import type { EvidenceKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

const MAX_ROWS = 6;

const KIND_OPTIONS: {
  value: EvidenceKind;
  label: string;
  /** Whether the field expects a URL (otherwise free text). */
  isUrl: boolean;
  placeholder: string;
  helper: string;
}[] = [
  {
    value: "SCREENSHOT",
    label: "Screenshot",
    isUrl: true,
    placeholder: "https://imgur.com/a/... or any image host",
    helper: "Paste a URL to your scoreboard image (imgur, etc.).",
  },
  {
    value: "VOD_LINK",
    label: "VOD link",
    isUrl: true,
    placeholder: "https://twitch.tv/... or https://youtube.com/...",
    helper: "Twitch / YouTube / any video host.",
  },
  {
    value: "REPLAY_CODE",
    label: "Replay code",
    isUrl: false,
    placeholder: "e.g. AB12C",
    helper: "Game-internal replay ID (Overwatch, Smash, Rocket League).",
  },
  {
    value: "MATCH_LINK",
    label: "Match link",
    isUrl: true,
    placeholder: "https://tracker.gg/... or https://op.gg/...",
    helper: "Tracker.gg / OP.gg / Blitz / any aggregator match URL.",
  },
  {
    value: "PROFILE_LINK",
    label: "Profile link",
    isUrl: true,
    placeholder: "https://overwatch.tracker.network/profile/...",
    helper: "Tracker.gg or other profile URL of one of the players.",
  },
  {
    value: "NOTE",
    label: "Note",
    isUrl: false,
    placeholder: "Anything captains/organizer should know",
    helper: "Free text. Use for context, timestamps, or other details.",
  },
];

const KIND_BY_VALUE = new Map(KIND_OPTIONS.map((k) => [k.value, k]));

export type EvidenceRow = {
  kind: EvidenceKind;
  url: string;
  textValue: string;
  caption: string;
};

function makeEmpty(kind: EvidenceKind = "SCREENSHOT"): EvidenceRow {
  return { kind, url: "", textValue: "", caption: "" };
}

type Props = {
  /** Optional initial rows for re-rendering after a server-action error. */
  defaults?: EvidenceRow[];
  /** Banner copy for the panel. */
  description?: string;
  /** Compact form — used inside the dispute affordance. */
  compact?: boolean;
};

/**
 * Reusable evidence-attachment fieldset. Renders a list of up to 6
 * evidence rows; each row is a kind dropdown + url-or-text input +
 * optional caption.
 *
 * Rows submit as JSON-encoded strings under the `evidence` form key.
 * The server action calls `parseEvidenceRowsFromForm(formData.getAll(
 * "evidence").map(String))` to read them back.
 */
export function EvidencePanel({ defaults, description, compact }: Props) {
  const [rows, setRows] = useState<EvidenceRow[]>(defaults ?? []);

  const update = (i: number, patch: Partial<EvidenceRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const remove = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };
  const add = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [...prev, makeEmpty()]);
  };

  return (
    <fieldset
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border bg-surface/40 p-4",
        compact && "p-3",
      )}
    >
      <legend className="px-1 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        Evidence
      </legend>
      {description && (
        <p className="text-xs text-foreground-muted">{description}</p>
      )}

      {rows.length === 0 && (
        <p className="text-xs text-foreground-subtle">
          No evidence attached. Optional — add a replay code, screenshot,
          VOD, or other context if there&apos;s any chance of dispute.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => {
          const kindMeta = KIND_BY_VALUE.get(row.kind)!;
          const valueField = kindMeta.isUrl ? "url" : "textValue";
          const valueValue = row[valueField];
          // Each row is serialized to JSON for the form submission.
          // Empty rows (no value) are dropped server-side.
          const serialized =
            valueValue.trim().length === 0
              ? ""
              : JSON.stringify({
                  kind: row.kind,
                  url: kindMeta.isUrl ? row.url.trim() : "",
                  textValue: kindMeta.isUrl ? "" : row.textValue.trim(),
                  caption: row.caption.trim(),
                });

          return (
            <li
              key={i}
              className="rounded-md border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start gap-2">
                <Select
                  value={row.kind}
                  onChange={(e) =>
                    update(i, { kind: e.target.value as EvidenceKind })
                  }
                  aria-label="Evidence kind"
                  className="w-auto"
                >
                  {KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Input
                  value={valueValue}
                  onChange={(e) =>
                    update(i, { [valueField]: e.target.value } as Partial<EvidenceRow>)
                  }
                  placeholder={kindMeta.placeholder}
                  className="min-w-0 flex-1"
                  type={kindMeta.isUrl ? "url" : "text"}
                  maxLength={500}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                  aria-label="Remove evidence row"
                >
                  Remove
                </Button>
              </div>
              {/* v1.8: native upload for SCREENSHOT rows — file picker
                  uploads to /api/upload-evidence and writes the
                  returned URL into the row's `url` field. */}
              {row.kind === "SCREENSHOT" && (
                <ScreenshotUploader
                  onUploaded={(url) => update(i, { url })}
                />
              )}
              <Input
                value={row.caption}
                onChange={(e) => update(i, { caption: e.target.value })}
                placeholder="Caption (optional)"
                className="mt-2"
                maxLength={100}
              />
              <p className="mt-2 text-[11px] text-foreground-subtle">
                {kindMeta.helper}
              </p>
              {/* Hidden serialized payload — what the server reads. */}
              {serialized && (
                <input type="hidden" name="evidence" value={serialized} />
              )}
            </li>
          );
        })}
      </ul>

      {rows.length < MAX_ROWS && (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={add}
          >
            + Add evidence
          </Button>
          <span className="ml-2 text-xs text-foreground-subtle">
            {rows.length}/{MAX_ROWS}
          </span>
        </div>
      )}
    </fieldset>
  );
}

/**
 * v1.8: a small file-picker affordance that uploads to
 * /api/upload-evidence and reports back the resulting URL. Renders
 * inline next to the URL input so captains can drag-or-pick instead of
 * pasting an imgur link.
 */
function ScreenshotUploader({
  onUploaded,
}: {
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-evidence", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Upload failed.");
        return;
      }
      onUploaded(json.url);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setPending(false);
      // Reset the input so re-selecting the same file fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        {pending ? "Uploading…" : "Upload image"}
      </Button>
      <span className="font-mono text-[11px] text-foreground-subtle">
        or paste a URL above
      </span>
      {error && (
        <span className="font-mono text-[11px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
