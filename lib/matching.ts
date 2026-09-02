import type { Vacancy, VacancyQualityWeight } from "@prisma/client";
import { meetsSpecific } from "./specific";

export type VacancyWithWeights = Vacancy & {
  qualityWeights: VacancyQualityWeight[];
};

export interface ProfileInput {
  qualities: string[];          // handmatig + bio-afgeleid samengevoegd
  negatives: string[];
  familieBonus?: string | null; // "Woord & waarheid" | "Zorg & aanwezigheid" | "Richting & structuur"
  workExperience?: string[];    // gekozen werkervarings-categorieën
  specificSkills?: string[];    // concrete specialismen uit eigen woorden (orgel, boekhouden…)
  age?: number | null;          // leeftijd in jaren (uit geboortejaar); null = onbekend
}

// Basis-toegankelijkheid per verantwoordelijkheidsniveau. Instap = iedereen welkom;
// verantwoordelijk = je matcht niet zomaar, je moet het echt hebben.
const LEVEL_BASE: Record<string, number> = { instap: 40, regulier: 30, verantwoordelijk: 12 };
// Jongeren worden tot deze leeftijd naar dienende taken gestuurd en van
// verantwoordelijke taken weggehouden.
const YOUTH_AGE = 21;
// Harde capaciteiten: concrete vaardigheden die je zelf moet opgeven. Ze mogen
// NIET gratis via de gave-familie of werkervaring worden toegekend (anders matcht
// een 13-jarige op "autorijden"). Alleen een directe eigen opgave telt.
const HARD_CAPABILITY = new Set<string>([
  "rijden", "koken", "klussen",
  "muziekspelen", "zingen", "dirigeren",
  "geluid", "livestream", "ict2", "appen",
  "boekhouding", "begroting", "fondsenwerving",
  "ontwerpen", "fotografie", "website", "socialmedia",
]);

function safeParseArray(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export interface MatchResult {
  vacancy: VacancyWithWeights;
  score: number;                // 0-100, voor intern gebruik
  stars: 1 | 2 | 3 | 4 | 5;
  matchedQualities: string[];
  specificMatch: boolean;       // voldoet aan een gevraagde specifieke gave (organist → orgel)
  tooYoung: boolean;            // jonger dan de minimumleeftijd van de taak
  minAge: number | null;        // minimumleeftijd van de taak (voor de melding)
  taskLevel: string;            // "instap" | "regulier" | "verantwoordelijk"
}

// Kwaliteiten die bij werkervaring horen (boost met 25% gewicht)
const WORK_QUALITY_MAP: Record<string, string[]> = {
  bestuur:        ["coordineren", "visie", "beleid", "beleid2", "netwerken", "projecten"],
  onderwijs:      ["geloofsopvoeding", "bijbelstudie", "tieners", "kinderopvang", "spreken", "mentorschap"],
  zorg:           ["luisteren", "empathie", "bezoeken", "bemoedigen", "pastoraat", "helpen", "rijden"],
  administratie:  ["administratie2", "plannen", "overzicht", "boekhouding", "begroting"],
  financien:      ["boekhouding", "begroting", "administratie2", "overzicht"],
  communicatie:   ["schrijven", "socialmedia", "website", "spreken", "netwerken"],
  ict:            ["ict2", "livestream", "geluid", "appen", "website"],
  bouw:           ["klussen", "overzicht", "plannen"],
  creatief:       ["ontwerpen", "fotografie", "website", "socialmedia", "schrijven"],
  horeca:         ["koken", "helpen", "verbinden"],
  logistiek:      ["plannen", "coordineren", "overzicht", "rijden"],
  ondernemerschap:["visie", "netwerken", "projecten", "coordineren", "evalueren"],
  student:        ["tieners", "jeugdactiviteiten", "mentorschap", "geloofsopvoeding", "bijbelstudie", "helpen"],
  thuis:          ["koken", "kinderopvang", "helpen", "rijden", "bemoedigen"],
  anders:         [],
};

// Kwaliteiten die bij elke gave-familie horen
const FAMILIE_QUALITIES: Record<string, string[]> = {
  "Woord & waarheid": [
    "schrijven", "spreken", "bijbelstudie", "gebed",
    "socialmedia", "website", "pastoraat", "geloofsopvoeding",
  ],
  "Zorg & aanwezigheid": [
    "luisteren", "empathie", "bezoeken", "bemoedigen", "verbinden",
    "pastoraat", "helpen", "koken", "rijden",
  ],
  "Richting & structuur": [
    "plannen", "coordineren", "projecten", "overzicht", "administratie2",
    "boekhouding", "begroting", "visie", "evalueren", "netwerken",
  ],
};

const NEGATIVE_QUALITY_MAP: Record<string, string[]> = {
  vooreenpgroep: ["spreken", "dirigeren", "zingen"],
  kinderen: ["kinderopvang", "tieners", "jeugdactiviteiten", "geloofsopvoeding"],
  admin: ["administratie2", "boekhouding", "begroting", "plannen"],
  techniek: ["geluid", "livestream", "ict2", "appen", "klussen"],
  overleg: ["coordineren", "projecten", "beleid2", "netwerken"],
  podium: ["spreken", "zingen", "dirigeren", "muziekspelen"],
  zwaregesprekken: ["pastoraat", "luisteren", "empathie"],
  lastminute: ["helpen", "koken"],
  regelmatig: ["plannen", "coordineren"],
};

function scoreToStars(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 42) return 3;
  if (score >= 20) return 2;
  return 1;
}

