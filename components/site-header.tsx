import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function Wordmark() {
  return (
    <span className="font-mono text-sm font-semibold tracking-tight md:text-base">
      LADDER<span className="text-primary">.gg</span>
    </span>
  );
}

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <nav className="flex items-center justify-between border-b border-border px-6 py-4 md:px-12">
      <Link
        href={user ? "/dashboard" : "/"}
        className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Wordmark />
      </Link>

      {user ? (
        <div className="flex items-center gap-2 md:gap-3">
          <Button asChild variant="secondary" size="sm">
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
