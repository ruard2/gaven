import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeMatches } from "@/lib/matching";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const participantId = searchParams.get("participantId");
  const familieBonus = searchParams.get("familieBonus") || null;

  if (!participantId) {
    return NextResponse.json({ error: "participantId verplicht" }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { profile: true },
  });

  if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!participant.profile) return NextResponse.json({ matches: [] });

  const vacancies = await prisma.vacancy.findMany({
    where: { organizationId: participant.organizationId, status: "active" },
    include: { qualityWeights: true },
  });

  const manualQualities: string[] = JSON.parse(participant.profile.selectedQualityScores || "[]");
  const workQualities: string[] = JSON.parse(participant.profile.workExperienceScores || "[]");

  const profile = {
    qualities: [...new Set([...manualQualities, ...workQualities])],
    negatives: JSON.parse(participant.profile.negativePreferences || "[]"),
    familieBonus: familieBonus || null,
  };

  const matches = computeMatches(profile, vacancies);

  return NextResponse.json({
    matches: matches.map((m) => ({
      vacancyId: m.vacancy.id,
      title: m.vacancy.title,
      category: m.vacancy.category,
      shortDescription: m.vacancy.shortDescription,
      whyValuable: m.vacancy.whyValuable,
      score: m.score,
      stars: m.stars,
      matchedQualities: m.matchedQualities,
    })),
  });
}
