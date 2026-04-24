import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "info";

type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    "bg-surface border border-border text-foreground-muted",
  primary:
    "bg-primary/10 border border-primary/30 text-primary",
  success:
    "bg-success/10 border border-success/30 text-success",
  warning:
    "bg-warning/10 border border-warning/30 text-warning",
  destructive:
    "bg-destructive/10 border border-destructive/30 text-destructive",
  info:
    "bg-info/10 border border-info/30 text-info",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
        "font-mono text-xs font-medium uppercase tracking-wider",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
