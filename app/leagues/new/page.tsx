import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CreateLeagueForm } from "./form";

export const metadata: Metadata = {
  title: "New league",
  description: "Set up a single-elimination bracket for your crew.",
};

export default async function NewLeaguePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
          New league
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Set up your bracket
        </h1>
        <p className="mt-2 text-foreground-muted">
          Takes about a minute. You can publish, edit, or cancel later from
          the manage page.
        </p>
        <div className="mt-10">
          <CreateLeagueForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
