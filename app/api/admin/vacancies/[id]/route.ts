import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { sanitizeRequirements } from "@/lib/specific";

async function getVacancyForAdmin(id: string, adminId: string) {
  return prisma.vacancy.findFirst({
    where: { id, organization: { adminId } },
    include: { qualityWeights: true },
  });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const vacancy = await getVacancyForAdmin(id, adminId);
  if (!vacancy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vacancy);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await getVacancyForAdmin(id, adminId);
  if (!vacancy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { qualityWeights, minAge, specificRequirements, taskLevel, ...rest } = body;
  const levelData = taskLevel !== undefined
    ? { taskLevel: taskLevel === "instap" || taskLevel === "verantwoordelijk" ? taskLevel : "regulier" }
    : {};
  const minAgeData = minAge !== undefined
    ? { minAge: Number.isInteger(minAge) && minAge > 0 && minAge < 120 ? minAge : null }
    : {};

  // Blokkeer een update die alle kwaliteiten op 0 zet (vacature wordt onvindbaar).
  if (qualityWeights) {
    const positive = Object.values(qualityWeights as Record<string, number>).filter((w) => Number(w) > 0);
    if (positive.length === 0) {
      return NextResponse.json({ error: "Geef minstens één kwaliteit een gewicht boven 0 — anders vindt niemand deze vacature." }, { status: 400 });
    }
  }

  // Specifieke eisen: door de admin (bij)gestelde waarde opslaan; geen AI-call.
  const specificData = specificRequirements !== undefined
    ? { specificRequirements: JSON.stringify(sanitizeRequirements(specificRequirements)) }
    : {};

  const updated = await prisma.vacancy.update({
    where: { id },
    data: {
      ...rest,
      ...minAgeData,
      ...levelData,
      ...specificData,
      ...(qualityWeights
        ? {
            qualityWeights: {
              deleteMany: {},
              create: Object.entries(qualityWeights).map(([qualityId, weight]) => ({
                qualityId,
                weight: Number(weight),
              })),
            },
          }
        : {}),
    },
    include: { qualityWeights: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await getVacancyForAdmin(id, adminId);
  if (!vacancy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vacancy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