export function computeMatches(
  profile: ProfileInput,
  vacancies: VacancyWithWeights[]
): MatchResult[] {
  const qualitySet = new Set(profile.qualities);

  // Familie-bonus: voeg relevante kwaliteiten toe met lager gewicht
  const familieBoost = new Set<string>();
  if (profile.familieBonus && FAMILIE_QUALITIES[profile.familieBonus]) {
    for (const q of FAMILIE_QUALITIES[profile.familieBonus]) {
      familieBoost.add(q);
    }
  }

  // Werkervaring-boost: voeg kwaliteiten toe op basis van werkervaringscategorieën
  const workBoost = new Set<string>();
  for (const w of profile.workExperience ?? []) {
    for (const q of WORK_QUALITY_MAP[w] ?? []) {
      workBoost.add(q);
    }
  }

  // Negatieve kwaliteiten
  const negativeQualityIds = new Set(
    profile.negatives.flatMap((n) => NEGATIVE_QUALITY_MAP[n] ?? [])
  );

  const results: MatchResult[] = [];

  for (const vacancy of vacancies) {
    if (vacancy.status !== "active") continue;
    if (vacancy.qualityWeights.length === 0) continue;

    // Harde specifieke filter: bij zeer specifieke vacatures (bijv. organist →
    // "orgel") mag alleen wie het specialisme daadwerkelijk noemt hoog matchen.
    // Iemand met enkel generieke "muziek" of een ander instrument (gitaar) valt
    // terug naar de basisscore en wordt dus niet gekoppeld.
    const requirements = safeParseArray(vacancy.specificRequirements);
    const specificOk = meetsSpecific(requirements, profile.specificSkills ?? []);
    // De vacature vraagt om een specifieke gave én de vrijwilliger heeft die:
    // dit is een zeldzame, gerichte match die altijd bovenaan hoort.
    const isSpecialistMatch = requirements.length > 0 && specificOk;

    let totalWeight = 0;
    let matchedWeight = 0;
    let negativeConflictWeight = 0; // gewicht van kwaliteiten die conflicteren met voorkeuren
    let maxNegativeCoreWeight = 0;  // zwaarste kwaliteit die botst met een voorkeur
    const matchedQualities: string[] = [];

    for (const qw of vacancy.qualityWeights) {
      if (qw.weight === 0) continue;
      totalWeight += qw.weight;

      const directMatch = qualitySet.has(qw.qualityId);
      // Harde capaciteiten alleen via eigen opgave; nooit gratis via familie/werk.
      const inferable = !HARD_CAPABILITY.has(qw.qualityId);
      const familieMatch = inferable && familieBoost.has(qw.qualityId) && !directMatch;
      const workMatch = inferable && workBoost.has(qw.qualityId) && !directMatch && !familieMatch;
      const isNegative = negativeQualityIds.has(qw.qualityId);

      if (isNegative) {
        negativeConflictWeight += qw.weight;
        if (qw.weight > maxNegativeCoreWeight) maxNegativeCoreWeight = qw.weight;
      }

      if (directMatch) {
        matchedWeight += isNegative ? qw.weight * 0.3 : qw.weight;
        if (!isNegative) matchedQualities.push(qw.qualityId);
      } else if (familieMatch) {
        // Getemperd (was 0.4): de familie vouches alleen zacht, niet als bewijs.
        matchedWeight += isNegative ? 0 : qw.weight * 0.2;
      } else if (workMatch) {
        matchedWeight += isNegative ? 0 : qw.weight * 0.2;
      }
    }

    // Voldoet de vrijwilliger niet aan de specifieke eis, dan telt geen enkele
    // skill-overlap mee: score valt terug naar de basis (≈2★, "niet gekoppeld").
    if (!specificOk) {
      matchedWeight = 0;
      matchedQualities.length = 0;
    }

    // Basistoegankelijkheid hangt af van het verantwoordelijkheidsniveau: instap is
    // laagdrempelig (iedereen welkom), verantwoordelijk vraagt echt iets (lage basis,
    // dus je "matcht niet zomaar"). Verminderd naar rato van conflicterende voorkeuren.
    const level = (vacancy as { taskLevel?: string }).taskLevel || "regulier";
    const baseMax = LEVEL_BASE[level] ?? 30;
    const conflictRatio = totalWeight > 0 ? negativeConflictWeight / totalWeight : 0;
    const accessibilityBase = Math.round(baseMax * Math.max(0, 1 - conflictRatio * 2));

    // Skill-bonus vult de resterende ruimte (0–75 punten) op basis van kwaliteitsoverlap
    const rawSkillScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
    const skillBonus = Math.round((rawSkillScore / 100) * (100 - accessibilityBase));
    let score = Math.min(100, accessibilityBase + skillBonus);

    // Kern-capaciteit: heeft een niet-instaptaak een kernkwaliteit (gewicht ≥85) die de
    // vrijwilliger NIET zelf heeft opgegeven, dan ontbreekt de essentie — ook al matcht
    // hij op zachte bijzaken. Bij een harde vaardigheid (rijden/instrument/geluid…) valt
    // de score terug naar de basis; bij een zachte kernkwaliteit (bijv. "werken met jonge
    // kinderen" bij kinderoppas, "mensen bezoeken" bij bezoekwerk) naar hooguit ~3★.
    // Specialisten (die aan de specifieke eis voldoen) en instaptaken zijn uitgezonderd.
    if (!isSpecialistMatch && level !== "instap") {
      const coreIds = vacancy.qualityWeights.filter((qw) => qw.weight >= 85).map((qw) => qw.qualityId);
      if (coreIds.length > 0 && !coreIds.some((id) => qualitySet.has(id))) {
        const hardCore = coreIds.some((id) => HARD_CAPABILITY.has(id));
        score = Math.min(score, hardCore ? accessibilityBase : 55);
      }
    }

    // Botst de KERN van de taak (een kwaliteit met gewicht ≥80) met een expliciete
    // voorkeur ("mijdt kinderen" → kinderoppas), dan is dit fundamenteel geen match,
    // ook al scoort iemand hoog op randkwaliteiten. Hard terug naar ≈2★.
    if (maxNegativeCoreWeight >= 80) score = Math.min(score, 25);

    // Heeft de vrijwilliger de gevraagde specifieke gave, dan is dit dé match —
    // gegarandeerd 5★, ongeacht ruis in de kwaliteiten-afleiding.
    if (isSpecialistMatch) score = Math.max(score, 90);

    // Jongeren (< 21) worden richting dienende taken gestuurd: instaptaken krijgen een
    // boost, verantwoordelijke taken worden gedempt (ná de specialist-boost, zodat ook
    // een jong "specialist" niet zomaar bovenaan een verantwoordelijke taak komt).
    // Zo staan schoonmaak/welkom/koffie bovenaan en zakken ledenadmin/penningmeester weg.
    const young = profile.age != null && profile.age < YOUTH_AGE;
    if (young) {
      if (level === "instap") score = Math.min(100, score + 10);
      else if (level === "verantwoordelijk") score = Math.round(score * 0.6);
    }

    // Minimumleeftijd: is de leeftijd bekend en te laag, dan wordt de taak nog wel
    // getoond (met melding "vanaf X jaar") maar onderaan gesorteerd.
    const minAge = vacancy.minAge ?? null;
    const tooYoung =
      minAge != null && profile.age != null && profile.age < minAge;

    results.push({
      vacancy,
      score,
      stars: scoreToStars(score),
      matchedQualities,
      specificMatch: isSpecialistMatch,
      tooYoung,
      minAge,
      taskLevel: level,
    });
  }

  // Te jong onderaan; daarboven specialisme-matches eerst; daarbinnen op score.
  return results.sort((a, b) => {
    if (a.tooYoung !== b.tooYoung) return a.tooYoung ? 1 : -1;
    if (a.specificMatch !== b.specificMatch) return a.specificMatch ? -1 : 1;
    return b.score - a.score;
  });
}
