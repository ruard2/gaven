import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participants = await prisma.participant.findMany({
    where: { organizationId: id },
    include: {
      profile: { select: { completedAt: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(participants);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { participantId, name, email, phone } = await req.json();
  if (!participantId) return NextResponse.json({ error: "participantId verplicht" }, { status: 400 });

  const participant = await prisma.participant.findFirst({ where: { id: participantId, organizationId: id } });
  if (!participant) return NextResponse.json({ error: "Deelnemer niet gevonden" }, { status: 404 });

  const updated = await prisma.participant.update({
    where: { id: participantId },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
    },
    include: { profile: { select: { completedAt: true } }, _count: { select: { applications: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const participantId = searchParams.get("participantId");
  if (!participantId) return NextResponse.json({ error: "participantId verplicht" }, { status: 400 });

  const participant = await prisma.participant.findFirst({ where: { id: participantId, organizationId: id } });
  if (!participant) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.participant.delete({ where: { id: participantId } });
  return NextResponse.json({ ok: true });
}
