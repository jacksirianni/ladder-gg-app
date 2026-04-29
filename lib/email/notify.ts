import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/client";
import {
  bracketStartedEmail,
  leagueCompletedEmail,
} from "@/lib/email/templates";

/**
 * v2.0-B: high-level event-driven email helpers. One function per
 * event. Each:
 *   - Resolves the recipient list from the league (organizer +
 *     captains, deduplicated)
 *   - Filters by `User.emailNotifications` (master opt-out)
 *   - Sends concurrently and best-effort (failures are logged, not
 *     thrown — never blocks the user-facing action that triggered it)
 *
 * The sendEmail wrapper is itself a no-op without RESEND_API_KEY, so
 * these can land in production safely while DNS is still pending.
 */

async function getAppUrl(): Promise<string> {
  // Prefer NEXT_PUBLIC_APP_URL if set; fall back to the request host.
  // This matters because emails go out to inboxes — relative URLs
  // wouldn't resolve.
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  } catch {
    return "https://ladder-gg-app.vercel.app";
  }
}

/**
 * Fire-and-forget bracket-started emails. Sent to the organizer + every
 * captain whose team is in the league.
 */
export async function notifyBracketStarted(leagueId: string): Promise<void> {
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        slug: true,
        name: true,
        organizer: {
          select: { email: true, displayName: true, emailNotifications: true },
        },
        teams: {
          select: {
            captain: {
              select: {
                email: true,
                displayName: true,
                emailNotifications: true,
              },
            },
          },
        },
      },
    });
    if (!league) return;

    const appUrl = await getAppUrl();
    const recipients = collectRecipients(
      [league.organizer, ...league.teams.map((t) => t.captain)],
    );

    await Promise.all(
      recipients.map(async (r) => {
        const email = bracketStartedEmail({
          appUrl,
          recipientName: r.displayName,
          leagueName: league.name,
          leagueSlug: league.slug,
          organizerName: league.organizer.displayName,
        });
        await sendEmail({
          to: r.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      }),
    );
  } catch (err) {
    console.error("[email] notifyBracketStarted failed:", err);
  }
}

/**
 * Fire-and-forget league-completed emails. Sent to organizer + all
 * captains. The champion's captain gets a personalized "you won"
 * subject.
 */
export async function notifyLeagueCompleted(leagueId: string): Promise<void> {
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        slug: true,
        name: true,
        organizer: {
          select: { email: true, displayName: true, emailNotifications: true },
        },
        teams: {
          select: {
            id: true,
            name: true,
            captain: {
              select: {
                id: true,
                email: true,
                displayName: true,
                emailNotifications: true,
              },
            },
          },
        },
        matches: {
          orderBy: [{ round: "desc" }, { bracketPosition: "asc" }],
          select: {
            bracket: true,
            round: true,
            status: true,
            winnerTeamId: true,
            winner: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!league) return;

    // Pick the championship match — same precedence as the recap page.
    const reset = league.matches.find(
      (m) =>
        m.bracket === "GRAND_RESET" &&
        (m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED"),
    );
    const grand = league.matches.find(
      (m) =>
        m.bracket === "GRAND_FINAL" &&
        (m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED"),
    );
    const wbFinal = league.matches.find(
      (m) =>
        m.bracket === "WINNERS" &&
        (m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED") &&
        m.round === Math.max(...league.matches.map((mm) => mm.round)),
    );
    const championMatch = reset ?? grand ?? wbFinal;
    const championName = championMatch?.winner?.name ?? "Unknown";
    const championTeamId = championMatch?.winnerTeamId ?? null;

    const appUrl = await getAppUrl();

    type Recipient = {
      email: string;
      displayName: string;
      emailNotifications: boolean;
      isChampion: boolean;
    };
    const recipients: Recipient[] = [];
    // Organizer first.
    recipients.push({
      ...league.organizer,
      isChampion: false,
    });
    for (const t of league.teams) {
      const isChampion =
        championTeamId !== null && t.id === championTeamId;
      recipients.push({
        email: t.captain.email,
        displayName: t.captain.displayName,
        emailNotifications: t.captain.emailNotifications,
        isChampion,
      });
    }

    // Dedupe by email — organizer might also be a captain.
    const seen = new Set<string>();
    const filtered = recipients.filter((r) => {
      if (!r.emailNotifications) return false;
      const key = r.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    await Promise.all(
      filtered.map(async (r) => {
        const email = leagueCompletedEmail({
          appUrl,
          recipientName: r.displayName,
          leagueName: league.name,
          leagueSlug: league.slug,
          championName,
          isChampion: r.isChampion,
        });
        await sendEmail({
          to: r.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      }),
    );
  } catch (err) {
    console.error("[email] notifyLeagueCompleted failed:", err);
  }
}

// ---------- helpers ----------

type Recipient = {
  email: string;
  displayName: string;
  emailNotifications: boolean;
};

function collectRecipients(rs: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of rs) {
    if (!r.emailNotifications) continue;
    const key = r.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
