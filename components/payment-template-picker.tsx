"use client";

import { cn } from "@/lib/cn";

type Template = {
  id: string;
  label: string;
  text: string;
};

const TEMPLATES: Template[] = [
  {
    id: "venmo",
    label: "Venmo",
    text:
      "Venmo @your-handle. Send the entry fee with the league name in the note. Mark me when you've paid so I can verify.",
  },
  {
    id: "cashapp",
    label: "Cash App",
    text:
      "Cash App $your-handle. Send the entry fee with the league name in the note. Mark me when you've paid so I can verify.",
  },
  {
    id: "zelle",
    label: "Zelle",
    text:
      "Zelle to your@email.com. Send the entry fee and reply with a screenshot or note so I can verify.",
  },
  {
    id: "paypal",
    label: "PayPal",
    text:
      "PayPal to paypal.me/your-handle (Friends & Family). Send the entry fee and reply when you're paid.",
  },
  {
    id: "cash",
    label: "Cash in person",
    text: "Bring cash to the first match. I'll mark you paid once I get it.",
  },
];

type Props = {
  /** Called with the template's text when a template is clicked. */
  onSelect: (text: string) => void;
};

/**
 * A small row of payment-method chips. Clicking one calls `onSelect` with a
 * paste-able instructions string. Used to seed the payment-instructions
 * textarea on the create/edit league forms.
 *
 * Templates are intentionally short and editable — the user is expected to
 * swap in their own handle.
 */
export function PaymentTemplatePicker({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
        Templates:
      </span>
      {TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          onClick={() => onSelect(tpl.text)}
          className={cn(
            "rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs",
            "text-foreground-muted transition-colors",
            "hover:border-zinc-600 hover:bg-surface-elevated hover:text-foreground",
          )}
        >
          {tpl.label}
        </button>
      ))}
    </div>
  );
}
