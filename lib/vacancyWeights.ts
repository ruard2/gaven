import OpenAI from "openai";
import { QUALITY_CATEGORIES } from "@/lib/qualities";
import { extractSpecificRequirements } from "@/lib/specific";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Sterker model dan gpt-4o-mini: betere discriminatie tussen kern- en bijzaak-kwaliteiten.
const MODEL = process.env.OPENAI_WEIGHTS_MODEL || "gpt-4o";

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);
const validIds = new Set(allQualities.map((q) => q.id));

// Groepeer per categorie zodat het model de structuur ziet i.p.v. één platte lijst deugden.
const qualityList = QUALITY_CATEGORIES.map(
  (c) => `## ${c.label}\n${c.qualities.map((q) => `${q.id}: ${q.label}`).join("\n")}`
).join("\n\n");

export interface WeightInput {
  title: string;
  category?: string;
  shortDescription?: string;
  whyValuable?: string;
  concreteTasks?: string;
}

function buildPrompt(input: WeightInput) {
  const { title, category, shortDescription, whyValuable, concreteTasks } = input;
  return `Je bepaalt welke kwaliteiten écht nodig zijn voor een concrete kerkelijke vrijwilligerstaak, zodat de app de juiste mensen kan matchen.

DENK EERST NA (intern), in deze volgorde:
1. Wat DOE je feitelijk in deze taak? Waar gaat de meeste tijd en energie naartoe? Beschrijf de kernactiviteit in één zin.
2. Welk type rol is dit? (bijv. muzikaal/podium, technisch/media, zorg/pastoraal, organisatorisch, creatief/communicatie, praktisch/hand-en-spandiensten, financieel, onderwijs/jeugd, bestuurlijk/strategisch)
3. Welke 1 à 2 kwaliteiten zijn de KERN — zonder deze is het geen zinvolle invulling van de taak?

WEEG DAARNA op basis van wat de taak feitelijk vraagt, NIET op basis van hoe vroom of algemeen-wenselijk een kwaliteit klinkt. Houd het TOEGANKELIJK — de meeste vrijwilligers zijn bescheiden en durven zichzelf niet als "expert" te bestempelen. Genereer daarom niet te zwaar:
- Geef precies ÉÉN kernkwaliteit een hoog gewicht (88-100): de vakspecifieke kwaliteit waar de taak letterlijk om draait.
- Alle andere relevante kwaliteiten: 45-78 (helpend en taak-specifiek, maar niet doorslaggevend).
- Losse bijzaak: 25-45.
- Laat kwaliteiten die niet echt relevant zijn gewoon weg (geef ze niet terug).
- Geef MAXIMAAL 6 kwaliteiten terug. Stapel geen rij hoge eisen op — dat schrikt af.

BELANGRIJKE VALKUIL — vermijd generieke "deugd"-kwaliteiten:
- "luisteren", "empathie", "bemoedigen", "verbinden" en "gebed" klinken bij élke kerktaak goed, maar weinig mensen durven zichzelf hierop hoog scoren. Geef ze daarom NOOIT meer dan 75, ook niet bij zorg-/pastorale taken.
- Bij zorg-/pastorale taken (bezoekwerk, pastoraat, omzien naar mensen) mag de kernkwaliteit een concrete ACTIVITEIT zijn (bijv. "bezoeken", "pastoraat"); de zachte deugden blijven daaronder (max 75).
- Bij muzikale, technische, creatieve, organisatorische, praktische of financiële taken zijn die deugden hooguit bijzaak (max ~35) of horen ze er niet bij. Zet ze daar NIET bovenaan.
- De hoogste gewichten horen bij de vakspecifieke kwaliteit die de taak definieert (bijv. muziek → zingen/muziekspelen/dirigeren; geluid → geluid/livestream; boekhouding → boekhouding/begroting; koken → koken).

Taak: ${title}
Categorie: ${category || "(onbekend)"}
Korte omschrijving: ${shortDescription || ""}
Waarom waardevol: ${whyValuable || ""}
Wat doe je concreet: ${concreteTasks || ""}

Bepaal ook het VERANTWOORDELIJKHEIDSNIVEAU van de taak:
- "instap": dienend, weinig verantwoordelijkheid, meteen mee te doen, geen commitment of vertrouwenspositie nodig (bijv. koffie schenken, opruimen, schoonmaak, welkom heten, stoelen klaarzetten, folders bezorgen).
- "regulier": meedraaien in een team, enige vaardigheid of regelmaat, maar geen eindverantwoordelijkheid (bijv. muziekgroep, oppas-assistent, bezoekwerk, beamer).
- "verantwoordelijk": vraagt commitment, overzicht, vertrouwen of het beheren van geld/gegevens/mensen (bijv. penningmeester, ledenadministratie, coördineren, leiding geven, bestuur, hoofd van een team).
Kies het niveau op basis van verantwoordelijkheid, NIET op basis van hoe moeilijk de vaardigheid is.

Beschikbare kwaliteiten (id: label), gegroepeerd per thema:
${qualityList}

Antwoord als JSON:
{
  "kernactiviteit": "<één zin>",
  "roltype": "<type rol>",
  "taskLevel": "instap" | "regulier" | "verantwoordelijk",
  "weights": { "<quality-id>": <geheel getal 1-100>, ... }
}
Gebruik uitsluitend id's uit de lijst hierboven.`;
}

export type TaskLevel = "instap" | "regulier" | "verantwoordelijk";
export interface GeneratedVacancyMeta {
  weights: Record<string, number>;
  specificRequirements: string[];
  taskLevel: TaskLevel;
}

export function sanitizeTaskLevel(v: unknown): TaskLevel {
  return v === "instap" || v === "verantwoordelijk" ? v : "regulier";
}

// Weights + niveau én specifieke eisen in één keer (parallel), zodat opslaan later
// géén extra AI-call meer nodig heeft en de coördinator alles kan zien/bewerken.
export async function generateQualityWeights(
  input: WeightInput
): Promise<GeneratedVacancyMeta> {
  const [wl, specificRequirements] = await Promise.all([
    generateWeightsOnly(input),
    extractSpecificRequirements(input),
  ]);
  return { weights: wl.weights, taskLevel: wl.taskLevel, specificRequirements };
}

async function generateWeightsOnly(
  input: WeightInput
): Promise<{ weights: Record<string, number>; taskLevel: TaskLevel }> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: buildPrompt(input) }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = completion.choices[0].message.content;
  const parsed = JSON.parse(content || "{}");
  const taskLevel = sanitizeTaskLevel(parsed.taskLevel);
  const weights = (parsed.weights ?? parsed) as Record<string, unknown>;

  // Zachte "deugd"-kwaliteiten die mensen zichzelf nauwelijks durven toekennen.
  // Deterministisch afkappen zodat een taak hier nooit een demotiverend hoge eis
  // op zet, ongeacht wat het model teruggeeft. Concrete activiteiten (bezoeken,
  // pastoraat, gebed, verbinden) blijven vrij — dat mag de kern van een taak zijn.
  const SOFT_CEILING: Record<string, number> = { luisteren: 75, empathie: 75, bemoedigen: 75 };

  const cleaned: Record<string, number> = {};
  for (const [id, weight] of Object.entries(weights)) {
    if (validIds.has(id) && typeof weight === "number" && weight > 0) {
      const capped = Math.min(SOFT_CEILING[id] ?? 100, Math.round(weight));
      cleaned[id] = Math.min(100, Math.max(1, capped));
    }
  }
  return { weights: cleaned, taskLevel };
}
