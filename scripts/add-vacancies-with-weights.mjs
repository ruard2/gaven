// Voeg 15 nieuwe vacatures toe, genereer gewichten via OpenAI, print resultaat
// Usage: node scripts/add-vacancies-with-weights.mjs

import Database from "better-sqlite3";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import path from "path";
import crypto from "crypto";
import * as fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env inlezen
const envPath = path.join(__dirname, "../.env");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8").split("\n")
    .filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,"")]; })
);
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const db = new Database(path.join(__dirname, "../dev.db"));

// Kwaliteitenlijst (hardcoded uit qualities.ts)
const QUALITIES = [
  ["luisteren","Goed kunnen luisteren"],["empathie","Empathie tonen"],["bezoeken","Mensen bezoeken"],
  ["bemoedigen","Bemoedigen"],["verbinden","Mensen met elkaar verbinden"],
  ["kinderopvang","Werken met jonge kinderen"],["tieners","Werken met tieners"],
  ["jeugdactiviteiten","Jeugdactiviteiten organiseren"],["mentorschap","Mentorschap"],
  ["klussen","Klussen en onderhoud"],["rijden","Mensen vervoeren"],["koken","Koken en maaltijden verzorgen"],
  ["opruimen","Opruimen en organiseren"],["helpen","Spontaan helpen waar nodig"],
  ["plannen","Plannen en roosters maken"],["coordineren","Coördineren"],["projecten","Projecten leiden"],
  ["administratie2","Administratieve taken"],["overzicht","Overzicht bewaken"],
  ["schrijven","Schrijven en redigeren"],["socialmedia","Social media beheren"],
  ["ontwerpen","Ontwerpen en vormgeven"],["fotografie","Fotografie of video"],["website","Website bijhouden"],
  ["geluid","Geluid en belichting"],["livestream","Livestream en opname"],["ict2","ICT en computers"],["appen","Apps en digitale tools"],
  ["muziekspelen","Muziek spelen"],["zingen","Zingen"],["dirigeren","Dirigeren of leiden"],["spreken","Spreken voor een groep"],
  ["bijbelstudie","Bijbelstudie begeleiden"],["gebed","Voorgaan in gebed"],["pastoraat","Pastoraal gesprek voeren"],["geloofsopvoeding","Geloofsopvoeding"],
  ["boekhouding","Boekhouding"],["begroting","Begroting beheren"],["fondsenwerving","Fondsenwerving"],["beleid","Financieel beleid"],
  ["visie","Visie ontwikkelen"],["beleid2","Beleid schrijven"],["evalueren","Evalueren en adviseren"],["netwerken","Netwerken"],
];
const validIds = new Set(QUALITIES.map(q => q[0]));
const qualityList = QUALITIES.map(([id, label]) => `${id}: ${label}`).join("\n");

const org = db.prepare("SELECT id FROM Organization LIMIT 1").get();
if (!org) { console.error("Geen organisatie"); process.exit(1); }

