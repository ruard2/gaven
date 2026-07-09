import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendApplicationEmail } from "@/lib/email";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { participantId, vacancyId, responseType, message, firstStepChoice, availabilityNote, matchedQualities } = body;

  if (!participantId || !vacancyId || !responseType) {
    return NextResponse.json({ error: "Ontbrekende velden" }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant) return NextResponse.json({ error: "Deelnemer niet gevonden" }, { status: 404 });

  const vacancy = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    include: { organization: true },
  });
  if (!vacancy) return NextResponse.json({ error: "Taak niet gevonden" }, { status: 404 });

  const application = await prisma.application.create({
    data: {
      organizationId: participant.organizationId,
      participantId,
      vacancyId,
      responseType,
      message: message || null,
      firstStepChoice: firstStepChoice || null,
      availabilityNote: availabilityNote || null,
    },
  });

  // Resolve quality labels
  const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);
  const qualityLabels = (matchedQualities || []).map(
    (id: string) => allQualities.find((q) => q.id === id)?.label || id
  );

  // E-mail versturen zonder de response te blokkeren (fire-and-forget)
  sendApplicationEmail({
    contactPersonEmail: vacancy.contactPersonEmail,
    contactPersonName: vacancy.contactPersonName,
    vacancyTitle: vacancy.title,
    organizationName: vacancy.organization.name,
    participantName: participant.name,
    participantEmail: participant.email,
    participantPhone: participant.phone,
    responseType,
    message,
    firstStepChoice,
    availabilityNote,
    matchedQualities: qualityLabels,
  }).catch((e) => console.error("Email error:", e));

  return NextResponse.json({ applicationId: application.id }, { status: 201 });
}
