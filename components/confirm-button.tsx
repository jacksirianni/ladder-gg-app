"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "ghost"
  | "link";
type ButtonSize = "sm" | "md" | "lg";

type Props = {
  /** Label on the button that opens the dialog. */
  triggerLabel: ReactNode;
  /** Visual style of the trigger button. */
  triggerVariant?: ButtonVariant;
  /** Size of the trigger button. */
  triggerSize?: ButtonSize;
  /** Optional aria-label for the trigger button (for icon-only buttons). */
  triggerAriaLabel?: string;
  /** Title shown in the confirmation dialog. */
  title: string;
  /** Optional explanatory paragraph shown beneath the title. */
  description?: string;
  /** Label on the confirm button inside the dialog. */
  confirmLabel?: string;
  /** Visual style of the confirm button. */
  confirmVariant?: ButtonVariant;
  /** Server action to invoke on confirm. */
  action: (formData: FormData) => void | Promise<void>;
  /** Hidden form fields to submit alongside. */
  hiddenFields?: Record<string, string>;
};

export function ConfirmButton({
  triggerLabel,
  triggerVariant = "destructive",
  triggerSize = "md",
  triggerAriaLabel,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  action,
  hiddenFields,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        aria-label={triggerAriaLabel}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <form action={action} className="mt-6">
          {Object.entries(hiddenFields ?? {}).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant={confirmVariant}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