// ── 15 nieuwe vacatures ───────────────────────────────────────────────────────
const VACATURES = [
  {
    title: "Penningmeester",
    category: "Bestuur & beleid",
    shortDescription: "Beheert de financiën van de gemeente.",
    whyValuable: "Zorgt dat de gemeente financieel gezond blijft en verantwoording kan afleggen.",
    concreteTasks: "Bijhouden van de boekhouding, opstellen van begroting, presenteren aan kerkenraad, betalen van rekeningen, jaarcijfers opstellen.",
  },
  {
    title: "Secretaris kerkenraad",
    category: "Bestuur & beleid",
    shortDescription: "Ondersteunt de kerkenraad administratief.",
    whyValuable: "Zorgt dat besluiten worden vastgelegd en communicatie soepel verloopt.",
    concreteTasks: "Notuleren van vergaderingen, bijhouden van correspondentie, opstellen van agenda's, archiveren van documenten.",
  },
  {
    title: "Jeugdleider (12-18 jaar)",
    category: "Jeugd & kinderen",
    shortDescription: "Leidt de tienergroep van de kerk.",
    whyValuable: "Jongeren groeien in geloof en vinden een plek in de gemeente.",
    concreteTasks: "Bijbelstudie begeleiden met tieners, activiteiten organiseren, gesprekken voeren over geloof en leven, contact onderhouden met ouders.",
  },
  {
    title: "Kinderdienst verhaalverteller",
    category: "Jeugd & kinderen",
    shortDescription: "Vertelt bijbelverhalen aan jonge kinderen tijdens de dienst.",
    whyValuable: "Kinderen leren op een aansprekende manier over de Bijbel.",
    concreteTasks: "Bijbelverhaal voorbereiden en vertellen aan kinderen van 4-10 jaar, creatief gebruik van illustraties of attributen.",
  },
  {
    title: "Sociale media beheerder",
    category: "Communicatie",
    shortDescription: "Beheert de Instagram en Facebook van de gemeente.",
    whyValuable: "Houdt de gemeente verbonden en bereikt nieuwe mensen via online kanalen.",
    concreteTasks: "Posts maken en plannen, foto's bewerken, reageren op berichten, evenementen promoten, consistente uitstraling bewaken.",
  },
  {
    title: "Website redacteur",
    category: "Communicatie",
    shortDescription: "Houdt de gemeentewebsite actueel.",
    whyValuable: "Bezoekers en leden vinden snel de juiste informatie.",
    concreteTasks: "Nieuws en agenda bijwerken, tekstpagina's aanpassen, afbeeldingen uploaden, contactformulieren controleren.",
  },
  {
    title: "Fotograaf / videograaf",
    category: "Communicatie",
    shortDescription: "Legt gemeenteactiviteiten vast in beeld.",
    whyValuable: "Herinneringen bewaren en activiteiten promoten via foto en video.",
    concreteTasks: "Fotograferen tijdens diensten en evenementen, video's monteren, materiaal aanleveren voor sociale media en website.",
  },
  {
    title: "Bijbelstudie leider",
    category: "Geloof & groei",
    shortDescription: "Leidt een wekelijkse of tweewekelijkse bijbelstudie.",
    whyValuable: "Gemeenteleden groeien in bijbelkennis en geloof.",
    concreteTasks: "Bijbelgedeelten voorbereiden, gesprek faciliteren, deelnemers uitdagen tot verdieping, studie materiaal kiezen.",
  },
  {
    title: "Gebedsteam lid",
    category: "Geloof & groei",
    shortDescription: "Bidt persoonlijk met gemeenteleden na de dienst.",
    whyValuable: "Mensen worden ondersteund in moeilijke perioden en beleving van gebed.",
    concreteTasks: "Beschikbaar zijn na de dienst, luisteren naar gebedsverzoeken, hardop bidden met mensen, vertrouwelijk omgaan met gedeelde zaken.",
  },
  {
    title: "Maaltijdcoördinator",
    category: "Gastvrijheid",
    shortDescription: "Organiseert gezamenlijke maaltijden in de gemeente.",
    whyValuable: "Verbinding en gastvrijheid worden concreet door samen te eten.",
    concreteTasks: "Maaltijden plannen en inkopen, kookteams samenstellen en aansturen, locatie inrichten, dieetwensen bijhouden.",
  },
  {
    title: "Evangelisatie coördinator",
    category: "Zending & evangelisatie",
    shortDescription: "Coördineert buurtgerichte evangelisatieactiviteiten.",
    whyValuable: "De gemeente is actief betrokken bij haar directe omgeving.",
    concreteTasks: "Activiteiten plannen (straatevangelisatie, buurtfeest), vrijwilligers motiveren, contacten opvolgen, samenwerken met andere kerken.",
  },
  {
    title: "Gastgezin coördinator",
    category: "Gastvrijheid",
    shortDescription: "Koppelt nieuwe bezoekers aan gastgezinnen.",
    whyValuable: "Nieuwe mensen voelen zich snel thuis in de gemeente.",
    concreteTasks: "Gastgezinnen werven en informeren, bezoekers aanspreken na de dienst, koppels maken, opvolging coördineren.",
  },
  {
    title: "Vrijwilligerscoördinator",
    category: "Bestuur & beleid",
    shortDescription: "Werft en begeleidt vrijwilligers voor alle gemeentetaken.",
    whyValuable: "Taken worden goed bezet en vrijwilligers voelen zich gewaardeerd.",
    concreteTasks: "Vrijwilligers benaderen, roosters bijhouden, complimenten en feedback geven, nieuwe vrijwilligers inwerken, tekorten signaleren.",
  },
  {
    title: "Kerkkoor begeleider (piano/orgel)",
    category: "Muziek & aanbidding",
    shortDescription: "Begeleidt het kerkkoor op piano of orgel.",
    whyValuable: "Het koor kan oefenen en optreden met live begeleiding.",
    concreteTasks: "Wekelijks repetitie begeleiden, bladmuziek uitzoeken, afstemmen met koordirecteur, spelen tijdens diensten.",
  },
  {
    title: "Kinderopvang tijdens dienst",
    category: "Jeugd & kinderen",
    shortDescription: "Past op baby's en peuters (0-4 jaar) tijdens de dienst.",
    whyValuable: "Ouders kunnen de dienst bijwonen terwijl hun kleine kinderen veilig worden opgevangen.",
    concreteTasks: "Spelen en bezig houden van peuters, luiers verschonen, veiligheid bewaken, ouders geruststellen.",
  },
];

