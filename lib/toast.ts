import "server-only";
import { cookies } from "next/headers";
import {
  TOAST_COOKIE_NAME,
  type FlashToast,
  type ToastKind,
} from "@/lib/toast-shared";

/**
 * v1.8: cookie-based flash toast. The Server Action writes a short-lived
 * non-HttpOnly cookie; the client `<Toaster>` reads + clears it on next
 * render and shows it for ~3 seconds.
 *
 * Shared types live in `lib/toast-shared.ts` so the client component
 * can import them without dragging in `next/headers` (server-only).
 */

const MAX_AGE_SECONDS = 5;

export type { FlashToast, ToastKind };
export { TOAST_COOKIE_NAME };

/**
 * Set a flash toast cookie. Call from a Server Action right before the
 * implicit response. Next render of any client component reading
 * `document.cookie` will see and consume it.
 */
export async function setFlashToast(toast: FlashToast): Promise<void> {
  const id = toast.id ?? Math.random().toString(36).slice(2, 10);
  const payload = JSON.stringify({ ...toast, id });
  const store = await cookies();
  store.set({
    name: TOAST_COOKIE_NAME,
    value: payload,
    maxAge: MAX_AGE_SECONDS,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}
