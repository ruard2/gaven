import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import crypto from "crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const coordinators = await prisma.coordinator.findMany({
    where: { organizationId: id },
    include: { vacancies: { select: { id: true, title: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(coordinators);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, email, vacancyIds } = await req.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "E-mail is verplicht" }, { status: 400 });
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Status "pending" — nog niet uitgenodigd, alleen link gegenereerd
  const coordinator = await prisma.coordinator.create({
    data: {
      organizationId: id,
      name: name?.trim() || email.trim().split("@")[0],
      email: email.trim().toLowerCase(),
      inviteToken,
      inviteExpiresAt,
      status: "pending",
    },
  });

  // Koppel vacatures
  if (vacancyIds?.length) {
    await prisma.vacancy.updateMany({
      where: { id: { in: vacancyIds }, organizationId: id },
      data: { coordinatorId: coordinator.id },
    });
  }

  // Haal vacature-titels op voor de share-stap
  const linkedVacancies = vacancyIds?.length
    ? await prisma.vacancy.findMany({
        where: { id: { in: vacancyIds }, organizationId: id },
        select: { title: true },
      })
    : [];

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const activateUrl = `${appUrl}/coordinator/activeer/${inviteToken}`;

  return NextResponse.json({
    ...coordinator,
    activateUrl,
    vacancyTitles: linkedVacancies.map((v) => v.title),
  }, { status: 201 });
}
