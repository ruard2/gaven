import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";
import { sanitizeRequirements } from "@/lib/specific";

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
  const { title, category, shortDescription, whyValuable, concreteTasks, longDescription, firstStep, status, qualityWeights, minAge, specificRequirements, taskLevel } = body;
  const minAgeProvided = minAge !== undefined;
  const minAgeValue = Number.isInteger(minAge) && minAge > 0 && minAge < 120 ? minAge : null;
  const levelData = taskLevel !== undefined
    ? { taskLevel: taskLevel === "instap" || taskLevel === "verantwoordelijk" ? taskLevel : "regulier" }
    : {};

  // Blokkeer een update die alle kwaliteiten op 0 zet (vacature wordt onvindbaar).
  if (qualityWeights) {
    const positive = Object.values(qualityWeights as Record<string, number>).filter((w) => Number(w) > 0);
    if (positive.length === 0) {
      return NextResponse.json({ error: "Geef minstens één kwaliteit een gewicht boven 0 — anders vindt niemand deze vacature." }, { status: 400 });
    }
  }

  // Specifieke eisen: door de coördinator (bij)gestelde waarde opslaan; geen AI-call.
  const specificData = specificRequirements !== undefined
    ? { specificRequirements: JSON.stringify(sanitizeRequirements(specificRequirements)) }
    : {};

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
      ...(minAgeProvided && { minAge: minAgeValue }),
      ...levelData,
      ...specificData,
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
