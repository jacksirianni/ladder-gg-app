import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:px-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-3 h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </header>

      <section className="mt-10">
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </section>
    </main>
  );
}
