import { cn } from "@/lib/cn";

type Props = {
  /** Whether the badge is visible — driven by `shouldShowLookingForTeams`
   *  in the parent. The component itself doesn't gate; it only renders. */
  spotsRemaining: number;
  className?: string;
};

/**
 * Green "Looking for teams · N spots left" badge. Renders nothing when
 * `spotsRemaining <= 0` so callers can drop it in unconditionally and
 * have the gating live in one place upstream.
 */
export function LookingForTeamsBadge({ spotsRemaining, className }: Props) {
  if (spotsRemaining <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-2.5 py-1 font-mono text-xs text-success",
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
      <span>
        Looking for teams · {spotsRemaining} spot
        {spotsRemaining === 1 ? "" : "s"} left
      </span>
    </span>
  );
}
