import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import crypto from "crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const coord = await prisma.coordinator.findFirst({
    where: { id, organization: { adminId } },
    include: {
      organization: { select: { name: true } },
      vacancies: {
        select: {
          id: true, title: true, category: true, status: true,
          _count: { select: { applications: true, memberships: true } },
        },
      },
    },
  });
  if (!coord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recentApplications = await prisma.application.findMany({
    where: { vacancy: { coordinatorId: id } },
    include: {
      participant: { select: { name: true, email: true, phone: true } },
      vacancy: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const members = await prisma.vacancyMembership.findMany({
    where: { vacancy: { coordinatorId: id } },
    include: {
      participant: { select: { name: true, email: true, phone: true } },
      vacancy: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    id: coord.id,
    name: coord.name,
    email: coord.email,
    status: coord.status,
    createdAt: coord.createdAt,
    inviteExpiresAt: coord.inviteExpiresAt,
    organizationName: coord.organization.name,
    vacancies: coord.vacancies,
    recentApplications,
    members,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const coord = await prisma.coordinator.findFirst({
    where: { id, organization: { adminId } },
    include: { organization: true },
  });
  if (!coord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, email, status, vacancyIds } = await req.json();

  const updated = await prisma.coordinator.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(status && { status }),
    },
  });

  if (vacancyIds !== undefined) {
    // Remove coord from vacancies no longer assigned
    await prisma.vacancy.updateMany({
      where: { coordinatorId: id, organizationId: coord.organizationId },
      data: { coordinatorId: null },
    });
    if (vacancyIds.length) {
      await prisma.vacancy.updateMany({
        where: { id: { in: vacancyIds }, organizationId: coord.organizationId },
        data: { coordinatorId: id },
      });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const coord = await prisma.coordinator.findFirst({
    where: { id, organization: { adminId } },
  });
  if (!coord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unlink vacancies
  await prisma.vacancy.updateMany({ where: { coordinatorId: id }, data: { coordinatorId: null } });
  await prisma.coordinator.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Resend invite link
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const coord = await prisma.coordinator.findFirst({
    where: { id, organization: { adminId } },
    include: { organization: true },
  });
  if (!coord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.coordinator.update({ where: { id }, data: { inviteToken, inviteExpiresAt, status: "invited" } });

  const appUrl = process.env.APP_URL || "https://www.gavenmatch.nl";
  const activateUrl = `${appUrl}/coordinator/activeer/${inviteToken}`;

  if (process.env.BREVO_API_KEY) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: coord.organization.name, email: from },
        to: [{ email: coord.email, name: coord.name }],
        subject: `Nieuwe uitnodigingslink — ${coord.organization.name}`,
        htmlContent: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#1d4ed8;">Nieuwe uitnodigingslink, ${coord.name}</h2>
          <p>Gebruik onderstaande link om je coördinatoraccount te activeren:</p>
          <a href="${activateUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Account activeren</a>
          <p style="font-size:13px;color:#6b7280;margin-top:16px;">${activateUrl}</p>
        </div>`,
      }),
    }).catch((e) => console.error("Resend invite error:", e));
  }

  return NextResponse.json({ ok: true, activateUrl });
}
