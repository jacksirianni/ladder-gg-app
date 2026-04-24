import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SigninForm } from "./signin-form";

export default async function SigninPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-10 inline-block self-start rounded-sm font-mono text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        LADDER<span className="text-primary">.gg</span>
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-foreground-muted">Welcome back.</p>

      <div className="mt-8">
        <SigninForm />
      </div>
    </main>
  );
}
