import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { sanitizeRequirements } from "@/lib/specific";

export async function POST(req: NextRequest) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    organizationId, title, category, shortDescription,
    longDescription, whyValuable, concreteTasks, firstStep,
    contactPersonName, contactPersonEmail, qualityWeights, minAge, specificRequirements, taskLevel,
  } = body;
  const minAgeValue = Number.isInteger(minAge) && minAge > 0 && minAge < 120 ? minAge : null;
  const cleanRequirements = sanitizeRequirements(specificRequirements);
  const level = taskLevel === "instap" || taskLevel === "verantwoordelijk" ? taskLevel : "regulier";

  // Verify org belongs to admin
  const org = await prisma.organization.findFirst({ where: { id: organizationId, adminId } });
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const vacancy = await prisma.vacancy.create({
    data: {
      organizationId,
      title,
      category: category || "Algemeen",
      shortDescription,
      longDescription: longDescription || null,
      whyValuable: whyValuable || null,
      concreteTasks: concreteTasks || null,
      firstStep: firstStep || null,
      contactPersonName,
      contactPersonEmail,
      specificRequirements: JSON.stringify(cleanRequirements),
      minAge: minAgeValue,
      taskLevel: level,
      qualityWeights: {
        create: Object.entries(qualityWeights || {}).map(([qualityId, weight]) => ({
          qualityId,
          weight: Number(weight),
        })),
      },
    },
    include: { qualityWeights: true },
  });

  return NextResponse.json(vacancy, { status: 201 });
}