// ── Verbeterde prompt (zelfde als route.ts) ───────────────────────────────────
function buildPrompt(v) {
  return `
Je bent een expert in het matchen van vrijwilligers aan kerkelijke taken op basis van gaven en kwaliteiten.

Analyseer de onderstaande taakomschrijving en geef elk kwaliteit een gewicht dat weergeeft HOE ESSENTIEEL die kwaliteit is voor DEZE specifieke taak.

Regels:
- Gewicht 85-100: absoluut onmisbaar — iemand zonder deze kwaliteit kan de taak niet uitvoeren
- Gewicht 50-80: duidelijk helpend, maar niet doorslaggevend
- Gewicht 20-45: handig, maar bijzaak
- Geef MAXIMAAL 8 kwaliteiten een gewicht
- Wees ONDERSCHEIDEND: geef alleen hoge gewichten aan kwaliteiten die écht uniek zijn voor deze taak
- Vermijd generieke kwaliteiten (coordineren, plannen, overzicht) tenzij ze de KERN van de taak zijn
- Technische rollen: geef vakspecifieke technische kwaliteiten het hoogste gewicht (90-100); organisatorische skills zijn bijzaak (20-40)
- Sociale rollen: geef mensgerichte kwaliteiten het hoogste gewicht; techniek is bijzaak
- Eenvoudige taken: geef geen hoge gewichten aan geavanceerde skills — de drempel is laag

Taak: ${v.title}
Categorie: ${v.category}
Omschrijving: ${v.shortDescription}
Waarom waardevol: ${v.whyValuable}
Concreet: ${v.concreteTasks}

Beschikbare kwaliteiten (id: label):
${qualityList}

Geef je antwoord als JSON object: { "quality-id": gewicht, ... }
Gewichten zijn gehele getallen van 1-100. Geef alleen kwaliteiten terug met gewicht > 0.
Voorbeeld technische taak: { "geluid": 95, "livestream": 85, "ict2": 70, "plannen": 30 }
Voorbeeld sociale taak: { "luisteren": 95, "empathie": 90, "verbinden": 80, "helpen": 60 }
`.trim();
}

const insertVacancy = db.prepare(`
  INSERT INTO Vacancy (id, organizationId, title, category, shortDescription, whyValuable, concreteTasks, contactPersonName, contactPersonEmail, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'Beheerder', 'beheer@kerk.nl', 'active', datetime('now'), datetime('now'))
`);
const deleteWeights = db.prepare(`DELETE FROM VacancyQualityWeight WHERE vacancyId = ?`);
const insertWeight  = db.prepare(`INSERT INTO VacancyQualityWeight (id, vacancyId, qualityId, weight) VALUES (?, ?, ?, ?)`);
const getVacancy    = db.prepare(`SELECT id FROM Vacancy WHERE organizationId = ? AND title = ?`);

console.log(`\nOrganisatie ID: ${org.id}`);
console.log(`Vacatures toe te voegen: ${VACATURES.length}\n`);

for (const v of VACATURES) {
  // Check of al bestaat
  let row = getVacancy.get(org.id, v.title);
  let vacancyId;
  if (row) {
    vacancyId = row.id;
    console.log(`[skip] ${v.title} bestaat al`);
  } else {
    vacancyId = crypto.randomUUID();
    insertVacancy.run(vacancyId, org.id, v.title, v.category, v.shortDescription, v.whyValuable, v.concreteTasks);
  }

  // Genereer gewichten via OpenAI
  process.stdout.write(`Gewichten genereren voor: ${v.title}...`);
  let weights = {};
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(v) }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const raw = JSON.parse(resp.choices[0].message.content || "{}");
    for (const [id, w] of Object.entries(raw)) {
      if (validIds.has(id) && typeof w === "number" && w > 0) {
        weights[id] = Math.min(100, Math.max(1, Math.round(w)));
      }
    }
    console.log(` ${Object.keys(weights).length} kwaliteiten`);
  } catch (e) {
    console.log(` FOUT: ${e.message}`);
    continue;
  }

  // Sla op
  deleteWeights.run(vacancyId);
  for (const [qualityId, weight] of Object.entries(weights)) {
    insertWeight.run(crypto.randomUUID(), vacancyId, qualityId, weight);
  }
}

// ── Print alle gewichten overzichtelijk ──────────────────────────────────────
console.log("\n" + "═".repeat(65));
console.log("OVERZICHT — alle vacatures met gewichten\n");

const allRows = db.prepare(`
  SELECT v.title, v.category, vqw.qualityId, vqw.weight
  FROM Vacancy v
  JOIN VacancyQualityWeight vqw ON vqw.vacancyId = v.id
  WHERE v.organizationId = ? AND v.status = 'active'
  ORDER BY v.category, v.title, vqw.weight DESC
`).all(org.id);

let curTitle = "";
for (const r of allRows) {
  if (r.title !== curTitle) {
    curTitle = r.title;
    console.log(`\n[${r.category}] ${r.title}`);
  }
  const bar = "█".repeat(Math.round(r.weight / 10)).padEnd(10, "░");
  console.log(`  ${bar} ${r.weight.toString().padStart(3)}  ${r.qualityId}`);
}

console.log("\n" + "═".repeat(65));
console.log(`Klaar. ${VACATURES.length} vacatures verwerkt.`);
