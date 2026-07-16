import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ ok: true }); // don't leak

  const coord = await prisma.coordinator.findFirst({
    where: { email: email.trim().toLowerCase(), status: "active" },
    include: { organization: true },
  });

  if (coord) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.coordinatorResetToken.create({
      data: { coordinatorId: coord.id, token, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    });

    const appUrl = process.env.APP_URL || "https://www.gavenmatch.nl";
    const resetUrl = `${appUrl}/coordinator/wachtwoord-instellen/${token}`;

    if (process.env.BREVO_API_KEY) {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
      fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: coord.organization.name, email: from },
          to: [{ email: coord.email, name: coord.name }],
          subject: "Wachtwoord opnieuw instellen — Gavenmatch",
          htmlContent: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#1d4ed8;">Wachtwoord opnieuw instellen</h2>
            <p>Hoi ${coord.name}, klik op de link hieronder. Geldig 2 uur.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Wachtwoord instellen</a>
            <p style="font-size:13px;color:#6b7280;margin-top:16px;">${resetUrl}</p>
          </div>`,
        }),
      }).catch((e) => console.error("Reset email error:", e));
    }
  }

  return NextResponse.json({ ok: true });
}
