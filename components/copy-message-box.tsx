"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  /** The full text that will be copied to the clipboard. */
  message: string;
  /** Optional preview to render. Defaults to `message`. */
  preview?: string;
  className?: string;
  /** Label shown on the copy button before / after. */
  copyLabel?: string;
  copiedLabel?: string;
};

export function CopyMessageBox({
  message,
  preview,
  className,
  copyLabel = "Copy message",
  copiedLabel = "Copied!",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable; no-op
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2.5",
        className,
      )}
    >
      <pre
        className="whitespace-pre-wrap break-words font-mono text-xs text-foreground-muted"
        style={{ margin: 0 }}
      >
        {preview ?? message}
      </pre>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
