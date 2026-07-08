import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { organizationId, name, email, phone } = await req.json();

  if (!organizationId || !name || !email) {
    return NextResponse.json({ error: "Naam en e-mailadres zijn verplicht" }, { status: 400 });
  }

  const org = await prisma.organization.findFirst({
    where: { id: organizationId, isActive: true },
  });
  if (!org) return NextResponse.json({ error: "Organisatie niet gevonden" }, { status: 404 });

  // Reuse existing participant with same email in same org
  let participant = await prisma.participant.findFirst({
    where: { organizationId, email },
  });

  if (!participant) {
    participant = await prisma.participant.create({
      data: { organizationId, name, email, phone: phone || null },
    });
  } else {
    participant = await prisma.participant.update({
      where: { id: participant.id },
      data: { name, phone: phone || null },
    });
  }

  return NextResponse.json({ participantId: participant.id }, { status: 201 });
}
