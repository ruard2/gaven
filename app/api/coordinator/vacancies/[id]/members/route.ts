import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: vacancyId } = await params;

  const vacancy = await prisma.vacancy.findFirst({ where: { id: vacancyId, coordinatorId: coord.id } });
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const { name, email } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Naam en e-mail zijn verplicht" }, { status: 400 });
  }

  // Upsert participant
  let participant = await prisma.participant.findFirst({
    where: { organizationId: coord.organizationId, email: email.trim().toLowerCase() },
  });
  if (!participant) {
    participant = await prisma.participant.create({
      data: { organizationId: coord.organizationId, name: name.trim(), email: email.trim().toLowerCase() },
    });
  }

  const membership = await prisma.vacancyMembership.upsert({
    where: { participantId_vacancyId: { participantId: participant.id, vacancyId } },
    update: {},
    create: { participantId: participant.id, vacancyId },
    include: { participant: { select: { name: true, email: true } } },
  });

  return NextResponse.json(membership, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: vacancyId } = await params;

  const vacancy = await prisma.vacancy.findFirst({ where: { id: vacancyId, coordinatorId: coord.id } });
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const membershipId = req.nextUrl.searchParams.get("membershipId");
  if (!membershipId) return NextResponse.json({ error: "membershipId verplicht" }, { status: 400 });

  await prisma.vacancyMembership.delete({ where: { id: membershipId } });
  return NextResponse.json({ ok: true });
}
