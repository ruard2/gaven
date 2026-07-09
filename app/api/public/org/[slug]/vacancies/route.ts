import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug, isActive: true },
  });
  if (!org) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const vacancies = await prisma.vacancy.findMany({
    where: { organizationId: org.id, status: "active" },
    select: { id: true, title: true, category: true, shortDescription: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return NextResponse.json(vacancies);
}
