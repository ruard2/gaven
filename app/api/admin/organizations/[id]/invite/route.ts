import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  await prisma.inviteToken.create({
    data: { token, organizationId: id, label: "Uitnodigingslink" },
  });

  return NextResponse.json({ token });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tokens = await prisma.inviteToken.findMany({
    where: { organizationId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tokens);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { tokenId } = await req.json();

  const token = await prisma.inviteToken.findFirst({
    where: { id: tokenId, organization: { adminId } },
  });
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.inviteToken.delete({ where: { id: tokenId } });
  return NextResponse.json({ ok: true });
}
