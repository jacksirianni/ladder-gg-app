import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = {
  title: "Account",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-2 text-foreground-muted">
          Your LADDER.gg account.
        </p>

        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Profile
          </h2>
          <Card className="mt-4 flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground-subtle">
                Display name
              </p>
              <p className="mt-1 text-sm">{user.displayName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground-subtle">
                Email
              </p>
              <p className="mt-1 font-mono text-sm">{user.email}</p>
            </div>
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Change password
          </h2>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Sign out
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Sign out of LADDER.gg on this device.
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="mt-4"
          >
            <Button type="submit" variant="destructive">
              Sign out
            </Button>
          </form>
        </section>

        <section className="mt-10 border-t border-border pt-8 text-sm text-foreground-subtle">
          <p>
            Read the{" "}
            <Link
              href="/legal/terms"
              className="rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/privacy"
              className="rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  );
}
