import { LoadingHeader, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function ResultsLoading() {
  return (
    <LoadingPage label="Chargement des résultats">
      <LoadingHeader withAction />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-44 border border-[var(--border)]" />
        ))}
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-48 border border-[var(--border)]" />
        ))}
      </div>
    </LoadingPage>
  );
}
