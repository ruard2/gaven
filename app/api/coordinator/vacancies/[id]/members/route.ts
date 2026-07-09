import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

// DELETE /api/coordinator/vacancies/[id]/members?participantId=xxx
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await prisma.vacancy.findFirst({ where: { id, coordinatorId: coord.id } });
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const participantId = req.nextUrl.searchParams.get("participantId");
  if (!participantId) return NextResponse.json({ error: "participantId verplicht" }, { status: 400 });

  await prisma.vacancyMembership.deleteMany({ where: { vacancyId: id, participantId } });
  return NextResponse.json({ ok: true });
}
