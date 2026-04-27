import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

const steps = [
  {
    n: "01",
    title: "Organizer sets up",
    body: "Choose the game, team size, entry fee, and prize split. Share an invite link with your captains.",
  },
  {
    n: "02",
    title: "Captains register and play",
    body: "Teams sign up through the link and play their matches on the auto-generated bracket. Entry fees go directly to the organizer.",
  },
  {
    n: "03",
    title: "Track results",
    body: "Captains report each match, the opponent confirms, and the bracket advances. Disputes go to the organizer.",
  },
];

const audience = [
  {
    title: "Friend groups",
    body: "Saturday tournaments, recurring ladders, side bets among the crew.",
  },
  {
    title: "Discord communities",
    body: "Weekly scrims, hype events, community cups.",
  },
  {
    title: "Dorms and houses",
    body: "House ladders for whatever game is on the TV.",
  },
  {
    title: "Office crews",
    body: "Lunch-break brackets with real stakes.",
  },
];

function Wordmark() {
  return (
    <span className="font-mono text-sm font-semibold tracking-tight md:text-base">
      LADDER<span className="text-primary">.gg</span>
    </span>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="px-6 py-20 md:px-12 md:py-32">
          <div className="mx-auto max-w-5xl">
            <span className="inline-block rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-foreground-muted">
              League management for gaming crews · 18+
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Run your gaming league
              <br />
              <span className="text-primary">end-to-end.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-foreground-muted md:text-xl">
              Bracket generation, team registration, match reporting, and
              entry tracking. For friend groups, Discord communities, dorms,
              and office crews.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/leagues/new">Create a league</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
          </div>
        </section>

        <section
          id="how"
          className="border-t border-border px-6 py-20 md:px-12 md:py-24"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              How it works
            </h2>
            <p className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
              One flow for league setup, registration, and bracket tracking. Replaces hand-built brackets, scattered Discord threads, and result spreadsheets.
            </p>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.n}
                  className="rounded-lg border border-border bg-surface p-6"
                >
                  <span className="font-mono text-xs text-foreground-subtle">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-foreground-muted">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border px-6 py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Built for your crew
            </h2>
            <p className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
              Not pro esports infrastructure. A league tool for real people playing for real stakes.
            </p>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2">
              {audience.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface p-5"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <span className="font-medium">{item.title}</span>
                    <p className="text-sm text-foreground-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border px-6 py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              What LADDER does
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface p-5">
                <h3 className="font-semibold">LADDER handles</h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-foreground-muted">
                  <li>League setup and configuration</li>
                  <li>Team registration and roster tracking</li>
                  <li>Auto-generated single-elimination brackets</li>
                  <li>Match reporting and confirmation</li>
                  <li>Dispute escalation to the organizer</li>
                  <li>Public league page anyone can view</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-surface p-5">
                <h3 className="font-semibold">Organizer handles</h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-foreground-muted">
                  <li>Collecting entry fees from captains</li>
                  <li>Holding and distributing the prize</li>
                  <li>Setting payment instructions on the league page</li>
                  <li>Marking teams as paid, waived, or refunded</li>
                </ul>
              </div>
            </div>
            <p className="mt-8 text-sm text-foreground-muted">
              Free during early access. Paid plans for larger leagues and organizer tools coming later.
            </p>
          </div>
        </section>

        <section className="border-t border-border px-6 py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="max-w-3xl text-2xl font-semibold tracking-tight md:text-4xl">
              Ready to run your first league?
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/leagues/new">Create a league</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/signup">Create an account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-10 md:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Wordmark />
            <span className="text-sm text-foreground-subtle">© 2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground-muted">
            <Link
              href="/legal/terms"
              className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Terms
            </Link>
            <Link
              href="/legal/privacy"
              className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Privacy
            </Link>
            <span className="text-foreground-subtle">US-only · 18+</span>
          </div>
        </div>
      </footer>
    </>
  );
}
