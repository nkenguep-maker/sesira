import Link from "next/link";

export function StandaloneHeader({ label }: { label: string }) {
  return (
    <header className="standalone-header">
      <div>
        <Link href="/app" className="standalone-brand">SESIRA<span /></Link>
        <span className="standalone-label">{label}</span>
      </div>
    </header>
  );
}
