import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newEmail, newName, vacancyIds } = await req.json();
  if (!newEmail?.trim()) return NextResponse.json({ error: "E-mail verplicht" }, { status: 400 });

  const email = newEmail.trim().toLowerCase();

  // Check if coordinator already exists in this org
  let newCoord = await prisma.coordinator.findFirst({
    where: { email, organizationId: coord.organizationId },
  });

  if (!newCoord) {
    const inviteToken = crypto.randomBytes(32).toString("hex");
    newCoord = await prisma.coordinator.create({
      data: {
        organizationId: coord.organizationId,
        name: newName?.trim() || email,
        email,
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "invited",
      },
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const activateUrl = `${appUrl}/coordinator/activeer/${inviteToken}`;

    if (process.env.BREVO_API_KEY) {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
      fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: coord.organization.name, email: from },
          to: [{ email, name: newCoord.name }],
          subject: `Uitnodiging coördinator — ${coord.organization.name}`,
          htmlContent: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#1d4ed8;">Je bent uitgenodigd als coördinator</h2>
            <p>${coord.name} heeft je uitgenodigd om taken over te nemen bij <strong>${coord.organization.name}</strong>.</p>
            <a href="${activateUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Account activeren</a>
          </div>`,
        }),
      }).catch((e) => console.error("Transfer invite error:", e));
    }
  }

  // Transfer specified vacancies (or all if not specified)
  const ids = vacancyIds?.length
    ? vacancyIds
    : (await prisma.vacancy.findMany({ where: { coordinatorId: coord.id }, select: { id: true } })).map((v: { id: string }) => v.id);

  await prisma.vacancy.updateMany({ where: { id: { in: ids }, coordinatorId: coord.id }, data: { coordinatorId: newCoord.id } });

  return NextResponse.json({ ok: true });
}
