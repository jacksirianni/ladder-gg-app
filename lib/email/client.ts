import "server-only";
import { Resend } from "resend";

/**
 * v2.0-B: Resend wrapper. The whole email system is inert until
 * `RESEND_API_KEY` is configured in production env. That's by design:
 *
 *   - In dev without an API key, calls log to console and resolve.
 *   - In production without an API key, calls log + resolve too.
 *   - Once the key is set on Vercel and DNS records are in place,
 *     emails actually go out.
 *
 * This means we can ship the email infrastructure now without breaking
 * anything for users while DNS / sender setup is still pending.
 *
 * To activate in production:
 *   1. Sign up at resend.com (free tier covers our scale)
 *   2. Add a domain (e.g. ladder.gg if you have one, or use the default
 *      onboarding subdomain)
 *   3. Add the SPF / DKIM / DMARC DNS records they show you
 *   4. Wait for verification (usually < 1 hour)
 *   5. Set RESEND_API_KEY in Vercel project env
 *   6. Set EMAIL_FROM env to a verified sender (e.g. "LADDER.gg <noreply@ladder.gg>")
 */

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM ?? "LADDER.gg <onboarding@resend.dev>";

let resend: Resend | null = null;
if (apiKey) {
  resend = new Resend(apiKey);
}

export type SendEmailInput = {
  to: string;
  subject: string;
  /** Plain-text fallback. */
  text: string;
  /** HTML body — generated from React Email templates server-side. */
  html: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

/**
 * Send a single transactional email. Best-effort: never throws — failures
 * are returned as `{ ok: false }` so callers can log without breaking
 * the user-facing flow they were performing.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!resend) {
    // Dev / pre-DNS production: log + skip.
    console.log(
      `[email] (dry-run, no RESEND_API_KEY) → ${input.to}: ${input.subject}`,
    );
    return { ok: true, id: null };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (error) {
      console.error(`[email] send failed for ${input.to}:`, error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[email] send threw for ${input.to}:`, err);
    return { ok: false, error: message };
  }
}

/**
 * Whether the email system is fully wired (Resend key + presumably DNS).
 * Useful for gating "you'll get an email about this" copy in the UI.
 */
export function isEmailEnabled(): boolean {
  return resend !== null;
}
