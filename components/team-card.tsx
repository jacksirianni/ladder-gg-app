import type { PaymentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type TeamForCard = {
  id: string;
  name: string;
  paymentStatus: PaymentStatus;
  captain: { displayName: string };
  roster: { displayName: string; position: number }[];
};

type Props = {
  team: TeamForCard;
  showPayment: boolean;
};

const paymentVariant: Record<PaymentStatus, "neutral" | "success" | "warning"> =
  {
    PENDING: "neutral",
    PAID: "success",
    REFUNDED: "warning",
  };

const paymentLabel: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

export function TeamCard({ team, showPayment }: Props) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{team.name}</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Captain:{" "}
            <span className="text-foreground">{team.captain.displayName}</span>
          </p>
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
