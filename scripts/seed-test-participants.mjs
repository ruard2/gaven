// Seed 10 testdeelnemers en print hun matches (lokale SQLite dev.db)
// Usage: node scripts/seed-test-participants.mjs

import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "../dev.db"));

// ── Haal organisatie op ──────────────────────────────────────────────────────
const org = db.prepare(`SELECT id, name, slug FROM Organization LIMIT 1`).get();
if (!org) { console.error("Geen organisatie gevonden"); process.exit(1); }
console.log(`\nOrganisatie: ${org.name} (${org.slug})\n`);

// ── Haal vacatures + gewichten op ────────────────────────────────────────────
const weightRows = db.prepare(`
  SELECT v.id, v.title, v.category, w.qualityId, w.weight
  FROM Vacancy v
  JOIN VacancyQualityWeight w ON w.vacancyId = v.id
  WHERE v.organizationId = ? AND v.status = 'active'
`).all(org.id);

const vacancyMap = {};
for (const row of weightRows) {
  if (!vacancyMap[row.id]) vacancyMap[row.id] = { id: row.id, title: row.title, category: row.category, weights: [] };
  vacancyMap[row.id].weights.push({ qualityId: row.qualityId, weight: row.weight });
}
const vacancies = Object.values(vacancyMap);
console.log(`${vacancies.length} actieve vacatures gevonden.\n`);

if (vacancies.length === 0) {
  console.log("Geen vacatures — voer eerst seed-vacancies.mjs uit.");
  process.exit(0);
}

// ── 10 testpersonen ───────────────────────────────────────────────────────────
const TESTPERSONEN = [
  {
    key: "test_a", name: "Anna (verpleegkundige)",
    qualities: ["luisteren", "empathie", "bezoeken", "bemoedigen", "helpen", "rijden", "pastoraat", "verbinden"],
    negatives: [],
    familieBonus: "Zorg & aanwezigheid",
  },
  {
    key: "test_b", name: "Bas (IT-er / geluidstechnicus)",
    qualities: ["ict2", "appen", "website", "plannen", "overzicht", "geluid", "livestream", "coordineren"],
    negatives: ["vooreenpgroep", "zwaregesprekken"],
    familieBonus: "Richting & structuur",
  },
  {
    key: "test_c", name: "Clara (student pedagogiek)",
    qualities: ["tieners", "jeugdactiviteiten", "mentorschap", "verbinden", "helpen", "bijbelstudie", "geloofsopvoeding", "kinderopvang"],
    negatives: ["admin", "techniek"],
    familieBonus: "Woord & waarheid",
  },
  {
    key: "test_d", name: "Dirk (timmerman)",
    qualities: ["klussen", "helpen", "opruimen", "rijden", "plannen"],
    negatives: ["vooreenpgroep", "zwaregesprekken", "overleg"],
    familieBonus: null,
  },
  {
    key: "test_e", name: "Eva (muzikante / zangeres)",
    qualities: ["muziekspelen", "zingen", "dirigeren", "spreken", "geloofsopvoeding", "gebed"],
    negatives: ["admin", "techniek"],
    familieBonus: "Woord & waarheid",
  },
  {
    key: "test_f", name: "Frank (financieel adviseur)",
    qualities: ["boekhouding", "begroting", "administratie2", "overzicht", "plannen", "visie", "evalueren", "beleid"],
    negatives: ["vooreenpgroep", "kinderen", "lastminute"],
    familieBonus: "Richting & structuur",
  },
  {
    key: "test_g", name: "Greta (gepensioneerd lerares)",
    qualities: ["spreken", "bijbelstudie", "geloofsopvoeding", "kinderopvang", "tieners", "luisteren", "bemoedigen", "mentorschap", "verbinden"],
    negatives: ["techniek"],
    familieBonus: "Woord & waarheid",
  },
  {
    key: "test_h", name: "Hans (horecaondernemer)",
    qualities: ["koken", "verbinden", "helpen", "plannen", "coordineren", "netwerken", "overzicht", "opruimen"],
    negatives: ["techniek", "overleg"],
    familieBonus: "Zorg & aanwezigheid",
  },
  {
    key: "test_i", name: "Iris (communicatiemedewerker)",
    qualities: ["schrijven", "socialmedia", "ontwerpen", "fotografie", "website", "spreken", "verbinden", "netwerken"],
    negatives: ["techniek", "lastminute"],
    familieBonus: "Woord & waarheid",
  },
  {
    key: "test_j", name: "Joost (student, breed geïnteresseerd)",
    qualities: ["helpen", "verbinden", "appen", "ict2", "gebed", "bijbelstudie"],
    negatives: [],
    familieBonus: null,
  },
];

// ── Matching-logica (identiek aan lib/matching.ts) ────────────────────────────
const NEGATIVE_QUALITY_MAP = {
  vooreenpgroep:    ["spreken", "dirigeren", "zingen"],
  kinderen:         ["kinderopvang", "tieners", "jeugdactiviteiten", "geloofsopvoeding"],
  admin:            ["administratie2", "boekhouding", "begroting", "plannen"],
  techniek:         ["geluid", "livestream", "ict2", "appen", "klussen"],
  overleg:          ["coordineren", "projecten", "beleid2", "netwerken"],
  podium:           ["spreken", "zingen", "dirigeren", "muziekspelen"],
  zwaregesprekken:  ["pastoraat", "luisteren", "empathie"],
  lastminute:       ["helpen", "koken"],
  regelmatig:       ["plannen", "coordineren"],
};

