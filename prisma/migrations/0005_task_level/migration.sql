-- Verantwoordelijkheidsniveau per taak: stuurt basisscore + weging voor jongeren.
ALTER TABLE "Vacancy"
ADD COLUMN IF NOT EXISTS "taskLevel" TEXT NOT NULL DEFAULT 'regulier';
