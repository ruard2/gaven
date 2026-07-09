import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

async function getVacancy(coordId: string, vacancyId: string) {
  return prisma.vacancy.findFirst({ where: { id: vacancyId, coordinatorId: coordId } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await getVacancy(coord.id, id);
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const body = await req.json();
  const { title, shortDescription, whyValuable, concreteTasks, firstStep, status } = body;

  const updated = await prisma.vacancy.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(shortDescription && { shortDescription }),
      ...(whyValuable !== undefined && { whyValuable }),
      ...(concreteTasks !== undefined && { concreteTasks }),
      ...(firstStep !== undefined && { firstStep }),
      ...(status && { status }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await getVacancy(coord.id, id);
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.vacancy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
