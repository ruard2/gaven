// Migration script: SQLite (dev.db) → Railway PostgreSQL
// Usage: DATABASE_URL="postgresql://..." node scripts/migrate-to-pg.mjs
//
// Updates admin email → ADMIN_EMAIL env var (default: ruard.stolper@gmail.com)
// Updates admin password → ADMIN_PASSWORD env var (default: Mapstieks85!)

import Database from "better-sqlite3";
import pg from "pg";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../dev.db");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || DATABASE_URL.startsWith("file:")) {
  console.error("❌  Set DATABASE_URL to the Railway PostgreSQL URL");
  console.error("   Example: DATABASE_URL=\"postgresql://...\" node scripts/migrate-to-pg.mjs");
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ruard.stolper@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Mapstieks85!";

const sqlite = new Database(DB_PATH, { readonly: true });
const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function toDate(val) {
  if (!val) return null;
  return new Date(val);
}

function toBool(val) {
  return val === 1 || val === true || val === "1";
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Admin ──────────────────────────────────────────────
    const admins = sqlite.prepare("SELECT * FROM Admin").all();
    console.log(`Migrating ${admins.length} admin(s)...`);
    for (const a of admins) {
      const newHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await client.query(
        `INSERT INTO "Admin" (id, email, "passwordHash", "createdAt")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, "passwordHash" = EXCLUDED."passwordHash"`,
        [a.id, ADMIN_EMAIL, newHash, toDate(a.createdAt)]
      );
    }
    console.log(`  ✓ Admin email set to ${ADMIN_EMAIL}`);

    // ── 2. Organization ───────────────────────────────────────
    const orgs = sqlite.prepare("SELECT * FROM Organization").all();
    console.log(`Migrating ${orgs.length} organization(s)...`);
    for (const o of orgs) {
      await client.query(
        `INSERT INTO "Organization"
           (id, name, slug, "publicCode", "organizationType", place, "logoUrl",
            "primaryColor", "welcomeText", "contactEmail", "isActive",
            "createdAt", "updatedAt", "adminId")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          o.id, o.name, o.slug, o.publicCode, o.organizationType,
          o.place, o.logoUrl, o.primaryColor, o.welcomeText,
          o.contactEmail, toBool(o.isActive),
          toDate(o.createdAt), toDate(o.updatedAt), o.adminId,
        ]
      );
    }
    console.log(`  ✓ ${orgs.length} organization(s)`);

    // ── 3. Vacancy ────────────────────────────────────────────
    const vacancies = sqlite.prepare("SELECT * FROM Vacancy").all();
    console.log(`Migrating ${vacancies.length} vacancies...`);
    for (const v of vacancies) {
      await client.query(
        `INSERT INTO "Vacancy"
           (id, "organizationId", title, category, "shortDescription",
            "longDescription", "whyValuable", "concreteTasks", "firstStep",
            "contactPersonName", "contactPersonEmail", status,
            "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          v.id, v.organizationId, v.title, v.category, v.shortDescription,
          v.longDescription, v.whyValuable, v.concreteTasks, v.firstStep,
          v.contactPersonName, v.contactPersonEmail, v.status,
          toDate(v.createdAt), toDate(v.updatedAt),
        ]
      );
    }
    console.log(`  ✓ ${vacancies.length} vacancies`);

    // ── 4. VacancyQualityWeight ───────────────────────────────
    const weights = sqlite.prepare("SELECT * FROM VacancyQualityWeight").all();
    console.log(`Migrating ${weights.length} quality weights...`);
    for (const w of weights) {
      await client.query(
        `INSERT INTO "VacancyQualityWeight" (id, "vacancyId", "qualityId", weight)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [w.id, w.vacancyId, w.qualityId, w.weight]
      );
    }
    console.log(`  ✓ ${weights.length} weights`);

    // ── 5. InviteToken ────────────────────────────────────────
    const tokens = sqlite.prepare("SELECT * FROM InviteToken").all();
    console.log(`Migrating ${tokens.length} invite token(s)...`);
    for (const t of tokens) {
      await client.query(
        `INSERT INTO "InviteToken" (id, token, "organizationId", label, "expiresAt", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.token, t.organizationId, t.label, toDate(t.expiresAt), toDate(t.createdAt)]
      );
    }
    console.log(`  ✓ ${tokens.length} token(s)`);

    // ── 6. Participant ────────────────────────────────────────
    const participants = sqlite.prepare("SELECT * FROM Participant").all();
    console.log(`Migrating ${participants.length} participant(s)...`);
    for (const p of participants) {
      await client.query(
        `INSERT INTO "Participant" (id, "organizationId", name, email, phone, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.organizationId, p.name, p.email, p.phone, toDate(p.createdAt)]
      );
    }
    console.log(`  ✓ ${participants.length} participant(s)`);

    // ── 7. ParticipantProfile ─────────────────────────────────
    const profiles = sqlite.prepare("SELECT * FROM ParticipantProfile").all();
    console.log(`Migrating ${profiles.length} profile(s)...`);
    for (const p of profiles) {
      await client.query(
        `INSERT INTO "ParticipantProfile"
           (id, "participantId", "workExperienceScores", "selectedQualityScores",
            "negativePreferences", "completedAt", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.participantId,
          p.workExperienceScores, p.selectedQualityScores, p.negativePreferences,
          toDate(p.completedAt), toDate(p.createdAt), toDate(p.updatedAt),
        ]
      );
    }
    console.log(`  ✓ ${profiles.length} profile(s)`);

    // ── 8. Application ────────────────────────────────────────
    const apps = sqlite.prepare("SELECT * FROM Application").all();
    console.log(`Migrating ${apps.length} application(s)...`);
    for (const a of apps) {
      await client.query(
        `INSERT INTO "Application"
           (id, "organizationId", "participantId", "vacancyId",
            "responseType", message, "availabilityNote", "firstStepChoice",
            status, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          a.id, a.organizationId, a.participantId, a.vacancyId,
          a.responseType, a.message, a.availabilityNote, a.firstStepChoice,
          a.status, toDate(a.createdAt),
        ]
      );
    }
    console.log(`  ✓ ${apps.length} application(s)`);

    // ── 9. VacancyProposal ────────────────────────────────────
    const proposals = sqlite.prepare("SELECT * FROM VacancyProposal").all();
    console.log(`Migrating ${proposals.length} proposal(s)...`);
    for (const p of proposals) {
      await client.query(
        `INSERT INTO "VacancyProposal"
           (id, "vacancyId", "proposedData", "editorName", status, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.vacancyId, p.proposedData, p.editorName, p.status, toDate(p.createdAt)]
      );
    }
    console.log(`  ✓ ${proposals.length} proposal(s)`);

    await client.query("COMMIT");
    console.log("\n✅  Migration complete! All data transferred to Railway PostgreSQL.");
    console.log(`   Log in at /admin/login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌  Migration failed, rolled back:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

run();
