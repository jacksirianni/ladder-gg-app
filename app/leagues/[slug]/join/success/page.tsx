import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NextSteps } from "@/components/next-steps";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Team registered",
  robots: { index: false, follow: false },
};

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

  const hasEntryFee = team.league.buyInCents > 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        {/* v1.4: success card + payment + next-steps + CTA hierarchy */}
        <Card>
          <p className="font-mono text-xs uppercase tracking-widest text-success">
            Registered
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {team.name} is in {team.league.name}.
          </h1>
          <p className="mt-2 text-foreground-muted">
            You&apos;re the captain. You&apos;ll get notified on your dashboard
            when matches need your attention.
          </p>

          {hasEntryFee && (
            <div className="mt-6 rounded-md border border-warning/40 bg-warning/5 px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-widest text-warning">
                Action needed: pay entry fee
              </p>
              <p className="mt-2 text-sm">
                Entry fee:{" "}
                <span className="font-semibold">
                  ${(team.league.buyInCents / 100).toFixed(2)}
                </span>
                . Your team is currently{" "}
                <span className="font-semibold">PENDING</span> and moves to PAID
                once the organizer confirms your payment.
              </p>
              {team.league.paymentInstructions ? (
                <div className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                    Organizer&apos;s payment instructions
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">
                    {team.league.paymentInstructions}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-foreground-muted">
                  The organizer hasn&apos;t added payment instructions yet.
                  Reach out to them directly to coordinate.
                </p>
              )}
            </div>
          )}
        </Card>

        <NextSteps
          className="mt-6"
          eyebrow="What happens next"
          steps={[
            {
              title: "Team registered",
              body: `${team.name} is signed up.`,
              done: true,
            },
            {
              title: hasEntryFee
                ? "Pay the entry fee"
                : "Wait for the bracket",
              body: hasEntryFee
                ? "Use the organizer's instructions above. They'll mark you paid once it goes through."
                : "Once the organizer starts the league, your matches will appear on your dashboard.",
              current: hasEntryFee,
            },
            {
              title: "Bracket starts",
              body: "When the organizer starts the league, you'll see your first match on the dashboard.",
            },
            {
              title: "Report your matches",
              body: "Submit the result; the other captain confirms. Track everything from the league page.",
            },
          ]}
        />

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/leagues/${slug}`}>View league</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
