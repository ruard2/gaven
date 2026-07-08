import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const org = await prisma.organization.findFirst({
    where: {
      OR: [{ slug }, { publicCode: slug }],
      isActive: true,
    },
    select: {
      id: true, name: true, slug: true, publicCode: true,
      organizationType: true, place: true, logoUrl: true,
      primaryColor: true, welcomeText: true,
    },
  });

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(org);
}
