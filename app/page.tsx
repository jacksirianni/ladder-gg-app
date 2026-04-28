import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { auth, signOut } from "@/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LadderLockup } from "@/components/brand/ladder-lockup";
import { LandingHeroPreview } from "./landing-hero-preview";

// Landing-specific token overrides. The in-app --primary stays #8b5cf6;
// the landing uses a softer lavender for marketing surfaces only.
const LANDING_TOKENS = {
  "--primary": "#a78bfa",
  "--primary-foreground": "#0a0a0c",
  "--background": "#0a0a0c",
  "--border": "#2a2a2e",
} as CSSProperties;

function Eyebrow({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      className="font-mono uppercase"
      style={{
        fontSize: 11,
        letterSpacing: "0.18em",
        color: "var(--foreground-subtle)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function PillBadge({
  variant,
  children,
}: {
  variant: "primary" | "success" | "warning" | "info" | "neutral" | "destructive";
  children: ReactNode;
}) {
  const variants = {
    primary: {
      bg: "color-mix(in oklab, var(--primary) 10%, transparent)",
      bd: "color-mix(in oklab, var(--primary) 30%, transparent)",
      fg: "var(--primary)",
    },
    success: {
      bg: "color-mix(in oklab, var(--success) 10%, transparent)",
      bd: "color-mix(in oklab, var(--success) 30%, transparent)",
      fg: "var(--success)",
    },
    warning: {
      bg: "color-mix(in oklab, var(--warning) 10%, transparent)",
      bd: "color-mix(in oklab, var(--warning) 30%, transparent)",
      fg: "var(--warning)",
    },
    info: {
      bg: "color-mix(in oklab, var(--info) 10%, transparent)",
      bd: "color-mix(in oklab, var(--info) 30%, transparent)",
      fg: "var(--info)",
    },
    destructive: {
      bg: "color-mix(in oklab, var(--destructive) 10%, transparent)",
      bd: "color-mix(in oklab, var(--destructive) 30%, transparent)",
      fg: "var(--destructive)",
    },
    neutral: {
      bg: "var(--surface)",
      bd: "var(--border)",
      fg: "var(--foreground-muted)",
    },
  } as const;
  const v = variants[variant];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono font-medium uppercase"
      style={{
        fontSize: 10.5,
        letterSpacing: "0.08em",
        background: v.bg,
        border: `1px solid ${v.bd}`,
        color: v.fg,
      }}
    >
      {children}
    </span>
  );
}

async function LandingNav() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: "color-mix(in oklab, var(--background) 80%, transparent)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex h-15 max-w-[1200px] items-center justify-between px-6 py-3.5 md:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <LadderLockup size={15} />
          </Link>
          <div
            className="hidden items-center gap-6 text-[13px] md:flex"
            style={{ color: "var(--foreground-muted)" }}
          >
            <a
              href="#how"
              className="transition-colors hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#scope"
              className="transition-colors hover:text-foreground"
            >
              Scope
            </a>
            <a
              href="#crews"
              className="transition-colors hover:text-foreground"
            >
              For your crew
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/account"
                aria-label="Account"
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Avatar name={user.name ?? user.email ?? "?"} size="sm" />
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-md px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Button asChild variant="secondary" size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/leagues/new">Create a league</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-24 lg:py-28">
      {/* subtle violet glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 80% 0%, color-mix(in oklab, var(--primary) 12%, transparent) 0%, transparent 60%)",
        }}
      />
      {/* faint vertical grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--border) 40%, transparent) 1px, transparent 1px)",
          backgroundSize: "80px 100%",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
          opacity: 0.35,
        }}
      />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <div className="inline-flex flex-wrap items-center gap-2">
            <PillBadge variant="primary">Now in early access</PillBadge>
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                color: "var(--foreground-subtle)",
              }}
            >
              · Free for organizers
            </span>
          </div>
          <h1
            className="mt-6 font-semibold"
            style={{
              fontSize: "clamp(40px, 5.4vw, 76px)",
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
            }}
          >
            League nights,
            <br />
            <span style={{ color: "var(--foreground-muted)" }}>
              without the{" "}
            </span>
            <span
              style={{
                background:
                  "linear-gradient(90deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 60%, white) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              chaos.
            </span>
          </h1>
          <p
            className="mt-5 max-w-xl"
            style={{
              fontSize: 18,
              lineHeight: 1.55,
              color: "var(--foreground-muted)",
            }}
          >
            LADDER.gg is the command center for gaming crews — team
            registration, bracket management, match confirmation, and dispute
            resolution. Replace your spreadsheet, your Discord thread, and the
            screenshot pile.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/leagues/new">Create a league →</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <div
            className="mt-9 flex flex-wrap items-center gap-5 font-mono uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "var(--foreground-subtle)",
            }}
          >
            <span>· No card required</span>
            <span>· Built for any game</span>
            <span>· US · 18+</span>
          </div>
        </div>

        <div className="relative">
          <LandingHeroPreview />
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const oldWay = [
    {
      ico: "#",
      label: "Discord thread",
      note: "Sign-ups buried at message 472",
    },
    {
      ico: "$",
      label: "Venmo + Cash App",
      note: "Who paid? Who didn't?",
    },
    {
      ico: "▦",
      label: "Spreadsheet bracket",
      note: "Manually updated. Mostly wrong.",
    },
    {
      ico: "◐",
      label: "Score screenshots",
      note: "DMs, replies, contested calls",
    },
    {
      ico: "?",
      label: "Dispute over text",
      note: "It's now a group-chat fight",
    },
  ];

  const dashboardStats = [
    { l: "Captains invited", v: "8 / 8" },
    { l: "Entries tracked", v: "6 paid · 2 pending" },
    { l: "Matches confirmed", v: "4 of 7" },
    { l: "Disputes", v: "0" },
  ];

  return (
    <section
      className="py-24 md:py-28"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <Eyebrow>The old way</Eyebrow>
            <h2
              className="mt-4 font-semibold"
              style={{
                fontSize: "clamp(32px, 3.4vw, 48px)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
              }}
            >
              Five tools, four group chats, zero source of truth.
            </h2>
            <p
              className="mt-4 max-w-md"
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: "var(--foreground-muted)",
              }}
            >
              Running a league with friends shouldn&apos;t feel like running a
              side business. The work always lands on one person — usually you.
            </p>

            <div className="mt-8 flex flex-col gap-2">
              {oldWay.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3.5 rounded-[10px] px-4 py-3.5"
                  style={{
                    border:
                      "1px dashed color-mix(in oklab, var(--border) 80%, transparent)",
                    background:
                      "color-mix(in oklab, var(--surface) 40%, transparent)",
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-md font-mono"
                    style={{
                      width: 28,
                      height: 28,
                      fontSize: 13,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground-subtle)",
                    }}
                  >
                    {row.ico}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{row.label}</div>
                    <div
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--foreground-subtle)" }}
                    >
                      {row.note}
                    </div>
                  </div>
                  <span style={{ color: "var(--foreground-subtle)", fontSize: 18 }}>
                    ×
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <Eyebrow style={{ color: "var(--primary)" }}>The LADDER way</Eyebrow>
            <h3
              className="mt-4 font-semibold"
              style={{
                fontSize: 32,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              One page. One bracket. One source of truth.
            </h3>

            <div
              className="mt-7 overflow-hidden rounded-[14px]"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div
                className="flex items-center gap-2 px-3.5 py-2.5"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span
                  className="rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: "var(--success)",
                  }}
                />
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    color: "var(--foreground-subtle)",
                  }}
                >
                  ladder.gg/l/tuesday-comp-cup
                </span>
              </div>
              <div className="p-4 md:p-5">
                <div className="mb-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">
                      Tuesday Comp Cup
                    </div>
                    <div
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--foreground-subtle)" }}
                    >
                      8 teams · single elim · BO3
                    </div>
                  </div>
                  <PillBadge variant="primary">In progress</PillBadge>
                </div>
                <div className="grid gap-2">
                  {dashboardStats.map((s) => (
                    <div
                      key={s.l}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5"
                      style={{
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--foreground-muted)" }}
                      >
                        {s.l}
                      </span>
                      <span className="font-mono text-xs">{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p
              className="mt-4 text-[13px]"
              style={{
                lineHeight: 1.6,
                color: "var(--foreground-subtle)",
              }}
            >
              Off-platform entry collection stays where it always lived — your
              Venmo, your Cash App, your envelope at the door. LADDER tracks
              the status; you handle the cash.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Create league",
      body: "Game, team size, format, schedule. Done in under a minute.",
      state: "done",
    },
    {
      n: "02",
      title: "Invite captains",
      body: "One shareable link. Captains register their own team.",
      state: "done",
    },
    {
      n: "03",
      title: "Register teams",
      body: "Rosters, captains, contact handle. All in one view.",
      state: "done",
    },
    {
      n: "04",
      title: "Track entries",
      body: "Mark teams paid, waived, or refunded. Tracking only.",
      state: "active",
    },
    {
      n: "05",
      title: "Generate bracket",
      body: "Single-elim, auto-seeded. Ready when registration closes.",
      state: "next",
    },
    {
      n: "06",
      title: "Report results",
      body: "Captains submit, opponent confirms, bracket advances.",
      state: "next",
    },
    {
      n: "07",
      title: "Crown winner",
      body: "Public results page anyone can share.",
      state: "next",
    },
  ] as const;

  const stateColor: Record<(typeof steps)[number]["state"], string> = {
    done: "var(--success)",
    active: "var(--primary)",
    next: "var(--foreground-subtle)",
  };

  return (
    <section
      className="py-24"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h2
              className="mt-4 max-w-[720px] font-semibold"
              style={{
                fontSize: "clamp(32px, 3.4vw, 48px)",
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
              }}
            >
              From &quot;we should run a league&quot; to crowning a winner.
              Seven steps, one tool.
            </h2>
          </div>
          <div
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "var(--foreground-subtle)",
            }}
          >
            ~5 min organizer setup
          </div>
        </div>

        <div className="relative mt-14">
          {/* connecting line */}
          <div
            aria-hidden
            className="absolute"
            style={{
              left: 24,
              top: 24,
              bottom: 24,
              width: 1,
              background:
                "linear-gradient(180deg, var(--success) 0%, var(--primary) 35%, var(--border) 50%, var(--border) 100%)",
            }}
          />
          <div className="flex flex-col gap-1">
            {steps.map((s) => (
              <div
                key={s.n}
                className="grid items-center gap-6 py-4"
                style={{ gridTemplateColumns: "48px 1fr auto" }}
              >
                <div className="relative z-10 flex justify-center">
                  <span
                    className="inline-flex items-center justify-center rounded-full font-mono font-semibold"
                    style={{
                      width: 48,
                      height: 48,
                      fontSize: 12,
                      letterSpacing: "0.04em",
                      background:
                        s.state === "next"
                          ? "var(--surface)"
                          : "var(--background)",
                      border: `1px solid ${s.state === "next" ? "var(--border)" : stateColor[s.state]}`,
                      color: stateColor[s.state],
                      boxShadow:
                        s.state === "active"
                          ? "0 0 0 6px color-mix(in oklab, var(--primary) 12%, transparent)"
                          : "none",
                    }}
                  >
                    {s.n}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    className="text-lg font-semibold"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {s.title}
                  </div>
                  <div
                    className="max-w-[540px] text-sm"
                    style={{
                      color: "var(--foreground-muted)",
                      lineHeight: 1.55,
                    }}
                  >
                    {s.body}
                  </div>
                </div>
                <div className="flex items-center">
                  {s.state === "done" && (
                    <PillBadge variant="success">Done</PillBadge>
                  )}
                  {s.state === "active" && (
                    <PillBadge variant="primary">Now</PillBadge>
                  )}
                  {s.state === "next" && (
                    <PillBadge variant="neutral">Next</PillBadge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features: {
    title: string;
    body: string;
    preview: ReactNode;
  }[] = [
    {
      title: "Shareable invite links",
      body:
        "One URL. Captains sign their teams up themselves — no manual data entry.",
      preview: (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="flex-1 truncate font-mono text-xs"
            style={{ color: "var(--foreground-muted)" }}
          >
            ladder.gg/i/abc-friday-cup
          </span>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--primary)",
            }}
          >
            Copy
          </span>
        </div>
      ),
    },
    {
      title: "Team rosters",
      body:
        "Captain plus full lineup, with Discord handles. No more 'who is this player?'",
      preview: (
        <div className="flex flex-wrap gap-1.5">
          {["@miko", "@jules", "@rohan", "@gabe", "@nat"].map((h) => (
            <span
              key={h}
              className="font-mono text-[11px]"
              style={{
                padding: "4px 8px",
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                color: "var(--foreground-muted)",
              }}
            >
              {h}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Organizer-managed entry status",
      body:
        "Track who paid, was waived, or refunded — tracking only, money stays off-platform.",
      preview: (
        <div className="flex flex-wrap gap-1.5">
          <PillBadge variant="success">Paid</PillBadge>
          <PillBadge variant="warning">Pending</PillBadge>
          <PillBadge variant="info">Waived</PillBadge>
          <PillBadge variant="neutral">Refunded</PillBadge>
        </div>
      ),
    },
    {
      title: "Public league pages",
      body:
        "Bracket, teams, results — viewable by anyone with the link, no account needed.",
      preview: (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2.5"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="text-xs"
            style={{ color: "var(--foreground-muted)" }}
          >
            Public link
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--success)" }}
          >
            ● LIVE
          </span>
        </div>
      ),
    },
    {
      title: "Single-elim brackets",
      body: "Auto-seeded, auto-advancing. Generate when registration closes.",
      preview: (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 24,
                height: 14,
                borderRadius: 2,
                background:
                  i < 3
                    ? "color-mix(in oklab, var(--primary) 30%, var(--surface))"
                    : "var(--surface-elevated)",
                border: "1px solid var(--border)",
              }}
            />
          ))}
          <span
            className="ml-1 font-mono"
            style={{ fontSize: 11, color: "var(--foreground-subtle)" }}
          >
            R1 → FINAL
          </span>
        </div>
      ),
    },
    {
      title: "Captain result confirmation",
      body:
        "One captain reports the score. The opponent confirms. Bracket advances automatically.",
      preview: (
        <div
          className="flex items-center gap-1.5 font-mono"
          style={{ fontSize: 12 }}
        >
          <span style={{ color: "var(--foreground-muted)" }}>
            NULL POINTERS
          </span>
          <span
            className="font-semibold"
            style={{ color: "var(--success)" }}
          >
            13
          </span>
          <span style={{ color: "var(--foreground-subtle)" }}>—</span>
          <span className="font-semibold">9</span>
          <span style={{ color: "var(--foreground-muted)" }}>ROGUE WAVE</span>
          <span className="ml-auto" style={{ color: "var(--success)" }}>
            ✓
          </span>
        </div>
      ),
    },
    {
      title: "Organizer dispute override",
      body:
        "When two captains disagree, you decide. The bracket moves. The drama doesn't.",
      preview: (
        <div className="flex items-center gap-1.5">
          <PillBadge variant="destructive">Disputed</PillBadge>
          <span style={{ color: "var(--foreground-subtle)", fontSize: 18 }}>
            →
          </span>
          <PillBadge variant="primary">Organizer decided</PillBadge>
        </div>
      ),
    },
    {
      title: "Winner display",
      body:
        "Champion shown front-and-center on the public page when the final confirms.",
      preview: (
        <div
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in oklab, var(--success) 8%, var(--background))",
            border:
              "1px solid color-mix(in oklab, var(--success) 30%, transparent)",
          }}
        >
          <span
            className="inline-flex items-center justify-center font-bold"
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: "var(--success)",
              color: "var(--success-foreground)",
              fontSize: 12,
            }}
          >
            ★
          </span>
          <span
            className="text-[13px] font-semibold"
            style={{ color: "var(--success)" }}
          >
            NULL POINTERS
          </span>
          <span
            className="ml-auto font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--success)",
            }}
          >
            Champion
          </span>
        </div>
      ),
    },
  ];

  return (
    <section
      className="py-24"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        <Eyebrow>Features</Eyebrow>
        <h2
          className="mt-4 max-w-[760px] font-semibold"
          style={{
            fontSize: "clamp(32px, 3.4vw, 48px)",
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
          }}
        >
          Everything you need to run the league. Nothing you&apos;d need a
          lawyer for.
        </h2>
        <div
          className="mt-14 grid grid-cols-1 overflow-hidden rounded-[14px] sm:grid-cols-2 lg:grid-cols-4"
          style={{
            gap: 1,
            background: "var(--border)",
            border: "1px solid var(--border)",
          }}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="flex flex-col gap-4 p-6 sm:col-span-2 lg:col-span-2"
              style={{ background: "var(--surface)", minHeight: 220 }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="text-base font-semibold"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {f.title}
                </div>
                <span
                  className="font-mono"
                  style={{ fontSize: 11, color: "var(--foreground-subtle)" }}
                >
                  0{i + 1}
                </span>
              </div>
              <div
                className="flex-1"
                style={{
                  fontSize: 13.5,
                  color: "var(--foreground-muted)",
                  lineHeight: 1.55,
                }}
              >
                {f.body}
              </div>
              <div className="mt-auto">{f.preview}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SplitSection() {
  const ladder = [
    "League setup and configuration",
    "Team registration and rosters",
    "Bracket generation",
    "Match reporting and confirmation",
    "Dispute resolution",
    "Public results pages",
  ];
  const organizer = [
    "Off-platform entry collection",
    "Community rules and conduct",
    "Prize notes and decisions",
    "Final judgment on close calls",
  ];

  return (
    <section
      className="py-24"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        <Eyebrow>Clear lines</Eyebrow>
        <h2
          className="mt-4 max-w-[760px] font-semibold"
          style={{
            fontSize: "clamp(32px, 3.4vw, 48px)",
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
          }}
        >
          We run the bracket.{" "}
          <span style={{ color: "var(--foreground-muted)" }}>
            You run the league.
          </span>
        </h2>
        <p
          className="mt-4 max-w-[580px]"
          style={{
            fontSize: 16,
            color: "var(--foreground-muted)",
            lineHeight: 1.6,
          }}
        >
          LADDER doesn&apos;t collect, hold, or distribute money. Entries and
          prizes stay off-platform — exactly where your community already
          handles them.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div
            className="rounded-[14px] p-7"
            style={{
              border:
                "1px solid color-mix(in oklab, var(--primary) 40%, var(--border))",
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--primary) 6%, var(--surface)) 0%, var(--surface) 100%)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LadderLockup size={13} />
                <span
                  className="text-[13px]"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  handles
                </span>
              </div>
              <PillBadge variant="primary">Software</PillBadge>
            </div>
            <ul className="mt-6 flex list-none flex-col gap-3 p-0">
              {ladder.map((l) => (
                <li
                  key={l}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full"
                    style={{
                      width: 18,
                      height: 18,
                      fontSize: 11,
                      background:
                        "color-mix(in oklab, var(--primary) 20%, transparent)",
                      border:
                        "1px solid color-mix(in oklab, var(--primary) 50%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    ✓
                  </span>
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-[14px] p-7"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-semibold" style={{ fontSize: 15 }}>
                  Organizer
                </span>
                <span
                  className="text-[13px]"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  handles
                </span>
              </div>
              <PillBadge variant="neutral">Off-platform</PillBadge>
            </div>
            <ul className="mt-6 flex list-none flex-col gap-3 p-0">
              {organizer.map((l) => (
                <li
                  key={l}
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full"
                    style={{
                      width: 18,
                      height: 18,
                      fontSize: 11,
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground-subtle)",
                    }}
                  >
                    ↗
                  </span>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudienceSection() {
  const groups = [
    {
      title: "Friend groups",
      line: "Saturday tournaments, recurring ladders, side bragging rights.",
      count: "4–16 players",
    },
    {
      title: "Discord communities",
      line: "Weekly scrims, hype events, community cups.",
      count: "8–64 teams",
    },
    {
      title: "Dorms & clubs",
      line: "House ladders for whatever's on the TV.",
      count: "Recurring",
    },
    {
      title: "Recurring game nights",
      line: "Same crew, new bracket, every Friday.",
      count: "Weekly",
    },
    {
      title: "Office leagues",
      line: "Lunch-break brackets with real stakes.",
      count: "Bring-your-own-game",
    },
    {
      title: "Casual competitive crews",
      line: "Serious about winning, not about logistics.",
      count: "Any game",
    },
  ];

  return (
    <section
      className="py-24"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        <Eyebrow>Who it&apos;s for</Eyebrow>
        <h2
          className="mt-4 max-w-[760px] font-semibold"
          style={{
            fontSize: "clamp(32px, 3.4vw, 48px)",
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
          }}
        >
          Not pro esports infrastructure.{" "}
          <span style={{ color: "var(--foreground-muted)" }}>
            A league tool for your crew.
          </span>
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => (
            <div
              key={g.title}
              className="relative overflow-hidden rounded-xl p-6"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    color: "var(--foreground-subtle)",
                  }}
                >
                  0{i + 1}
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: 11, color: "var(--foreground-subtle)" }}
                >
                  {g.count}
                </span>
              </div>
              <div
                className="mt-6 text-lg font-semibold"
                style={{ letterSpacing: "-0.01em" }}
              >
                {g.title}
              </div>
              <div
                className="mt-1.5 text-[13.5px]"
                style={{
                  color: "var(--foreground-muted)",
                  lineHeight: 1.55,
                }}
              >
                {g.line}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden py-24 md:py-28"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(50% 60% at 50% 100%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 text-center md:px-8">
        <Eyebrow>Free during early access</Eyebrow>
        <h2
          className="mt-5 font-semibold"
          style={{
            fontSize: "clamp(40px, 5vw, 72px)",
            letterSpacing: "-0.035em",
            lineHeight: 1.02,
          }}
        >
          Run your first league.
        </h2>
        <p
          className="mx-auto mt-5 max-w-[560px]"
          style={{
            fontSize: 17,
            color: "var(--foreground-muted)",
            lineHeight: 1.6,
          }}
        >
          Five minutes to set up. One link to share. Zero spreadsheets to
          maintain.
        </p>
        <div className="mt-9 inline-flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/leagues/new">Create a league →</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
        <div
          className="mt-6 font-mono uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--foreground-subtle)",
          }}
        >
          No card required · US · 18+
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer
      className="px-6 pt-10 pb-14 md:px-8"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <LadderLockup size={13} />
          <span
            className="text-[13px]"
            style={{ color: "var(--foreground-subtle)" }}
          >
            © 2026
          </span>
        </div>
        <div
          className="flex flex-wrap items-center gap-6 text-[13px]"
          style={{ color: "var(--foreground-muted)" }}
        >
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
          <span style={{ color: "var(--foreground-subtle)" }}>
            US-only · 18+
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div
      style={LANDING_TOKENS}
      className="flex min-h-full flex-1 flex-col scroll-smooth"
    >
      {/* Override body background for the landing scope so radial glows blend cleanly */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "var(--background)" }}
      />
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <ProblemSection />
        <div id="how">
          <HowItWorks />
        </div>
        <div id="features">
          <FeatureGrid />
        </div>
        <div id="scope">
          <SplitSection />
        </div>
        <div id="crews">
          <AudienceSection />
        </div>
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
