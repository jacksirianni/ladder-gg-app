import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

type CardProps = ComponentProps<"div"> & {
  interactive?: boolean;
};

export function Card({
  className,
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-6",
        interactive &&
          "cursor-pointer transition-colors hover:bg-surface-elevated hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    />
  );
}
