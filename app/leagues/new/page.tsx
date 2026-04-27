import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { CreateLeagueForm } from "./form";

export default async function NewLeaguePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a league
        </h1>
        <p className="mt-2 text-foreground-muted">
          Configure the basics. You can publish or cancel from the manage page.
        </p>
        <div className="mt-10">
          <CreateLeagueForm />
        </div>
      </main>
    </>
  );
}
