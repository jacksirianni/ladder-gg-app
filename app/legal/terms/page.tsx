import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Terms",
  description: "Terms of Service for LADDER.gg.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-foreground-subtle">
          Last updated: April 24, 2026
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground-muted">
          <p>
            These Terms govern your use of LADDER.gg (the &quot;Service&quot;).
            By creating an account or using the Service, you agree to these Terms.
          </p>

          <section>
            <h2 className="font-semibold text-foreground">Eligibility</h2>
            <p className="mt-2">
              You must be 18 years or older to use LADDER.gg. The Service is
              currently offered to users in the United States only.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">What the Service does</h2>
            <p className="mt-2">
              LADDER.gg is league management software. It helps an organizer
              run a gaming league by providing league configuration, team
              registration, an auto-generated single-elimination bracket,
              match reporting, dispute resolution, and a public league page.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">What the Service does not do</h2>
            <p className="mt-2">
              LADDER.gg does not collect, hold, or distribute money. Entry fees
              and prizes are managed entirely by the organizer of each league,
              off-platform. LADDER.gg tracks only the payment status that the
              organizer manually records — it does not process payments and is
              not a financial intermediary.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Skill-based contests</h2>
            <p className="mt-2">
              Leagues run on LADDER.gg are intended as skill-based competitions.
              Whether such contests are legal in your jurisdiction is your
              responsibility. You are responsible for compliance with all
              applicable laws.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Acceptable use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 ml-5 list-disc space-y-1">
              <li>Use the Service for unlawful purposes.</li>
              <li>Misrepresent yourself or another person.</li>
              <li>Interfere with the Service&apos;s operation.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Account</h2>
            <p className="mt-2">
              You are responsible for keeping your password secure and for any
              activity under your account.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Termination</h2>
            <p className="mt-2">
              We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Changes</h2>
            <p className="mt-2">
              We may update these Terms over time. Continued use of the
              Service after changes means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              Questions about these Terms? We&apos;ll publish a contact email
              before LADDER.gg leaves early access.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
