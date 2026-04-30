import type { ReactNode } from "react";

/**
 * v3.0: Section header for the dashboard. Larger and louder than the
 * uppercase mono labels we use elsewhere — these break up the page
 * into clearly-named bands ("On Deck", "Organizing", "Trophy case").
 *
 * Optional `count` shows in mono parens for at-a-glance density;
 * optional `action` slot renders right-aligned (used for "see all"
 * affordances).
 */
export function SectionTitle({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="font-mono text-xs tracking-wider text-foreground-subtle">
            ({count})
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
