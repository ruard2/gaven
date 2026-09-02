-- Leeftijd: minimumleeftijd per vacature + geboortejaar per vrijwilliger.

ALTER TABLE "Vacancy"
ADD COLUMN IF NOT EXISTS "minAge" INTEGER;

ALTER TABLE "Participant"
ADD COLUMN IF NOT EXISTS "birthYear" INTEGER;
