import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { generateSlug, generatePublicCode } from "@/lib/slug";

export async function GET() {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgs = await prisma.organization.findMany({
    where: { adminId },
    include: { _count: { select: { vacancies: true, participants: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orgs);
}

export async function POST(req: NextRequest) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, organizationType, place, primaryColor, welcomeText, contactEmail } = body;

  if (!name || !organizationType || !contactEmail) {
    return NextResponse.json({ error: "Naam, type en contactmail zijn verplicht" }, { status: 400 });
  }

  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  let publicCode = generatePublicCode();
  while (await prisma.organization.findUnique({ where: { publicCode } })) {
    publicCode = generatePublicCode();
  }

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      publicCode,
      organizationType,
      place: place || null,
      primaryColor: primaryColor || "#2563eb",
      welcomeText: welcomeText || null,
      contactEmail,
      adminId,
    },
  });

  return NextResponse.json(org, { status: 201 });
}
