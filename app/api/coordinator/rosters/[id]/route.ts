import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoordinator } from "@/lib/coordinatorAuth";

type Params = { params: Promise<{ id: string }> };

async function getOwnRoster(coordinatorId: string, id: string) {
  return prisma.roster.findFirst({ where: { id, coordinatorId } });
}

export async function GET(_: NextRequest, { params }: Params) {
  const coord = await requireCoordinator();
  const { id } = await params;
  const roster = await prisma.roster.findFirst({
    where: { id, coordinatorId: coord.id },
    include: { entries: { orderBy: { date: "asc" } } },
  });
  if (!roster) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(roster);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const coord = await requireCoordinator();
  const { id } = await params;
  const roster = await getOwnRoster(coord.id, id);
  if (!roster) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const { title, reminderDays, senderName } = await req.json();
  const updated = await prisma.roster.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(reminderDays !== undefined && { reminderDays }),
      ...(senderName !== undefined && { senderName }),
    },
    include: { entries: { orderBy: { date: "asc" } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const coord = await requireCoordinator();
  const { id } = await params;
  const roster = await getOwnRoster(coord.id, id);
  if (!roster) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  await prisma.roster.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
