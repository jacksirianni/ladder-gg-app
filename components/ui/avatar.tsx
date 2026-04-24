import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = ComponentProps<"span"> & {
  name: string;
  size?: AvatarSize;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  return (
    <span
      aria-label={name}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "bg-primary/20 font-semibold text-primary",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {getInitials(name)}
    </span>
  );
}
