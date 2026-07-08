import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { participantId, workExperience, qualities, negatives } = await req.json();

  if (!participantId) {
    return NextResponse.json({ error: "participantId verplicht" }, { status: 400 });
  }

  const profile = await prisma.participantProfile.upsert({
    where: { participantId },
    create: {
      participantId,
      workExperienceScores: JSON.stringify(workExperience || []),
      selectedQualityScores: JSON.stringify(qualities || []),
      negativePreferences: JSON.stringify(negatives || []),
      completedAt: new Date(),
    },
    update: {
      workExperienceScores: JSON.stringify(workExperience || []),
      selectedQualityScores: JSON.stringify(qualities || []),
      negativePreferences: JSON.stringify(negatives || []),
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ profileId: profile.id });
}
