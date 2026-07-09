import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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
  const inviteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const coordinator = await prisma.coordinator.create({
    data: {
      organizationId: id,
      name: name?.trim() || email.trim().split("@")[0],
      email: email.trim().toLowerCase(),
      inviteToken,
      inviteExpiresAt,
      status: "invited",
    },
  });

  // Link vacancies
  if (vacancyIds?.length) {
    await prisma.vacancy.updateMany({
      where: { id: { in: vacancyIds }, organizationId: id },
      data: { coordinatorId: coordinator.id },
    });
  }

  // Send invite email
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const activateUrl = `${appUrl}/coordinator/activeer/${inviteToken}`;

  if (process.env.BREVO_API_KEY) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: org.name, email: from },
        to: [{ email: coordinator.email, name: coordinator.name }],
        subject: `Uitnodiging coördinator — ${org.name}`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;">
            <h2 style="color:#1d4ed8;">Welkom als coördinator, ${coordinator.name}!</h2>
            <p>Je bent uitgenodigd om taken te beheren voor <strong>${org.name}</strong> via Gavenroute.</p>
            <p>Klik op de knop hieronder om je account te activeren en een wachtwoord in te stellen:</p>
            <a href="${activateUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
              Account activeren
            </a>
            <p style="font-size:13px;color:#6b7280;">Deze link is 30 dagen geldig. Werkt de knop niet? Kopieer: ${activateUrl}</p>
          </div>
        `,
      }),
    }).catch((e) => console.error("Invite email error:", e));
  }

  return NextResponse.json({ ...coordinator, activateUrl }, { status: 201 });
}
