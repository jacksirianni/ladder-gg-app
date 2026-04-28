import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeInternalPath } from "@/lib/auth/redirect";
import { SignupForm } from "./signup-form";

type Props = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await auth();
  const requestedRedirect = safeInternalPath(params.redirectTo);

  if (session?.user) {
    redirect(requestedRedirect ?? "/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-10 inline-block self-start rounded-sm font-mono text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        LADDER<span className="text-primary">.gg</span>
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        You will be able to create or join a league right after.
      </p>

      <div className="mt-8">
        <SignupForm redirectTo={requestedRedirect ?? undefined} />
      </div>
    </main>
  );
}
