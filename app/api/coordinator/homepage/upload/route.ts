import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export async function POST(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Bestand is te groot (max 10 MB)" }, { status: 413 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED.has(mimeType)) {
    return NextResponse.json(
      { error: "Bestandstype niet toegestaan. Gebruik PDF, Word, Excel, PowerPoint, tekst of afbeelding." },
      { status: 415 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const doc = await prisma.coordinatorDocument.create({
    data: {
      coordinatorId: coord.id,
      filename: file.name || "document",
      mimeType,
      size: bytes.length,
      data: bytes,
    },
    select: { id: true, filename: true, mimeType: true, size: true },
  });

  return NextResponse.json(doc, { status: 201 });
}
