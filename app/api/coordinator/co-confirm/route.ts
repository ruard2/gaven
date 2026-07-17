import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const action = req.nextUrl.searchParams.get("action"); // "confirm" | "reject"
  if (!token || !action) return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });

  const record = await prisma.coCoordinator.findUnique({
    where: { confirmToken: token },
    include: {
      coordinator: { select: { name: true, email: true } },
      vacancy: { select: { title: true, organization: { select: { name: true } } } },
    },
  });
  if (!record) return NextResponse.json({ error: "Link niet gevonden of al gebruikt" }, { status: 404 });
  if (record.status !== "pending") {
    const already = record.status === "confirmed" ? "bevestigd" : "afgewezen";
    return new Response(confirmHtml(`Deze aanvraag is al ${already}.`, record.vacancy.title, false), {
      headers: { "Content-Type": "text/html" },
    });
  }

  await prisma.coCoordinator.update({
    where: { confirmToken: token },
    data: { status: action === "confirm" ? "confirmed" : "rejected" },
  });

  const msg = action === "confirm"
    ? `${record.coordinator.name} is bevestigd als mede-coördinator voor ${record.vacancy.title}.`
    : `De aanvraag van ${record.coordinator.name} voor ${record.vacancy.title} is afgewezen. De beheerder wordt op de hoogte gesteld.`;

  return new Response(confirmHtml(msg, record.vacancy.title, action === "confirm"), {
    headers: { "Content-Type": "text/html" },
  });
}

function confirmHtml(message: string, vacancyTitle: string, success: boolean) {
  const color = success ? "#16a34a" : "#dc2626";
  const icon = success ? "✓" : "✕";
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Gavenmatch</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
  .card{background:white;border-radius:16px;padding:40px 32px;max-width:440px;text-align:center;border:1px solid #e5e7eb;}
  .icon{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;color:white;margin:0 auto 20px;background:${color};}
  h1{font-size:20px;color:#111827;margin:0 0 8px;}p{color:#6b7280;font-size:15px;margin:0;}
  </style></head><body><div class="card">
  <div class="icon">${icon}</div>
  <h1>${vacancyTitle}</h1>
  <p>${message}</p>
  </div></body></html>`;
}
