"use client";

import Link from "next/link";
import { CalendarDays, FileText, UserRound, Wrench } from "lucide-react";
import { usePathname } from "next/navigation";

import styles from "./terrain-mobile.module.css";

export function TerrainBottomNav({
  date,
  missionId,
}: {
  date: string;
  missionId: string | null;
}) {
  const pathname = usePathname();
  const dateParam = encodeURIComponent(date);
  const missionHref = missionId
    ? `/app/terrain/mission?date=${dateParam}&id=${encodeURIComponent(missionId)}`
    : `/app/terrain/mission?date=${dateParam}`;

  return (
    <nav
      className={styles.bottomNav}
      aria-label="Navigation terrain"
      style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
    >
      <Link href={`/app/terrain?date=${dateParam}`} data-active={pathname === "/app/terrain" ? "true" : undefined}>
        <CalendarDays size={18} />
        <span>Aujourd’hui</span>
      </Link>
      <Link href={missionHref} data-active={pathname.startsWith("/app/terrain/mission") ? "true" : undefined}>
        <Wrench size={18} />
        <span>Mission</span>
      </Link>
      <Link href={`/app/terrain/envois?date=${dateParam}`} data-active={pathname.startsWith("/app/terrain/envois") ? "true" : undefined}>
        <FileText size={18} />
        <span>Envois</span>
      </Link>
      <Link href={`/app/terrain/moi?date=${dateParam}`} data-active={pathname.startsWith("/app/terrain/moi") ? "true" : undefined}>
        <UserRound size={18} />
        <span>Moi</span>
      </Link>
    </nav>
  );
}
