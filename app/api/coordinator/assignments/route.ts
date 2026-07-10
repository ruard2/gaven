import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoordinator } from "@/lib/coordinatorAuth";

export async function GET() {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vacancies = await prisma.vacancy.findMany({
    where: { organizationId: coord.organizationId },
    select: { id: true, title: true, category: true, coordinatorId: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(
    vacancies.map((v) => ({
      id: v.id,
      title: v.title,
      category: v.category,
      assigned: v.coordinatorId === coord.id,
      taken: v.coordinatorId !== null && v.coordinatorId !== coord.id,
    }))
  );
}

export async function PATCH(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { add = [], remove = [] } = await req.json();

  if (add.length > 0) {
    await prisma.vacancy.updateMany({
      where: {
        id: { in: add },
        organizationId: coord.organizationId,
        OR: [{ coordinatorId: null }, { coordinatorId: coord.id }],
      },
      data: { coordinatorId: coord.id },
    });
  }

  if (remove.length > 0) {
    await prisma.vacancy.updateMany({
      where: { id: { in: remove }, coordinatorId: coord.id },
      data: { coordinatorId: null },
    });
  }

  return NextResponse.json({ ok: true });
}
