// v1.8: client-safe constants + types for the flash-toast system.
// `lib/toast.ts` imports `next/headers` and is server-only; the
// `<Toaster>` client component pulls in only this module.

export const TOAST_COOKIE_NAME = "ladder_toast";

export type ToastKind = "success" | "info" | "warning" | "error";

export type FlashToast = {
  kind: ToastKind;
  message: string;
  /** Optional unique id so the same payload doesn't render twice if the
   *  cookie roundtrips through another revalidation. Auto-set if omitted. */
  id?: string;
};
