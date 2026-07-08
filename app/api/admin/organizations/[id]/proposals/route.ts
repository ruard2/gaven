import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const org = await prisma.organization.findFirst({ where: { id, adminId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const proposals = await prisma.vacancyProposal.findMany({
    where: { vacancy: { organizationId: id }, status: "pending" },
    include: { vacancy: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(proposals);
}
