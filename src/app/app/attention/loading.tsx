import { LoadingHeader, LoadingMetricGrid, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function AttentionLoading() {
  return (
    <LoadingPage label="Chargement des éléments à traiter">
      <LoadingHeader withAction />
      <LoadingMetricGrid />
      <div className="mt-8 grid gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-72 border border-[var(--border)]" />
        ))}
      </div>
    </LoadingPage>
  );
}
