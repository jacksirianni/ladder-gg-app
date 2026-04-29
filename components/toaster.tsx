"use client";

import { useEffect, useState } from "react";
import { TOAST_COOKIE_NAME, type FlashToast } from "@/lib/toast-shared";
import { cn } from "@/lib/cn";

/**
 * v1.8: floating toast renderer. Reads the `ladder_toast` cookie on
 * mount, displays the toast for ~3 seconds, and clears the cookie so
 * subsequent renders don't re-show it.
 *
 * Lives at the layout level so any page navigation surfaces a toast
 * if one was set during the previous Server Action.
 */
export function Toaster() {
  const [toast, setToast] = useState<FlashToast | null>(null);

  // Read once on mount. The set-state-in-effect rule fires here, but
  // this is the textbook "subscribe to external system on mount" use
  // case — `document.cookie` is the external system, and we set state
  // exactly once based on its value. Disabling locally with rationale.
  useEffect(() => {
    const raw = readCookie(TOAST_COOKIE_NAME);
    if (!raw) return;
    // Clear immediately so a back-button or revalidation doesn't replay it.
    document.cookie = `${TOAST_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
    let parsed: FlashToast | null = null;
    try {
      parsed = JSON.parse(decodeURIComponent(raw)) as FlashToast;
    } catch {
      return;
    }
    if (!parsed?.message) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToast(parsed);
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div
        className={cn(
          "pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur-sm",
          KIND_CLASS[toast.kind] ?? KIND_CLASS.info,
        )}
      >
        {toast.message}
      </div>
    </div>
  );
}

const KIND_CLASS: Record<FlashToast["kind"], string> = {
  success: "border-success/40 bg-success/15 text-success",
  info: "border-primary/40 bg-primary/15 text-primary",
  warning: "border-warning/40 bg-warning/15 text-warning",
  error: "border-destructive/40 bg-destructive/15 text-destructive",
};

/** Tiny cookie reader — avoids pulling in a parser dep. */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}
