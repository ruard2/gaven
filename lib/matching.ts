import type { Vacancy, VacancyQualityWeight } from "@prisma/client";

export type VacancyWithWeights = Vacancy & {
  qualityWeights: VacancyQualityWeight[];
};

export interface ProfileInput {
  qualities: string[];          // handmatig + bio-afgeleid samengevoegd
  negatives: string[];
  familieBonus?: string | null; // "Woord & waarheid" | "Zorg & aanwezigheid" | "Richting & structuur"
}

export interface MatchResult {
  vacancy: VacancyWithWeights;
  score: number;                // 0-100, voor intern gebruik
  stars: 1 | 2 | 3 | 4 | 5;
  matchedQualities: string[];
}

// Kwaliteiten die bij elke gave-familie horen
const FAMILIE_QUALITIES: Record<string, string[]> = {
  "Woord & waarheid": [
    "schrijven", "spreken", "bijbelstudie", "gebed", "evangeliseren",
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
  if (score >= 70) return 5;
  if (score >= 50) return 4;
  if (score >= 35) return 3;
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

  // Negatieve kwaliteiten
  const negativeQualityIds = new Set(
    profile.negatives.flatMap((n) => NEGATIVE_QUALITY_MAP[n] ?? [])
  );

  const results: MatchResult[] = [];

  for (const vacancy of vacancies) {
    if (vacancy.status !== "active") continue;
    if (vacancy.qualityWeights.length === 0) continue;

    let totalWeight = 0;
    let matchedWeight = 0;
    const matchedQualities: string[] = [];

    for (const qw of vacancy.qualityWeights) {
      if (qw.weight === 0) continue;
      totalWeight += qw.weight;

      const directMatch = qualitySet.has(qw.qualityId);
      const familieMatch = familieBoost.has(qw.qualityId) && !directMatch;
      const isNegative = negativeQualityIds.has(qw.qualityId);

      if (directMatch) {
        const contribution = isNegative ? qw.weight * 0.3 : qw.weight;
        matchedWeight += contribution;
        if (!isNegative) matchedQualities.push(qw.qualityId);
      } else if (familieMatch) {
        // Familie-bonus telt voor 40% van het gewicht
        const contribution = isNegative ? 0 : qw.weight * 0.4;
        matchedWeight += contribution;
      }
    }

    // Normaliseer: score loopt tot 100, maar we schalen zo dat
    // een goede gedeeltelijke match al 50+ scoort
    const rawScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;

    // Boost kleine scores iets op zodat de spreiding beter voelt
    const boostedScore = rawScore < 20 ? rawScore * 1.5 : rawScore;
    const score = Math.min(100, Math.round(boostedScore));

    results.push({
      vacancy,
      score,
      stars: scoreToStars(score),
      matchedQualities,
    });
  }

  // Sorteer op score, toon ook lage matches
  return results.sort((a, b) => b.score - a.score);
}
