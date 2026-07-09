import { NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vacancies = await prisma.vacancy.findMany({
    where: { coordinatorId: coord.id },
    include: {
      applications: { select: { id: true, status: true, responseType: true, createdAt: true, participant: { select: { name: true, email: true, phone: true } } } },
      memberships: { select: { id: true, description: true, createdAt: true, participant: { select: { name: true, email: true } } } },
      qualityWeights: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(vacancies);
}
