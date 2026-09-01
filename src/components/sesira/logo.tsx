import Link from "next/link";

export function SesiraLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="SESIRA — accueil">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 36 36" role="img">
          <path d="M9 10.5h15.5c2.8 0 4.5 1.6 4.5 4 0 2.1-1.2 3.4-3.4 4l-12.2 3.2c-2.4.6-3.6 1.8-3.6 3.8 0 2.2 1.8 3.7 4.5 3.7H29" />
        </svg>
      </span>
      {!compact && <span className="brand-word">SESIRA</span>}
    </Link>
  );
}
