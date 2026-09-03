import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractSpecificSkills } from "@/lib/specific";
import { rateLimit, getIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 10)) {
    return NextResponse.json({ error: "Te veel verzoeken, probeer het zo weer." }, { status: 429 });
  }
  const { participantId, workExperience, qualities, negatives, bio, workbio } = await req.json();

  if (!participantId) {
    return NextResponse.json({ error: "participantId verplicht" }, { status: 400 });
  }

  // Concrete specialismen (orgel, boekhouden…) uit de eigen woorden afleiden en
  // bewaren, zodat de matching zeer specifieke vacatures kan filteren.
  const specificSkills = await extractSpecificSkills(bio, workbio);

  const data = {
    workExperienceScores: JSON.stringify(workExperience || []),
    selectedQualityScores: JSON.stringify(qualities || []),
    negativePreferences: JSON.stringify(negatives || []),
    bio: bio || null,
    workbio: workbio || null,
    specificSkills: JSON.stringify(specificSkills),
    completedAt: new Date(),
  };

  const profile = await prisma.participantProfile.upsert({
    where: { participantId },
    create: { participantId, ...data },
    update: data,
  });

  return NextResponse.json({ profileId: profile.id });
}
