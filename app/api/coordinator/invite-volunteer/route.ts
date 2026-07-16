import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { send } from "@/lib/email";

export async function POST(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, subject, body, ctaLabel, ctaUrl } = await req.json();
  if (!to?.trim() || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Vul e-mailadres, onderwerp en tekst in" }, { status: 400 });
  }

  const bodyHtml = body.trim().replace(/\n/g, "<br>");
  const ctaBlock = ctaLabel?.trim() && ctaUrl?.trim()
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${ctaUrl.trim()}"
           style="background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
          ${ctaLabel.trim()}
        </a>
       </div>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#374151;">
      <div style="padding:32px 24px;">
        <p style="font-size:16px;line-height:1.7;margin:0 0 24px;">${bodyHtml}</p>
        ${ctaBlock}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          Je ontvangt deze uitnodiging via Gavenroute &bull; ${coord.organization.name}
        </p>
      </div>
    </div>
  `;

  await send(to.trim(), subject.trim(), html, coord.name || coord.organization.name, coord.email);
  return NextResponse.json({ ok: true });
}
