import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/slug";

async function ensurePageSlug(coordId: string, name: string, orgId: string): Promise<string> {
  const base = generateSlug(name) || "coordinator";
  const siblings = await prisma.coordinator.findMany({
    where: { organizationId: orgId, id: { not: coordId } },
    select: { pageSlug: true },
  });
  const taken = new Set(siblings.map((c: { pageSlug: string | null }) => c.pageSlug).filter(Boolean));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) { slug = `${base}-${n++}`; }
  await prisma.coordinator.update({ where: { id: coordId }, data: { pageSlug: slug } });
  return slug;
}

export async function GET() {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const full = await prisma.coordinator.findUnique({
    where: { id: coord.id },
    select: {
      id: true,
      name: true,
      roleTitle: true,
      pageSlug: true,
      organizationId: true,
      organization: { select: { slug: true, name: true, primaryColor: true, logoUrl: true } },
      pageSections: { orderBy: { order: "asc" } },
    },
  });
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let pageSlug = full.pageSlug;
  if (!pageSlug) pageSlug = await ensurePageSlug(coord.id, coord.name, coord.organizationId);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://www.gavenmatch.nl";
  const pageUrl = `${appUrl}/${full.organization.slug}/p/${pageSlug}`;

  return NextResponse.json({ ...full, pageSlug, pageUrl });
}

export async function PATCH(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roleTitle } = await req.json();
  await prisma.coordinator.update({
    where: { id: coord.id },
    data: { roleTitle: roleTitle?.trim() || null },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, title, content, url } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titel verplicht" }, { status: 400 });

  const last = await prisma.coordinatorSection.findFirst({
    where: { coordinatorId: coord.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const section = await prisma.coordinatorSection.create({
    data: {
      coordinatorId: coord.id,
      type: type || "text",
      title: title.trim(),
      content: content?.trim() || null,
      url: url?.trim() || null,
      order: (last?.order ?? -1) + 1,
    },
  });
  return NextResponse.json(section, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sectionId = req.nextUrl.searchParams.get("sectionId");
  if (!sectionId) return NextResponse.json({ error: "sectionId verplicht" }, { status: 400 });

  await prisma.coordinatorSection.deleteMany({
    where: { id: sectionId, coordinatorId: coord.id },
  });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId, type, title, content, url } = await req.json();
  if (!sectionId || !title?.trim()) return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });

  const section = await prisma.coordinatorSection.updateMany({
    where: { id: sectionId, coordinatorId: coord.id },
    data: { type: type || "text", title: title.trim(), content: content?.trim() || null, url: url?.trim() || null },
  });
  return NextResponse.json(section);
}
