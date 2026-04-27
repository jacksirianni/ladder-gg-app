import { Skeleton } from "@/components/ui/skeleton";

export default function LeagueLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:px-12">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="mt-3 h-9 w-72" />
      <Skeleton className="mt-2 h-4 w-96" />

      <div className="mt-10">
        <Skeleton className="h-10 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-8 h-32" />
      </div>
    </main>
  );
}
