import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { send } from "@/lib/email";

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

  const htmlBody = body
    .split("\n")
    .map((line: string) => line.trim() === "" ? "<br/>" : `<p style="margin:0 0 8px 0">${line}</p>`)
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;font-size:15px;line-height:1.6;">
      ${htmlBody}
    </div>
  `;

  try {
    await send(
      coordinator.email,
      subject || `Uitnodiging coördinator — ${org.name}`,
      html,
      org.name,
      admin?.email,
    );
    // Status bijwerken naar 'invited' nu de uitnodiging daadwerkelijk verstuurd is
    await prisma.coordinator.update({ where: { id: coordId }, data: { status: "invited" } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Send invite error:", e);
    return NextResponse.json({ error: "Versturen mislukt" }, { status: 502 });
  }
}
