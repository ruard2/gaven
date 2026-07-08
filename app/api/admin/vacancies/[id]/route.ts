import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";

async function getVacancyForAdmin(id: string, adminId: string) {
  return prisma.vacancy.findFirst({
    where: { id, organization: { adminId } },
    include: { qualityWeights: true },
  });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const vacancy = await getVacancyForAdmin(id, adminId);
  if (!vacancy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vacancy);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await getVacancyForAdmin(id, adminId);
  if (!vacancy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { qualityWeights, ...rest } = body;

  const updated = await prisma.vacancy.update({
    where: { id },
    data: {
      ...rest,
      ...(qualityWeights
        ? {
            qualityWeights: {
              deleteMany: {},
              create: Object.entries(qualityWeights).map(([qualityId, weight]) => ({
                qualityId,
                weight: Number(weight),
              })),
            },
          }
        : {}),
    },
    include: { qualityWeights: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await getVacancyForAdmin(id, adminId);
  if (!vacancy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vacancy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
