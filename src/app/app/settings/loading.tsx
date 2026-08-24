import { LoadingHeader, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function SettingsLoading() {
  return (
    <LoadingPage label="Chargement des réglages">
      <LoadingHeader />
      <div className="mt-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-10 w-32 shrink-0" />
        ))}
      </div>
      <div className="mt-6 space-y-6">
        {Array.from({ length: 3 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-72 border border-[var(--border)]" />
        ))}
      </div>
    </LoadingPage>
  );
}
