import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";
import { sanitizeRequirements } from "@/lib/specific";

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

export async function POST(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, category, shortDescription, whyValuable, concreteTasks, longDescription, firstStep, qualityWeights, minAge, specificRequirements, taskLevel } = await req.json();
  const minAgeValue = Number.isInteger(minAge) && minAge > 0 && minAge < 120 ? minAge : null;
  const level = taskLevel === "instap" || taskLevel === "verantwoordelijk" ? taskLevel : "regulier";
  if (!title?.trim() || !category?.trim()) {
    return NextResponse.json({ error: "Naam en categorie zijn verplicht" }, { status: 400 });
  }

  // Een vacature zonder kwaliteiten komt in geen enkele match voor. Blokkeer opslaan.
  const positiveWeights = Object.values((qualityWeights || {}) as Record<string, number>).filter((w) => Number(w) > 0);
  if (positiveWeights.length === 0) {
    return NextResponse.json({ error: "Geef minstens één passende kwaliteit een gewicht boven 0 — anders vindt niemand deze vacature. Klik op ‘Bereken’ of stel de schuivers in." }, { status: 400 });
  }

  const cleanRequirements = sanitizeRequirements(specificRequirements);

  const vacancy = await prisma.vacancy.create({
    data: {
      organizationId: coord.organizationId,
      coordinatorId: coord.id,
      title: title.trim(),
      category: category.trim(),
      shortDescription: shortDescription?.trim() || "",
      whyValuable: whyValuable?.trim() || null,
      concreteTasks: concreteTasks?.trim() || null,
      longDescription: longDescription?.trim() || null,
      firstStep: firstStep?.trim() || null,
      contactPersonName: coord.name,
      contactPersonEmail: coord.email,
      status: "active",
      specificRequirements: JSON.stringify(cleanRequirements),
      minAge: minAgeValue,
      taskLevel: level,
      ...(qualityWeights && Object.keys(qualityWeights).length > 0
        ? {
            qualityWeights: {
              create: Object.entries(qualityWeights as Record<string, number>)
                .filter(([, w]) => Number(w) > 0)
                .map(([qualityId, weight]) => ({ qualityId, weight: Number(weight) })),
            },
          }
        : {}),
    },
    include: { applications: true, memberships: true, qualityWeights: true },
  });

  return NextResponse.json(vacancy, { status: 201 });
}
