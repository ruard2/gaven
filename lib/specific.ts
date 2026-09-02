import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Keyword-extractie is een eenvoudige taak; klein/goedkoop model volstaat.
const MODEL = process.env.OPENAI_SPECIFIC_MODEL || "gpt-4o-mini";

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Bepaalt of een vrijwilliger voldoet aan de specifieke eisen van een vacature.
 * - Geen eisen -> altijd waar (generieke taak, geen harde filter).
 * - Anders: minimaal één eis moet overeenkomen met een specifieke vaardigheid.
 *   Match = genormaliseerde substring in beide richtingen (orgel ⊂ kerkorgel),
 *   met tokens van minimaal 3 tekens om toevallige overlap te vermijden.
 */
export function meetsSpecific(requirements: string[], skills: string[]): boolean {
  const reqs = requirements.map(normalize).filter((r) => r.length >= 3);
  if (reqs.length === 0) return true;
  const skl = skills.map(normalize).filter((s) => s.length >= 3);
  if (skl.length === 0) return false;
  return reqs.some((r) => skl.some((s) => s === r || s.includes(r) || r.includes(s)));
}

async function extractKeywords(prompt: string, key: "requirements" | "skills"): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    const list = Array.isArray(parsed[key]) ? parsed[key] : [];
    return [...new Set(
      list
        .filter((x: unknown): x is string => typeof x === "string")
        .map((x: string) => x.toLowerCase().trim())
        .filter((x: string) => x.length >= 2 && x.length <= 40)
    )].slice(0, 8);
  } catch (e) {
    console.error("Specific-extraction error:", e);
    return [];
  }
}

// Maakt een door mensen bewerkte lijst eisen schoon: kleine letters, ontdubbeld,
// lege eruit, gemaximeerd. Gebruikt bij opslaan van door de coördinator ingevoerde
// of aangepaste eisen (geen AI-call nodig).
export function sanitizeRequirements(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(
    input
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.toLowerCase().trim())
      .filter((x) => x.length >= 2 && x.length <= 40)
  )].slice(0, 5);
}

export interface VacancyTextInput {
  title: string;
  category?: string;
  shortDescription?: string;
  whyValuable?: string;
  concreteTasks?: string;
  longDescription?: string;
}

/**
 * Haalt ALLEEN echte, harde specialismen uit een vacature (specifiek instrument,
 * apparaat, softwarepakket, certificaat, vakspecifieke techniek). Streng: bij
 * twijfel leeg, zodat generieke taken geen onterechte harde filter krijgen.
 */
export async function extractSpecificRequirements(v: VacancyTextInput): Promise<string[]> {
  const prompt = `Je bepaalt of een kerkelijke vrijwilligerstaak een ECHT SPECIFIEK specialisme vereist dat je niet kunt afleiden uit een brede categorie.

Geef ALLEEN een eis als de taak een SPECIFIEK, TASTBAAR specialisme vereist dat
een brede kwaliteit als "muziek spelen" niet dekt: een specifiek muziekinstrument,
een benoemd apparaat/installatie, een benoemd softwarepakket, of een echt beroep/
vak met opleiding. Gebruik het woord dat de vrijwilliger zélf zou gebruiken.

Voorbeelden MET een specifieke eis:
- "Organist" -> ["orgel"]        (want "muziek spelen" zegt niet WELK instrument)
- "Gitarist in de band" -> ["gitaar"]
- "Geluidstechnicus" -> ["mengtafel"]
- "Boekhouder / penningmeester" -> ["boekhouden"]
- "Tolk gebarentaal" -> ["gebarentaal"]

Voorbeelden ZONDER specifieke eis (geef []):
- "Koffie schenken", "Gastheer/welkom", "Schoonmaak", "Kinderoppas",
  "Muzikant" (algemeen, geen instrument genoemd), "Klussen", "Bezoekwerk",
  "Coördinator", "Social media", "Kerkblad", "Chauffeur".
- "Zanger / voorzanger" -> []  (zingen is een algemene vaardigheid, geen specialisme)
- "Ledenadministratie" -> []   (gewone gegevensinvoer, geen vak)
- "Beamerteam" -> []           (in een kwartier te leren)

BELANGRIJKE REGELS:
- Verzin NOOIT een abstract vaardigheids-woord ("stemtechniek", "administratie-
  software", "muziektheorie", "organisatietalent"). Alleen een concreet, benoembaar
  instrument/apparaat/softwarepakket/beroep telt.
- Is de kernvaardigheid een algemeen-menselijke vaardigheid (zingen, schrijven,
  koken, opruimen, luisteren, organiseren, gegevens invoeren, beamer bedienen)?
  Dan geef je [] — die vangt de app al met gewone kwaliteiten op.
- Neem alleen iets op als het jaren oefening, een opleiding of een echt vak vergt.

Wees STRENG. Bij twijfel: geef [].
Geef maximaal 3 kernwoorden, in het enkelvoud, kleine letters, zonder werkwoord ("orgel", niet "orgel spelen").

Taak: ${v.title}
Categorie: ${v.category || ""}
Omschrijving: ${v.shortDescription || ""}
${v.concreteTasks || ""} ${v.whyValuable || ""} ${v.longDescription || ""}

Antwoord als JSON: { "requirements": ["..."] }`;
  return extractKeywords(prompt, "requirements");
}

/**
 * Haalt ALLEEN concreet genoemde specialismen uit de eigen woorden van een
 * vrijwilliger (instrument, tool, softwarepakket, vak). Vage eigenschappen
 * ("houdt van muziek", "sociaal") tellen NIET mee.
 */
export async function extractSpecificSkills(bio?: string | null, workbio?: string | null): Promise<string[]> {
  const text = [bio, workbio].filter(Boolean).join("\n").trim();
  if (text.length < 4) return [];
  const prompt = `Hieronder beschrijft een kerklid zichzelf, zijn/haar werk en dagelijks leven.

Haal ALLEEN concrete, specifieke vaardigheden/specialismen eruit die de persoon EXPLICIET noemt en aantoonbaar beheerst: een specifiek muziekinstrument, apparaat, softwarepakket, certificaat of vak/beroep.

Onderscheid KUNNEN van HOUDEN-VAN: alleen wat de persoon zelf actief beheerst of
doet telt. Passieve interesse, luisteren, mooi vinden of "graag willen leren"
telt NIET.

WEL meenemen (voorbeelden):
- "Ik speel orgel en een beetje piano" -> ["orgel","piano"]
- "Ik werk als boekhouder" -> ["boekhouden"]
- "Ik doe videobewerking met Premiere" -> ["videobewerking","premiere"]

NIET meenemen (geef die niet terug):
- algemene eigenschappen: behulpzaam, sociaal, betrokken
- vage voorkeuren: "ik hou van muziek", "vind techniek leuk"
- PASSIEVE interesse: "ik luister graag naar orgelmuziek" -> []  (hij speelt niet zelf)
  "ik hou van klassieke muziek", "vind boekhouden interessant", "wil graag leren gitaarspelen" -> []

Als er niets concreets staat: geef [].
Geef maximaal 8 kernwoorden, enkelvoud, kleine letters.

Tekst:
"${text.slice(0, 1500)}"

Antwoord als JSON: { "skills": ["..."] }`;
  return extractKeywords(prompt, "skills");
}
