import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Privacy",
  description: "Privacy Policy for LADDER.gg.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-foreground-subtle">
          Last updated: April 24, 2026
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground-muted">
          <section>
            <h2 className="font-semibold text-foreground">What we collect</h2>
            <p className="mt-2">When you create an account, we collect:</p>
            <ul className="mt-2 ml-5 list-disc space-y-1">
              <li>Email address.</li>
              <li>Display name.</li>
              <li>Password (stored as a salted hash, never in plain text).</li>
              <li>
                Age confirmation (whether you confirmed you are 18 or older).
              </li>
              <li>
                League and team data you create or join — league names, team
                names, roster display names, match results.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">What we do not collect</h2>
            <ul className="mt-2 ml-5 list-disc space-y-1">
              <li>We do not run analytics or tracking pixels.</li>
              <li>We do not run advertising networks.</li>
              <li>
                We do not collect payment information. LADDER.gg does not
                process payments.
              </li>
              <li>
                We do not collect device fingerprints, location, or browsing
                history outside the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Where data is stored</h2>
            <p className="mt-2">
              LADDER.gg stores user and league data on Neon (PostgreSQL),
              hosted in the United States. The application runs on Vercel.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Cookies</h2>
            <p className="mt-2">
              We set a session cookie via NextAuth to keep you signed in. We
              do not use third-party cookies.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Sharing</h2>
            <p className="mt-2">
              We do not sell your data. We do not share your data with third
              parties for marketing.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Your rights</h2>
            <p className="mt-2">
              You can change your password from your account page. To delete
              your account or request a copy of your data, contact us. We will
              publish a contact email before LADDER.gg leaves early access.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Changes</h2>
            <p className="mt-2">
              We may update this Privacy Policy over time. Continued use of
              the Service after changes means you accept the update.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
