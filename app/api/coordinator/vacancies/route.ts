import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vacancies = await prisma.vacancy.findMany({
    where: { organizationId: coord.organizationId },
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

  const { title, category, shortDescription, whyValuable, concreteTasks, firstStep } = await req.json();
  if (!title?.trim() || !category?.trim() || !shortDescription?.trim()) {
    return NextResponse.json({ error: "Naam, categorie en korte omschrijving zijn verplicht" }, { status: 400 });
  }

  const vacancy = await prisma.vacancy.create({
    data: {
      organizationId: coord.organizationId,
      coordinatorId: coord.id,
      title: title.trim(),
      category: category.trim(),
      shortDescription: shortDescription.trim(),
      whyValuable: whyValuable?.trim() || null,
      concreteTasks: concreteTasks?.trim() || null,
      firstStep: firstStep?.trim() || null,
      contactPersonName: coord.name,
      contactPersonEmail: coord.email,
      status: "active",
    },
    include: { applications: true, memberships: true, qualityWeights: true },
  });

  return NextResponse.json(vacancy, { status: 201 });
}
