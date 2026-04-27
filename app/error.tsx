"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("App error boundary caught:", error);
    }
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-12 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        Error
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Something went wrong.
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        An unexpected error occurred. You can try again or head back to the
        home page.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-foreground-subtle">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
