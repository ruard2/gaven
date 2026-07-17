import { NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [vacancies, coords] = await Promise.all([
    prisma.vacancy.findMany({
      where: { organizationId: coord.organizationId },
      select: { title: true, category: true },
    }),
    prisma.coordinator.findMany({
      where: { organizationId: coord.organizationId, roleTitle: { not: null } },
      select: { roleTitle: true },
    }),
  ]);

  // Titels uit vacatures + rollen die collega's al gebruiken, ontdubbeld
  const byTitle = new Map<string, string>();
  for (const v of vacancies) byTitle.set(v.title, v.category);
  for (const c of coords) if (c.roleTitle && !byTitle.has(c.roleTitle)) byTitle.set(c.roleTitle, "");

  const options = [...byTitle.entries()]
    .map(([title, category]) => ({ title, category }))
    .sort((a, b) => a.title.localeCompare(b.title, "nl"));

  return NextResponse.json(options);
}
