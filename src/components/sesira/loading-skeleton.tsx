import type { ReactNode } from "react";

export function LoadingSkeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-[var(--panel-soft)] ${className}`} />;
}

export function LoadingPage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl" role="status" aria-label={label}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function LoadingHeader({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div className="w-full max-w-2xl">
        <LoadingSkeleton className="h-4 w-36" />
        <LoadingSkeleton className="mt-3 h-10 w-56 max-w-full" />
        <LoadingSkeleton className="mt-4 h-4 w-full max-w-xl" />
      </div>
      {withAction ? <LoadingSkeleton className="h-11 w-40" /> : null}
    </div>
  );
}

export function LoadingMetricGrid({ count = 4, columns = "four" }: { count?: number; columns?: "three" | "four" }) {
  return (
    <div className={`mt-8 grid gap-4 sm:grid-cols-2 ${columns === "three" ? "lg:grid-cols-3" : "xl:grid-cols-4"}`}>
      {Array.from({ length: count }, (_, index) => (
        <LoadingSkeleton key={index} className="h-[86px]" />
      ))}
    </div>
  );
}
