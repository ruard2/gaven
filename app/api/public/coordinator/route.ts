import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const orgSlug = req.nextUrl.searchParams.get("orgSlug");
  const coordSlug = req.nextUrl.searchParams.get("coordSlug");
  if (!orgSlug || !coordSlug) return NextResponse.json({ error: "Ongeldige parameters" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return NextResponse.json({ error: "Organisatie niet gevonden" }, { status: 404 });

  const coord = await prisma.coordinator.findFirst({
    where: { organizationId: org.id, pageSlug: coordSlug, status: "active" },
    select: {
      id: true,
      name: true,
      email: true,
      roleTitle: true,
      pageSlug: true,
      pageSections: { orderBy: { order: "asc" } },
    },
  });
  if (!coord) return NextResponse.json({ error: "Pagina niet gevonden" }, { status: 404 });

  return NextResponse.json({
    org: { name: org.name, slug: org.slug, primaryColor: org.primaryColor, logoUrl: org.logoUrl },
    coordinator: coord,
  });
}
