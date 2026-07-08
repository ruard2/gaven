import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vacancy = await prisma.vacancy.findUnique({
    where: { id },
    include: { qualityWeights: true, organization: { select: { name: true, primaryColor: true } } },
  });
  if (!vacancy || vacancy.status !== "active") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(vacancy);
}
