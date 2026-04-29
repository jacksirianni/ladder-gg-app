import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  /** Where to redirect back to after sign-in. */
  redirectTo: string;
};

/**
 * Small banner shown to unauthenticated viewers on a public league page.
 * Pitches LADDER in one line and offers a sign-in CTA that returns them
 * to the same page.
 *
 * v1.4 keeps this purposefully gentle — we don't have a "follow league
 * without account" path yet, so the CTA is just a softer signup hook.
 */
export function ViewerCta({ redirectTo }: Props) {
  const signInHref = `/signin?redirectTo=${encodeURIComponent(redirectTo)}`;
  const signUpHref = `/signup?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <aside
      className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-5 py-4"
      aria-label="Sign in to LADDER.gg"
    >
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
          New to LADDER?
        </p>
        <p className="mt-1 text-sm text-foreground-muted">
          Run your own bracket for a friend group, dorm, or work crew. Free
          while we&apos;re in beta.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href={signInHref}>Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={signUpHref}>Sign up</Link>
        </Button>
      </div>
    </aside>
  );
}
