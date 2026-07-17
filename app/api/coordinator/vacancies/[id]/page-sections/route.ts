import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { ensureVacancySlug } from "@/lib/slug";
import crypto from "crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await prisma.vacancy.findFirst({
    where: { id, organizationId: coord.organizationId },
    include: { pageSections: { orderBy: { order: "asc" } } },
  });
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  // Auto-generate slug if missing
  let slug = vacancy.slug;
  if (!slug) slug = await ensureVacancySlug(prisma, id, vacancy.title, coord.organizationId);

  const org = await prisma.organization.findUnique({ where: { id: coord.organizationId }, select: { slug: true } });
  const appUrl = process.env.APP_URL || "https://www.gavenmatch.nl";

  return NextResponse.json({
    sections: vacancy.pageSections,
    slug,
    teamUrl: `${appUrl}/${org?.slug}/${slug}`,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vacancy = await prisma.vacancy.findFirst({ where: { id, organizationId: coord.organizationId } });
  if (!vacancy) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const { type, title, content, url, order } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titel verplicht" }, { status: 400 });

  const maxOrder = await prisma.vacancyPageSection.aggregate({
    where: { vacancyId: id },
    _max: { order: true },
  });

  const section = await prisma.vacancyPageSection.create({
    data: {
      vacancyId: id,
      type: type || "text",
      title: title.trim(),
      content: content?.trim() || null,
      url: url?.trim() || null,
      order: order ?? ((maxOrder._max.order ?? -1) + 1),
    },
  });

  return NextResponse.json(section, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { sectionId, title, content, url, type, order } = await req.json();
  if (!sectionId) return NextResponse.json({ error: "sectionId verplicht" }, { status: 400 });

  const section = await prisma.vacancyPageSection.findFirst({
    where: { id: sectionId, vacancyId: id },
  });
  if (!section) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const updated = await prisma.vacancyPageSection.update({
    where: { id: sectionId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content: content?.trim() || null }),
      ...(url !== undefined && { url: url?.trim() || null }),
      ...(type !== undefined && { type }),
      ...(order !== undefined && { order }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const sectionId = req.nextUrl.searchParams.get("sectionId");
  if (!sectionId) return NextResponse.json({ error: "sectionId verplicht" }, { status: 400 });

  const section = await prisma.vacancyPageSection.findFirst({ where: { id: sectionId, vacancyId: id } });
  if (!section) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.vacancyPageSection.delete({ where: { id: sectionId } });
  return NextResponse.json({ ok: true });
}
