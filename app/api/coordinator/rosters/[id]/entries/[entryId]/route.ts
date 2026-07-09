import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoordinator } from "@/lib/coordinatorAuth";

type Params = { params: Promise<{ id: string; entryId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: rosterId, entryId } = await params;
  const roster = await prisma.roster.findFirst({ where: { id: rosterId, coordinatorId: coord.id } });
  if (!roster) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const { name, email, date, role, notes } = await req.json();
  const entry = await prisma.rosterEntry.update({
    where: { id: entryId },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email || null }),
      ...(date !== undefined && { date: date ? new Date(date) : null }),
      ...(role !== undefined && { role: role || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: rosterId, entryId } = await params;
  const roster = await prisma.roster.findFirst({ where: { id: rosterId, coordinatorId: coord.id } });
  if (!roster) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  await prisma.rosterEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
