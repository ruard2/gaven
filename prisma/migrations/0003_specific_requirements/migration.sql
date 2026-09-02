-- Specifieke-eisen-laag: onderscheid maken bij zeer specifieke vacatures
-- (bijv. organist vereist "orgel"), bovenop de grove kwaliteiten-taxonomie.

ALTER TABLE "Vacancy"
ADD COLUMN IF NOT EXISTS "specificRequirements" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "ParticipantProfile"
ADD COLUMN IF NOT EXISTS "bio" TEXT;

ALTER TABLE "ParticipantProfile"
ADD COLUMN IF NOT EXISTS "workbio" TEXT;

ALTER TABLE "ParticipantProfile"
ADD COLUMN IF NOT EXISTS "specificSkills" TEXT NOT NULL DEFAULT '[]';
