import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 15)) {
    return NextResponse.json({ error: "Te veel verzoeken, probeer het zo weer." }, { status: 429 });
  }
  const { organizationId, name, email, phone, birthYear } = await req.json();

  if (!organizationId || !name || !email) {
    return NextResponse.json({ error: "Naam en e-mailadres zijn verplicht" }, { status: 400 });
  }

  const by = Number.isInteger(birthYear) && birthYear >= 1900 && birthYear <= new Date().getFullYear()
    ? birthYear
    : null;

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
      data: { organizationId, name, email, phone: phone || null, birthYear: by },
    });
  } else {
    participant = await prisma.participant.update({
      where: { id: participant.id },
      data: { name, phone: phone || null, ...(by != null ? { birthYear: by } : {}) },
    });
  }

  return NextResponse.json({ participantId: participant.id }, { status: 201 });
}
