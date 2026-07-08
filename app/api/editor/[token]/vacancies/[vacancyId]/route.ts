import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST — submit proposed edit for a vacancy via editor token
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string; vacancyId: string }> }) {
  const { token, vacancyId } = await params;

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: "Ongeldige link" }, { status: 403 });
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link verlopen" }, { status: 410 });
  }

  const vacancy = await prisma.vacancy.findFirst({
    where: { id: vacancyId, organizationId: invite.organizationId },
  });
  if (!vacancy) return NextResponse.json({ error: "Taak niet gevonden" }, { status: 404 });

  const body = await req.json();
  const { editorName, ...proposedData } = body;

  await prisma.vacancyProposal.create({
    data: {
      vacancyId,
      proposedData: JSON.stringify(proposedData),
      editorName: editorName || null,
      status: "pending",
    },
  });

  return NextResponse.json({ ok: true });
}
