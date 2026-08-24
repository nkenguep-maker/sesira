import { LoadingHeader, LoadingMetricGrid, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function QuotesLoading() {
  return (
    <LoadingPage label="Chargement des devis">
      <LoadingHeader withAction />
      <LoadingMetricGrid />
      <LoadingSkeleton className="mt-6 h-[420px] border border-[var(--border)]" />
    </LoadingPage>
  );
}
