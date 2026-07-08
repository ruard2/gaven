import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({
    where: { id, adminId },
    include: {
      vacancies: {
        include: { qualityWeights: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { participants: true, applications: true } },
    },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.organization.update({
    where: { id },
    data: {
      name: body.name ?? org.name,
      organizationType: body.organizationType ?? org.organizationType,
      place: body.place ?? org.place,
      primaryColor: body.primaryColor ?? org.primaryColor,
      welcomeText: body.welcomeText ?? org.welcomeText,
      contactEmail: body.contactEmail ?? org.contactEmail,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.organization.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
