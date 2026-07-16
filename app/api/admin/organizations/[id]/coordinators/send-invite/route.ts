import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });

  const { coordId, subject, body } = await req.json();
  if (!coordId || !body) return NextResponse.json({ error: "coordId en body verplicht" }, { status: 400 });

  const coordinator = await prisma.coordinator.findFirst({ where: { id: coordId, organizationId: id } });
  if (!coordinator) return NextResponse.json({ error: "Coördinator niet gevonden" }, { status: 404 });

  if (!process.env.BREVO_API_KEY) {
    return NextResponse.json({ error: "E-mail versturen niet geconfigureerd" }, { status: 503 });
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const htmlBody = body
    .split("\n")
    .map((line: string) => line.trim() === "" ? "<br/>" : `<p style="margin:0 0 8px 0">${line}</p>`)
    .join("");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: org.name, email: from },
      replyTo: admin?.email ? { email: admin.email } : undefined,
      to: [{ email: coordinator.email, name: coordinator.name }],
      subject: subject || `Uitnodiging coördinator — ${org.name}`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;font-size:15px;line-height:1.6;">
          ${htmlBody}
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Brevo error:", err);
    return NextResponse.json({ error: "Versturen mislukt" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
