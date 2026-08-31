import { LoadingHeader, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function ConnectionsLoading() {
  return <LoadingPage label="Chargement des connexions"><LoadingHeader /><LoadingSkeleton className="mt-8 h-96 border border-[var(--border)]" /></LoadingPage>;
}
