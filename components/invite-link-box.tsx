"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  url: string;
  className?: string;
};

export function InviteLinkBox({ url, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable; no-op
    }
  }

  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-md border border-border bg-surface",
        className,
      )}
    >
      <code className="min-w-0 flex-1 truncate px-3 py-2 font-mono text-sm text-foreground-muted">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="shrink-0 border-l border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
