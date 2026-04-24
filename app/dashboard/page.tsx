import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SiteHeader } from "@/components/site-header";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:px-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hi, {user.displayName}
          </h1>
          <p className="mt-2 text-foreground-muted">
            Leagues you are part of will show up here.
          </p>
        </header>

        <section className="mt-12">
          <EmptyState
            title="No leagues yet"
            description="Create your first league, or join one with an invite link from an organizer."
            action={
              <Button asChild>
                <Link href="/leagues/new">Create a league</Link>
              </Button>
            }
          />
        </section>
      </main>
    </>
  );
}
