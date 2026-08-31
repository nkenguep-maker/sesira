import { LoadingHeader, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function ImportsLoading() {
  return <main className="imports-content"><LoadingPage label="Chargement des imports"><LoadingHeader withAction /><LoadingSkeleton className="mt-8 h-48 border border-[var(--border)]" /></LoadingPage></main>;
}
