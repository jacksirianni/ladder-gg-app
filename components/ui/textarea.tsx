import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2",
        "text-sm text-foreground placeholder:text-foreground-subtle",
        "transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
