import { NextResponse } from "next/server";

import { loadOrganizationSnapshot, snapshotToCsv } from "@/lib/export/organization";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await loadOrganizationSnapshot();
  if (!snapshot) return NextResponse.json({ error: "Export indisponible" }, { status: 403 });

  return new NextResponse(`\uFEFF${snapshotToCsv(snapshot)}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sesira-export-${safeDate(snapshot.generated_at)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "data" : date.toISOString().slice(0, 10);
}
