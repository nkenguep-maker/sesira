import { LoadingHeader, LoadingMetricGrid, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function CustomersLoading() {
  return (
    <LoadingPage label="Chargement des clients">
      <LoadingHeader withAction />
      <LoadingMetricGrid count={3} columns="three" />
      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <LoadingSkeleton className="h-20 rounded-none border-b border-[var(--border)]" />
        {Array.from({ length: 5 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-20 rounded-none border-b border-[var(--border)] last:border-b-0" />
        ))}
      </div>
    </LoadingPage>
  );
}
