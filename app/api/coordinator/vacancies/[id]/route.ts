import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

async function getVacancy(coordId: string, vacancyId: string) {
  return prisma.vacancy.findFirst({ where: { id: vacancyId, coordinatorId: coordId } });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await prisma.vacancy.findFirst({
    where: { id, coordinatorId: coord.id },
    include: { qualityWeights: true },
  });
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  return NextResponse.json(vacancy);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await getVacancy(coord.id, id);
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const body = await req.json();
  const { title, category, shortDescription, whyValuable, concreteTasks, longDescription, firstStep, status, qualityWeights } = body;

  const updated = await prisma.vacancy.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(category && { category }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(whyValuable !== undefined && { whyValuable }),
      ...(concreteTasks !== undefined && { concreteTasks }),
      ...(longDescription !== undefined && { longDescription }),
      ...(firstStep !== undefined && { firstStep }),
      ...(status && { status }),
      ...(qualityWeights
        ? {
            qualityWeights: {
              deleteMany: {},
              create: Object.entries(qualityWeights as Record<string, number>)
                .filter(([, w]) => Number(w) > 0)
                .map(([qualityId, weight]) => ({ qualityId, weight: Number(weight) })),
            },
          }
        : {}),
    },
    include: { qualityWeights: true },
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
