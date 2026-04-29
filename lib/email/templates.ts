import "server-only";

/**
 * v2.0-B: hand-written email templates. We avoided pulling in
 * `react-email` to keep the dependency tree lean — these are simple
 * enough as plain HTML+text pairs. If templates get more complex in
 * v2.0-B.1+ we can swap in react-email then.
 *
 * Style notes:
 *   - HTML uses inline styles only (Gmail / Outlook strip <style> tags)
 *   - Dark surfaces with violet accent to match app branding
 *   - Always provide a text fallback — some clients prefer it; spam
 *     filters look for it
 */

type Common = {
  appUrl: string;
  recipientName: string;
};

// ---------- Bracket started ----------

export type BracketStartedInput = Common & {
  leagueName: string;
  leagueSlug: string;
  organizerName: string;
};

export function bracketStartedEmail(input: BracketStartedInput) {
  const url = `${input.appUrl}/leagues/${input.leagueSlug}`;
  const subject = `${input.leagueName} just started — your bracket is live`;
  const text = [
    `Hey ${input.recipientName},`,
    "",
    `${input.organizerName} just started ${input.leagueName}. The bracket is live and your first match is queued up.`,
    "",
    `View the bracket: ${url}`,
    "",
    "Good luck,",
    "LADDER.gg",
  ].join("\n");

  const html = wrapShell(
    `${input.organizerName} just started ${input.leagueName}.`,
    `Your bracket is live. Check the matches tab for your next match.`,
    { label: "View the bracket", url },
  );

  return { subject, text, html };
}

// ---------- League completed ----------

export type LeagueCompletedInput = Common & {
  leagueName: string;
  leagueSlug: string;
  championName: string;
  /** True if this captain's team won. Personalizes the subject + body. */
  isChampion: boolean;
};

export function leagueCompletedEmail(input: LeagueCompletedInput) {
  const url = `${input.appUrl}/leagues/${input.leagueSlug}/recap`;
  const subject = input.isChampion
    ? `🏆 You won ${input.leagueName}`
    : `${input.leagueName} wrapped — ${input.championName} won`;

  const headline = input.isChampion
    ? `🏆 You won ${input.leagueName}.`
    : `${input.leagueName} wrapped.`;
  const sub = input.isChampion
    ? `Champion: ${input.championName}. Open the recap to share the result.`
    : `Champion: ${input.championName}. Open the recap to see the full breakdown.`;

  const text = [
    `Hey ${input.recipientName},`,
    "",
    headline,
    sub,
    "",
    `Open the recap: ${url}`,
    "",
    "GG,",
    "LADDER.gg",
  ].join("\n");

  const html = wrapShell(headline, sub, {
    label: "Open the recap",
    url,
  });

  return { subject, text, html };
}

// ---------- Shared shell ----------

function wrapShell(
  headline: string,
  sub: string,
  cta: { label: string; url: string },
): string {
  // Inline-styled HTML. Targets typical email clients (Gmail/Outlook
  // strip <style>, no flexbox in older clients, etc.).
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#FAFAFA;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#09090B;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" style="background:#18181B;border:1px solid #27272A;border-radius:12px;padding:32px 28px;">
          <tr>
            <td style="font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#A78BFA;font-weight:600;padding-bottom:20px;">
              LADDER<span style="color:#FAFAFA;">.gg</span>
            </td>
          </tr>
          <tr>
            <td style="font-size:24px;line-height:1.25;color:#FAFAFA;font-weight:600;padding-bottom:12px;">
              ${escapeHtml(headline)}
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.45;color:#A1A1AA;padding-bottom:24px;">
              ${escapeHtml(sub)}
            </td>
          </tr>
          <tr>
            <td>
              <a href="${escapeAttr(cta.url)}" style="display:inline-block;background:#A78BFA;color:#09090B;font-weight:600;padding:11px 18px;border-radius:8px;text-decoration:none;font-size:14px;">${escapeHtml(cta.label)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:32px;border-top:1px solid #27272A;margin-top:32px;font-size:12px;color:#71717A;">
              <p style="margin:24px 0 0 0;">You're getting this because you're playing in or organizing this league. Manage email preferences from your account page.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
