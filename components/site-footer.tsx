import Link from "next/link";

const FEEDBACK_EMAIL = "jacksirianni@icloud.com";

/**
 * Slim site-wide footer. Used on every page that mounts SiteHeader.
 *
 * Carries a feedback mailto link (zero-infra way to learn from real users)
 * plus the legal links and copyright. The landing page renders its own
 * heavier footer; we don't include this there.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const subject = encodeURIComponent("LADDER.gg feedback");
  const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${subject}`;

  return (
    <footer className="mt-16 border-t border-border bg-surface/30">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 md:px-12">
        <p className="font-mono text-xs text-foreground-subtle">
          © {year} LADDER.gg
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-4 text-xs"
        >
          <a
            href={mailto}
            className="text-foreground-muted transition-colors hover:text-foreground"
          >
            Feedback
          </a>
          <Link
            href="/legal/privacy"
            className="text-foreground-muted transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/legal/terms"
            className="text-foreground-muted transition-colors hover:text-foreground"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
