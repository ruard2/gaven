import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { send } from "@/lib/email";

export async function POST(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, subject, body, pageUrl } = await req.json();
  if (!to?.trim() || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Vul e-mailadres, onderwerp en tekst in" }, { status: 400 });
  }

  // Meerdere ontvangers gescheiden door komma of puntkomma
  const recipients = to
    .split(/[,;]/)
    .map((e: string) => e.trim())
    .filter(Boolean);

  const invalid = recipients.filter((e: string) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (recipients.length === 0 || invalid.length > 0) {
    return NextResponse.json({ error: `Ongeldig e-mailadres: ${invalid.join(", ") || to}` }, { status: 400 });
  }
  if (recipients.length > 50) {
    return NextResponse.json({ error: "Maximaal 50 ontvangers per keer" }, { status: 400 });
  }

  const bodyHtml = body.trim().replace(/\n/g, "<br>");
  const ctaBlock = pageUrl?.trim()
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${pageUrl.trim()}"
           style="background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
          Open de pagina
        </a>
       </div>
       <p style="font-size:13px;color:#6b7280;text-align:center;margin:0;">
         Of ga naar: <a href="${pageUrl.trim()}" style="color:#2563eb;">${pageUrl.trim()}</a>
       </p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#374151;">
      <div style="padding:32px 24px;">
        <p style="font-size:16px;line-height:1.7;margin:0 0 24px;">${bodyHtml}</p>
        ${ctaBlock}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          Je ontvangt dit bericht via Gavenmatch &bull; ${coord.organization.name}
        </p>
      </div>
    </div>
  `;

  const results = await Promise.allSettled(
    recipients.map((rcpt: string) =>
      send(rcpt, subject.trim(), html, coord.name || coord.organization.name, coord.email)
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed === recipients.length) {
    return NextResponse.json({ error: "Versturen mislukt" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: recipients.length - failed, failed });
}
