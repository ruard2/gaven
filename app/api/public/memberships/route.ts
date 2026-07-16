import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { send } from "@/lib/email";

// GET /api/public/memberships?participantId=xxx
export async function GET(req: NextRequest) {
  const participantId = req.nextUrl.searchParams.get("participantId");
  if (!participantId) return NextResponse.json({ error: "participantId verplicht" }, { status: 400 });

  const memberships = await prisma.vacancyMembership.findMany({
    where: { participantId },
    include: { vacancy: { select: { id: true, title: true, category: true, shortDescription: true } } },
  });

  return NextResponse.json(memberships);
}

// POST /api/public/memberships — add participant to one or more vacancies
export async function POST(req: NextRequest) {
  const { participantId, vacancyIds } = await req.json();

  if (!participantId || !Array.isArray(vacancyIds) || vacancyIds.length === 0) {
    return NextResponse.json({ error: "participantId en vacancyIds zijn verplicht" }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { organization: true },
  });
  if (!participant) return NextResponse.json({ error: "Deelnemer niet gevonden" }, { status: 404 });

  // Only allow vacancies from the same organization
  const vacancies = await prisma.vacancy.findMany({
    where: { id: { in: vacancyIds }, organizationId: participant.organizationId, status: "active" },
    include: { coordinator: true },
  });

  // Upsert memberships (ignore duplicates)
  const created = await Promise.all(
    vacancies.map((v) =>
      prisma.vacancyMembership.upsert({
        where: { participantId_vacancyId: { participantId, vacancyId: v.id } },
        create: { participantId, vacancyId: v.id },
        update: {},
      })
    )
  );

  // Notify coordinators per vacancy
  const coordinatorVacancies: Record<string, { coord: { name: string; email: string }; titles: string[] }> = {};
  for (const v of vacancies) {
    if (v.coordinator) {
      const key = v.coordinator.id;
      if (!coordinatorVacancies[key]) {
        coordinatorVacancies[key] = { coord: { name: v.coordinator.name, email: v.coordinator.email }, titles: [] };
      }
      coordinatorVacancies[key].titles.push(v.title);
    }
  }
  for (const { coord, titles } of Object.values(coordinatorVacancies)) {
    await send(
      coord.email,
      `${participant.name} doet mee — ${participant.organization.name}`,
      `<p>Hoi ${coord.name},</p>
      <p><strong>${participant.name}</strong> (${participant.email}) heeft aangegeven dat hij/zij al actief is bij:</p>
      <ul>${titles.map((t) => `<li>${t}</li>`).join("")}</ul>
      <p>Je kunt dit bekijken in je <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.gavenmatch.nl"}/coordinator/dashboard">coördinator-dashboard</a>.</p>`,
      "Gavenmatch"
    ).catch(() => {});
  }

  return NextResponse.json({ count: created.length });
}

// DELETE /api/public/memberships — remove participant from a vacancy
export async function DELETE(req: NextRequest) {
  const { participantId, vacancyId } = await req.json();
  if (!participantId || !vacancyId) {
    return NextResponse.json({ error: "participantId en vacancyId zijn verplicht" }, { status: 400 });
  }

  await prisma.vacancyMembership.deleteMany({ where: { participantId, vacancyId } });
  return NextResponse.json({ ok: true });
}
