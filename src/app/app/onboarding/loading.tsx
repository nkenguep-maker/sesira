import { LoadingHeader, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";

export default function OnboardingLoading() {
  return <main className="onboarding-content"><LoadingPage label="Chargement de la configuration"><LoadingHeader /><LoadingSkeleton className="mt-8 h-72 border border-[var(--border)]" /></LoadingPage></main>;
}
