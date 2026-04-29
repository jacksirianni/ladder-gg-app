import type { EvidenceKind } from "@prisma/client";
import { ProfileLink } from "@/components/profile-link";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/cn";

const KIND_LABEL: Record<EvidenceKind, string> = {
  SCREENSHOT: "Screenshot",
  VOD_LINK: "VOD",
  REPLAY_CODE: "Replay code",
  MATCH_LINK: "Match link",
  PROFILE_LINK: "Profile",
  NOTE: "Note",
};

const KIND_CLASS: Record<EvidenceKind, string> = {
  SCREENSHOT: "border-primary/30 bg-primary/5 text-primary",
  VOD_LINK: "border-primary/30 bg-primary/5 text-primary",
  REPLAY_CODE: "border-success/30 bg-success/5 text-success",
  MATCH_LINK: "border-primary/30 bg-primary/5 text-primary",
  PROFILE_LINK: "border-border bg-surface text-foreground-muted",
  NOTE: "border-border bg-surface text-foreground-muted",
};

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  url: string | null;
  textValue: string | null;
  caption: string | null;
  createdAt: Date | string;
  user: {
    displayName: string;
    handle: string | null;
  };
};

type Props = {
  items: EvidenceItem[];
  /** When true, show the submitter as a separate sub-line under each
   *  item — used in dispute / resolution UIs where attribution matters. */
  showSubmitter?: boolean;
  /** Optional className for the container. */
  className?: string;
  /** Optional empty-state copy (omit to render nothing if empty). */
  emptyMessage?: string;
};

/**
 * Read-only display of evidence rows. Used on the match share page,
 * the recap page (sparingly), and the manage disputes section. Links
 * always open in a new tab with `noopener noreferrer nofollow`.
 *
 * No `<img>` embeds — screenshots render as links. Avoids content
 * security and privacy issues from arbitrary external image hosts.
 */
export function EvidenceList({
  items,
  showSubmitter,
  className,
  emptyMessage,
}: Props) {
  if (items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <p className={cn("text-xs text-foreground-subtle", className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                KIND_CLASS[item.kind],
              )}
            >
              {KIND_LABEL[item.kind]}
            </span>
            <EvidenceValue item={item} />
          </div>
          {item.caption && (
            <p className="mt-1.5 text-xs text-foreground-muted">
              {item.caption}
            </p>
          )}
          {showSubmitter && (
            <p className="mt-1.5 text-[11px] text-foreground-subtle">
              by{" "}
              <ProfileLink
                handle={item.user.handle}
                className="text-foreground-muted"
              >
                {item.user.displayName}
              </ProfileLink>{" "}
              · {formatRelativeTime(item.createdAt)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function EvidenceValue({ item }: { item: EvidenceItem }) {
  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="min-w-0 truncate text-foreground-muted underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        {item.url}
      </a>
    );
  }
  if (item.textValue) {
    if (item.kind === "REPLAY_CODE") {
      return (
        <code className="rounded-sm bg-surface-elevated px-2 py-0.5 font-mono text-foreground">
          {item.textValue}
        </code>
      );
    }
    return <span className="text-foreground-muted">{item.textValue}</span>;
  }
  return <span className="text-foreground-subtle">(empty)</span>;
}
