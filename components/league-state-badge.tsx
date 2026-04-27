import type { LeagueState } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const labels: Record<LeagueState, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const variants: Record<
  LeagueState,
  "neutral" | "info" | "primary" | "success" | "destructive"
> = {
  DRAFT: "neutral",
  OPEN: "info",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export function LeagueStateBadge({ state }: { state: LeagueState }) {
  return <Badge variant={variants[state]}>{labels[state]}</Badge>;
}
