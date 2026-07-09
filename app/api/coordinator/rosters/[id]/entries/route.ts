import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoordinator } from "@/lib/coordinatorAuth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: rosterId } = await params;
  const roster = await prisma.roster.findFirst({ where: { id: rosterId, coordinatorId: coord.id } });
  if (!roster) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const { name, email, date, role, notes } = await req.json();
  const entry = await prisma.rosterEntry.create({
    data: {
      rosterId,
      name: name || "—",
      email: email || null,
      date: date ? new Date(date) : null,
      role: role || null,
      notes: notes || null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
