import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forceDownload = req.nextUrl.searchParams.get("download") === "1";

  const doc = await prisma.coordinatorDocument.findUnique({
    where: { id },
    select: { filename: true, mimeType: true, data: true, sections: { select: { id: true }, take: 1 } },
  });

  // Alleen documenten die op een homepage staan zijn publiek opvraagbaar
  if (!doc || doc.sections.length === 0) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const body = new Uint8Array(doc.data);

  const disposition = forceDownload ? "attachment" : "inline";

  return new NextResponse(body, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=300",
    },
  });
}
