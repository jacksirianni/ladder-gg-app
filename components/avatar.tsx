import { cn } from "@/lib/cn";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

type Props = {
  /** Avatar image URL. If null/undefined we render initials only. */
  src?: string | null;
  /** Display name — used for the initials fallback and the alt text. */
  name: string;
  size?: Size;
  className?: string;
};

const SIZE_CLASS: Record<Size, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

const SIZE_PX: Record<Size, number> = {
  xs: 20,
  sm: 24,
  md: 36,
  lg: 56,
  xl: 96,
};

/**
 * v2.0: tiny avatar primitive. Renders a circular `<img>` if `src` is
 * provided; otherwise a circle with initials derived from `name`.
 *
 * No external dependency — Vercel Blob URLs work directly with `<img>`.
 * For consistency with the rest of the app we use the native element
 * rather than next/image (Vercel Blob URLs are public, varied, and we
 * don't need optimization in v2.0; revisit if image traffic spikes).
 */
export function Avatar({ src, name, size = "md", className }: Props) {
  const initials = getInitials(name);
  const px = SIZE_PX[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={px}
        height={px}
        className={cn(
          "shrink-0 rounded-full object-cover",
          SIZE_CLASS[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated font-mono font-semibold uppercase text-foreground-muted",
        SIZE_CLASS[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** "Lower East Lions" → "LL"; "Jack" → "J". Up to 2 chars. */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
