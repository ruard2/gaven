import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureVacancySlug } from "@/lib/slug";

export async function GET(req: NextRequest) {
  const orgSlug = req.nextUrl.searchParams.get("orgSlug");
  const vacancySlug = req.nextUrl.searchParams.get("vacancySlug");
  if (!orgSlug || !vacancySlug) return NextResponse.json({ error: "Ontbrekende parameters" }, { status: 400 });

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, isActive: true },
    select: { id: true, name: true, primaryColor: true, logoUrl: true },
  });
  if (!org) return NextResponse.json({ error: "Organisatie niet gevonden" }, { status: 404 });

  let vacancy = await prisma.vacancy.findFirst({
    where: { organizationId: org.id, slug: vacancySlug, status: "active" },
    include: {
      coordinator: { select: { name: true, email: true } },
      coCoordinators: {
        where: { status: "confirmed" },
        include: { coordinator: { select: { name: true, email: true } } },
      },
      pageSections: { orderBy: { order: "asc" } },
    },
  });

  if (!vacancy) return NextResponse.json({ error: "Pagina niet gevonden" }, { status: 404 });

  return NextResponse.json({
    org: { name: org.name, primaryColor: org.primaryColor, logoUrl: org.logoUrl, slug: orgSlug },
    vacancy: {
      id: vacancy.id,
      title: vacancy.title,
      category: vacancy.category,
      shortDescription: vacancy.shortDescription,
      slug: vacancy.slug,
    },
    coordinators: [
      ...(vacancy.coordinator ? [vacancy.coordinator] : []),
      ...vacancy.coCoordinators.map((cc) => cc.coordinator),
    ],
    sections: vacancy.pageSections,
  });
}
