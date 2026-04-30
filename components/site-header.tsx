import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LadderLockup } from "@/components/brand/ladder-lockup";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md md:px-8">
      <Link
        href={user ? "/dashboard" : "/"}
        className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <LadderLockup size={15} />
      </Link>

      {user ? (
        <div className="flex items-center gap-1 md:gap-2">
          {/* v3.0: Dashboard text link — second nav slot before Explore. */}
          <Link
            href="/dashboard"
            className="hidden rounded-md px-3 py-1.5 text-[13px] text-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-block"
          >
            Dashboard
          </Link>
          {/* v2.0-E: Explore — public discovery of OPEN_JOIN leagues. */}
          <Link
            href="/explore"
            className="hidden rounded-md px-3 py-1.5 text-[13px] text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-block"
          >
            Explore
          </Link>
          <Button asChild variant="secondary" size="sm" className="ml-1">
            <Link href="/leagues/new">Create a league</Link>
          </Button>
          <Link
            href="/account"
            aria-label="Account"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Avatar
              name={user.name ?? user.email ?? "?"}
              size="sm"
            />
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
        </div>
      ) : (
        <div className="flex items-center gap-2 md:gap-4">
          {/* v2.0-E: Explore link is also reachable for signed-out
              visitors so they can discover leagues before signing up. */}
          <Link
            href="/explore"
            className="rounded-md px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Explore
          </Link>
          <Link
            href="/signin"
            className="rounded-md px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Sign in
          </Link>
          <Button asChild variant="secondary" size="sm">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      )}
    </nav>
  );
}
