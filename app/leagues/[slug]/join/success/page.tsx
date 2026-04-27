import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ team?: string }>;
};

export default async function JoinSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { team: teamId } = await searchParams;

  const session = await auth();
  if (!session?.user) redirect("/signin");

  if (!teamId) notFound();

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { league: true },
  });
  if (!team || team.captainUserId !== session.user.id) notFound();
  if (team.league.slug !== slug) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        <Card>
          <h1 className="text-2xl font-semibold tracking-tight">
            Team registered.
          </h1>
          <p className="mt-2 text-foreground-muted">
            <span className="text-foreground">{team.name}</span> is in{" "}
            <span className="text-foreground">{team.league.name}</span>.
          </p>

          <div className="mt-6 rounded-md border border-dashed border-border bg-surface-elevated/40 px-4 py-3">
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Payment goes here in M5
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              Your team is currently{" "}
              <span className="font-semibold text-foreground">PENDING</span>.
              Once Stripe Checkout is wired up, the captain will pay{" "}
              <span className="font-mono">
                ${(team.league.buyInCents / 100).toFixed(2)}
              </span>{" "}
              here and the team will move to PAID.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/leagues/${slug}`}>View league</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </Card>
      </main>
    </>
  );
}
