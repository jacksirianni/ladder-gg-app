import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  /** Optional className override for layout tweaks. */
  className?: string;
};

/**
 * Small pill linking back to a season's home page. Surfaced on every
 * league page (public, manage, recap) so a viewer / captain can find the
 * series this league is part of.
 */
export function SeasonPill({ slug, name, className }: Props) {
  return (
    <Link
      href={`/seasons/${slug}`}
      className={
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground-muted transition-colors hover:border-zinc-600 hover:bg-surface-elevated hover:text-foreground" +
        (className ? " " + className : "")
      }
    >
      <span
        aria-hidden
        className="text-[10px] uppercase tracking-wider text-foreground-subtle"
      >
        Season
      </span>
      <span className="truncate">{name}</span>
      <span aria-hidden className="text-foreground-subtle">
        →
      </span>
    </Link>
  );
}
