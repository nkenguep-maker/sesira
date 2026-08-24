import { LoadingHeader, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function AutomationsLoading() {
  return (
    <LoadingPage label="Chargement des automatisations">
      <LoadingHeader />
      <LoadingSkeleton className="mt-8 h-28 border border-[var(--border)]" />
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-[34rem] border border-[var(--border)]" />
        ))}
      </div>
    </LoadingPage>
  );
}