const FAMILIE_QUALITIES = {
  "Woord & waarheid":      ["schrijven", "spreken", "bijbelstudie", "gebed", "socialmedia", "website", "pastoraat", "geloofsopvoeding"],
  "Zorg & aanwezigheid":   ["luisteren", "empathie", "bezoeken", "bemoedigen", "verbinden", "pastoraat", "helpen", "koken", "rijden"],
  "Richting & structuur":  ["plannen", "coordineren", "projecten", "overzicht", "administratie2", "boekhouding", "begroting", "visie", "evalueren", "netwerken"],
};

function scoreToStars(s) {
  if (s >= 80) return 5;
  if (s >= 60) return 4;
  if (s >= 42) return 3;
  if (s >= 20) return 2;
  return 1;
}

function computeMatches(profile, vacancies) {
  const qualitySet    = new Set(profile.qualities);
  const familieBoost  = new Set(profile.familieBonus ? (FAMILIE_QUALITIES[profile.familieBonus] || []) : []);
  const negativeIds   = new Set(profile.negatives.flatMap(n => NEGATIVE_QUALITY_MAP[n] || []));

  return vacancies.map(v => {
    let total = 0, matched = 0, negConflict = 0;
    for (const qw of v.weights) {
      if (!qw.weight) continue;
      total += qw.weight;
      const neg    = negativeIds.has(qw.qualityId);
      if (neg) negConflict += qw.weight;
      const direct = qualitySet.has(qw.qualityId);
      const fam    = familieBoost.has(qw.qualityId) && !direct;
      if      (direct) matched += neg ? qw.weight * 0.3 : qw.weight;
      else if (fam)    matched += neg ? 0 : qw.weight * 0.4;
    }
    const conflictRatio = total > 0 ? negConflict / total : 0;
    const base      = Math.round(25 * Math.max(0, 1 - conflictRatio * 2));
    const rawSkill  = total > 0 ? (matched / total) * 100 : 0;
    const bonus     = Math.round((rawSkill / 100) * (100 - base));
    const score     = Math.min(100, base + bonus);
    return { title: v.title, category: v.category, score, stars: scoreToStars(score) };
  }).sort((a, b) => b.score - a.score);
}

// ── Upsert deelnemers + print resultaten ─────────────────────────────────────
const insertParticipant = db.prepare(`INSERT INTO Participant (id, organizationId, name, email, createdAt) VALUES (?, ?, ?, ?, datetime('now'))`);
const updateParticipant = db.prepare(`UPDATE Participant SET name = ? WHERE id = ?`);
const getParticipant    = db.prepare(`SELECT id FROM Participant WHERE organizationId = ? AND email = ?`);

const insertProfile     = db.prepare(`INSERT INTO ParticipantProfile (id, participantId, selectedQualityScores, workExperienceScores, negativePreferences, completedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`);
const updateProfile     = db.prepare(`UPDATE ParticipantProfile SET selectedQualityScores=?, workExperienceScores=?, negativePreferences=?, completedAt=datetime('now'), updatedAt=datetime('now') WHERE participantId=?`);
const getProfile        = db.prepare(`SELECT id FROM ParticipantProfile WHERE participantId = ?`);

const STARS_DISPLAY = ["", "★☆☆☆☆", "★★☆☆☆", "★★★☆☆", "★★★★☆", "★★★★★"];
const LABELS        = ["", "Minder geschikt", "Kan jij doen", "Mogelijke match", "Goede match",  "Sterke match"];

for (const p of TESTPERSONEN) {
  const email = `${p.key}@test.gavenroute.nl`;

  // Participant aanmaken of ophalen
  let row = getParticipant.get(org.id, email);
  let participantId;
  if (row) {
    participantId = row.id;
    updateParticipant.run(p.name, participantId);
  } else {
    participantId = crypto.randomUUID();
    insertParticipant.run(participantId, org.id, p.name, email);
  }

  // Profiel opslaan
  const profileRow = getProfile.get(participantId);
  if (profileRow) {
    updateProfile.run(JSON.stringify(p.qualities), JSON.stringify([]), JSON.stringify(p.negatives), participantId);
  } else {
    insertProfile.run(crypto.randomUUID(), participantId, JSON.stringify(p.qualities), JSON.stringify([]), JSON.stringify(p.negatives));
  }

  // Matches berekenen
  const matches = computeMatches(p, vacancies);

  // Output
  console.log(`${"─".repeat(65)}`);
  console.log(`${p.name}`);
  console.log(`  Gaven    : ${p.qualities.slice(0, 6).join(", ")}${p.qualities.length > 6 ? "…" : ""}`);
  console.log(`  Negatives: ${p.negatives.join(", ") || "—"}  |  Familie: ${p.familieBonus || "—"}`);
  console.log();
  for (const m of matches) {
    const bar  = "█".repeat(Math.round(m.score / 10)).padEnd(10, "░");
    const star = STARS_DISPLAY[m.stars];
    const lbl  = LABELS[m.stars].padEnd(16);
    console.log(`  ${star}  ${bar} ${m.score.toString().padStart(3)}  ${lbl}  ${m.title}`);
  }
  console.log();
}

console.log(`${"═".repeat(65)}`);
console.log("10 testdeelnemers aangemaakt/bijgewerkt in dev.db.");
