import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  /** Display text. Usually the user's displayName. */
  children: React.ReactNode;
  /** The user's URL handle. If null, render as plain text (no link). */
  handle: string | null | undefined;
  /** Optional className override. */
  className?: string;
};

/**
 * Wraps a display name in a link to the user's `/p/[handle]` profile.
 *
 * Falls back to plain text if the user has no handle (shouldn't happen
 * after backfill, but defensive). Used wherever we surface a captain
 * name — public league page, champion hero, recap, season hall, match
 * share, etc.
 */
export function ProfileLink({ children, handle, className }: Props) {
  if (!handle) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link
      href={`/p/${handle}`}
      className={cn(
        "rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {children}
    </Link>
  );
}
