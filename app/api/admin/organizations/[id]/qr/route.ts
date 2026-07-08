import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import QRCode from "qrcode";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const url = `${appUrl}/g/${org.slug}`;
  const format = new URL(req.url).searchParams.get("format") || "png";

  if (format === "svg") {
    const svg = await QRCode.toString(url, { type: "svg", margin: 2 });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="qr-${org.slug}.svg"`,
      },
    });
  }

  const buffer = await QRCode.toBuffer(url, { type: "png", margin: 2, width: 400 });
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${org.slug}.png"`,
    },
  });
}
