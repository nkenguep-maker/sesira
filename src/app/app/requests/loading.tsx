import { LoadingHeader, LoadingMetricGrid, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function RequestsLoading() {
  return (
    <LoadingPage label="Chargement des demandes">
      <LoadingHeader withAction />
      <LoadingMetricGrid />
      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <LoadingSkeleton className="h-20 rounded-none border-b border-[var(--border)]" />
        {Array.from({ length: 5 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-20 rounded-none border-b border-[var(--border)] last:border-b-0" />
        ))}
      </div>
    </LoadingPage>
  );
}
