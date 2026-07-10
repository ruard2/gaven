import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vacancyId = req.nextUrl.searchParams.get("vacancyId");
  const rosters = await prisma.roster.findMany({
    where: { coordinatorId: coord.id, ...(vacancyId ? { vacancyId } : {}) },
    include: { entries: { orderBy: { date: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rosters);
}

export async function POST(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contentType = req.headers.get("content-type") || "";

  // JSON: create empty roster
  if (contentType.includes("application/json")) {
    const { title, reminderDays, senderName, vacancyId } = await req.json();
    const roster = await prisma.roster.create({
      data: {
        coordinatorId: coord.id,
        title: title || "Nieuw rooster",
        reminderDays: reminderDays ?? 3,
        senderName: senderName || coord.name,
        ...(vacancyId ? { vacancyId } : {}),
      },
      include: { entries: true },
    });
    return NextResponse.json(roster, { status: 201 });
  }

  // Multipart: parse uploaded file
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "Geüpload rooster";
  const reminderDays = parseInt((formData.get("reminderDays") as string) || "3", 10);

  if (!file) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  // Try to detect columns by common Dutch/English header names
  function findCol(row: Record<string, unknown>, ...candidates: string[]): string {
    const keys = Object.keys(row);
    for (const c of candidates) {
      const match = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
      if (match) return String(row[match] ?? "");
    }
    return "";
  }

  function findRawCol(row: Record<string, unknown>, ...candidates: string[]): unknown {
    const keys = Object.keys(row);
    for (const c of candidates) {
      const match = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
      if (match) return row[match];
    }
    return undefined;
  }

  const entries = rows
    .filter((r) => Object.values(r).some((v) => v !== ""))
    .map((r) => {
      const rawDate = findRawCol(r, "datum", "date", "dag", "wanneer");
      let date: Date | null = null;
      if (rawDate) {
        if (rawDate instanceof Date) {
          date = rawDate;
        } else {
          const parsed = new Date(String(rawDate));
          if (!isNaN(parsed.getTime())) date = parsed;
        }
      }
      return {
        name: findCol(r, "naam", "name", "persoon", "vrijwilliger") || "—",
        email: findCol(r, "email", "mail", "e-mail") || null,
        date: date || null,
        role: findCol(r, "rol", "role", "taak", "functie", "dienst") || null,
        notes: findCol(r, "opmerking", "note", "toelichting", "notitie") || null,
      };
    });

  const roster = await prisma.roster.create({
    data: {
      coordinatorId: coord.id,
      title,
      reminderDays,
      senderName: coord.name,
      entries: { create: entries },
    },
    include: { entries: { orderBy: { date: "asc" } } },
  });

  return NextResponse.json(roster, { status: 201 });
}
