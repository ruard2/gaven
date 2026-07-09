import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { organization: { select: { id: true, contactEmail: true } } },
  });
  if (!invite) return NextResponse.json({ error: "Ongeldige link" }, { status: 403 });
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link verlopen" }, { status: 410 });
  }

  const body = await req.json();
  const { editorName, title, category, shortDescription, whyValuable, concreteTasks, firstStep, qualityWeights } = body;

  if (!title?.trim() || !shortDescription?.trim()) {
    return NextResponse.json({ error: "Taaknaam en omschrijving zijn verplicht" }, { status: 400 });
  }

  const weightEntries = Object.entries((qualityWeights || {}) as Record<string, number>)
    .filter(([, w]) => typeof w === "number" && w > 0)
    .map(([qualityId, weight]) => ({ qualityId, weight: Math.min(100, Math.max(0, Math.round(weight))) }));

  // Create vacancy as pending so it doesn't show up publicly yet
  const vacancy = await prisma.vacancy.create({
    data: {
      organizationId: invite.organizationId,
      title: title.trim(),
      category: category?.trim() || "Algemeen",
      shortDescription: shortDescription.trim(),
      whyValuable: whyValuable?.trim() || null,
      concreteTasks: concreteTasks?.trim() || null,
      firstStep: firstStep?.trim() || null,
      contactPersonName: editorName?.trim() || "Onbekend",
      contactPersonEmail: invite.organization.contactEmail,
      status: "pending",
      qualityWeights: { create: weightEntries },
    },
  });

  // Create proposal so admin sees it in the proposals review flow
  await prisma.vacancyProposal.create({
    data: {
      vacancyId: vacancy.id,
      proposedData: JSON.stringify({ isNewVacancy: true, title, category, shortDescription, whyValuable, concreteTasks, firstStep }),
      editorName: editorName?.trim() || null,
      status: "pending",
    },
  });

  return NextResponse.json({ ok: true });
}
