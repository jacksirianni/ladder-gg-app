import Link from "next/link";
import type { PaymentStatus } from "@prisma/client";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProfileLink } from "@/components/profile-link";

type TeamForCard = {
  id: string;
  name: string;
  paymentStatus: PaymentStatus;
  captain: {
    displayName: string;
    handle?: string | null;
    avatarUrl?: string | null;
  };
  roster: { displayName: string; position: number }[];
};

type Props = {
  team: TeamForCard;
  showPayment: boolean;
  /** v1.8: when set, team name links to the per-team page. */
  leagueSlug?: string;
};

const paymentVariant: Record<
  PaymentStatus,
  "neutral" | "success" | "info" | "warning"
> = {
  PENDING: "neutral",
  PAID: "success",
  WAIVED: "info",
  REFUNDED: "warning",
};

const paymentLabel: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  WAIVED: "Waived",
  REFUNDED: "Refunded",
};

export function TeamCard({ team, showPayment, leagueSlug }: Props) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">
            {leagueSlug ? (
              <Link
                href={`/leagues/${leagueSlug}/teams/${team.id}`}
                className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {team.name}
              </Link>
            ) : (
              team.name
            )}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-foreground-muted">
            <span>Captain:</span>
            <Avatar
              src={team.captain.avatarUrl}
              name={team.captain.displayName}
              size="xs"
            />
            <ProfileLink handle={team.captain.handle} className="text-foreground">
              {team.captain.displayName}
            </ProfileLink>
          </div>
        </div>
        {showPayment && (
          <Badge variant={paymentVariant[team.paymentStatus]}>
            {paymentLabel[team.paymentStatus]}
          </Badge>
        )}
      </div>
      {team.roster.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {team.roster.map((entry) => (
            <li
              key={entry.position}
              className="rounded-sm border border-border bg-surface-elevated px-2 py-1 text-xs text-foreground-muted"
            >
              {entry.displayName}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
