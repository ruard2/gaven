import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { send } from "@/lib/email";

// Called daily by Railway cron. Protected by CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all rosters with entries that haven't been reminded yet
  const rosters = await prisma.roster.findMany({
    include: {
      coordinator: true,
      entries: {
        where: {
          reminderSent: false,
          email: { not: null },
          date: { not: null },
        },
      },
    },
  });

  let sent = 0;
  for (const roster of rosters) {
    for (const entry of roster.entries) {
      if (!entry.date || !entry.email) continue;

      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((entryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil === roster.reminderDays) {
        const senderName = roster.senderName || roster.coordinator.name;
        const dateStr = entryDate.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

        await send(
          entry.email,
          `Herinnering: ${entry.role || "dienst"} op ${dateStr}`,
          `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827;">
            <h2 style="color:#1d4ed8;">Herinnering voor je dienst</h2>
            <p>Hoi ${entry.name},</p>
            <p>Dit is een vriendelijke herinnering dat je ingepland staat${entry.role ? ` als <strong>${entry.role}</strong>` : ""} op <strong>${dateStr}</strong>.</p>
            ${entry.notes ? `<p style="background:#f3f4f6;border-radius:8px;padding:12px;font-size:14px;color:#374151;">${entry.notes}</p>` : ""}
            <p>Vragen? Neem contact op met de coördinator.</p>
            <p style="font-size:12px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">
              Verstuurd via Gavenroute &bull; Coördinator: ${senderName}
            </p>
          </div>`,
          `Coördinator ${senderName}`,
        ).catch((e) => console.error(`Reminder failed for ${entry.email}:`, e));

        await prisma.rosterEntry.update({ where: { id: entry.id }, data: { reminderSent: true } });
        sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, checked: rosters.reduce((s, r) => s + r.entries.length, 0) });
}
