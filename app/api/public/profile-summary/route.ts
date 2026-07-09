import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { QUALITY_CATEGORIES, NEGATIVE_PREFERENCES } from "@/lib/qualities";
import { getGiftsForFamilie } from "@/lib/gifts";
import { rateLimit, getIp } from "@/lib/rateLimit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 10)) {
    return NextResponse.json({ error: "Te veel verzoeken" }, { status: 429 });
  }
  const { bio, workbio, qualities, allQualityIds, negatives, name, familieBonus } = await req.json();

  // allQualityIds = handmatig + werk-AI gecombineerd (meest volledig)
  const qualityIds: string[] = allQualityIds?.length ? allQualityIds : (qualities ?? []);
  const qualityLabels = qualityIds
    .map((id: string) => allQualities.find((q) => q.id === id)?.label)
    .filter(Boolean) as string[];

  const negativeLabels = ((negatives ?? []) as string[])
    .map((id: string) => NEGATIVE_PREFERENCES.find((n) => n.id === id)?.label)
    .filter(Boolean) as string[];

  const resolvedFamilie = familieBonus || null;
  const biblicalFamily  = resolvedFamilie ? getGiftsForFamilie(resolvedFamilie) : null;
  const biblicalLabel   = biblicalFamily?.label ?? null;
  const biblicalGiftNames = biblicalFamily?.gifts.map((g) => g.name).join(", ") ?? "";

  const familieHint = resolvedFamilie
    ? `De gave-familie is al bepaald als: "${resolvedFamilie}" (${biblicalLabel ?? ""}). Bijbehorende bijbelse gaven zijn: ${biblicalGiftNames}. Gebruik deze taal waar passend.`
    : "";

  const prompt = `
Je schrijft een warm, persoonlijk gavenprofiel voor een gemeentelid van een kerk.

OVER DEZE PERSOON:
- Naam: ${name || "Gemeentelid"}
- Dagelijks leven (eigen woorden): "${bio || "niet ingevuld"}"
- Werk of studie: "${workbio || "niet ingevuld"}"
- Gekozen gaven en kwaliteiten: ${qualityLabels.join(", ") || "geen opgegeven"}
- Wat minder bij hen past: ${negativeLabels.join(", ") || "niets aangegeven"}
${familieHint}

INSTRUCTIES:
1. De "openingszin" is een krachtige, specifieke zin die direct verwijst naar wat ECHT bij DEZE persoon past — noem minimaal één concrete gave. Geen generieke zinnen als "voor anderen klaarstaat".
2. De "schets" (2-3 zinnen) verbindt het dagelijks leven en werk met de gekozen gaven. Gebruik indien passend bijbelse gave-taal (${biblicalLabel ? `"${biblicalLabel} karakter"` : "priesterlijk/profetisch/koninklijk"}). Schrijf persoonlijk maar niet overdreven.
3. De "highlights" zijn 3 tot 4 korte steekwoorden of zinsdelen die de kern-gaven samenvatten (max 5 woorden elk). Kies de meest onderscheidende gaven uit de lijst.
4. De "familie" sluit aan bij de bovengenoemde gave-familie als die beschikbaar is.
5. Het "bijbelvers" sluit specifiek aan bij de dominante gaven van deze persoon.

TOON: warm, direct, geen jargon. Schrijf in "jij/jou" vorm. Alles in het Nederlands.

Geef antwoord als dit exacte JSON:
{
  "openingszin": "één zin, max 10 woorden, specifiek, geen naam erin",
  "schets": "2-3 zinnen die werk en gaven concreet verbinden",
  "highlights": ["gave of eigenschap 1", "gave of eigenschap 2", "gave of eigenschap 3"],
  "familie": "één van: Woord & waarheid | Zorg & aanwezigheid | Richting & structuur",
  "familieToelichting": "één specifieke zin waarom dit bij hen past",
  "bijbelvers": "kort vers, max 15 woorden",
  "bijbelbron": "bijv. Mattheüs 5:14"
}`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.65,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json({
      ...result,
      qualityLabels,
      workbio: workbio || null,
    });
  } catch (e) {
    console.error("OpenAI error:", e);
    return NextResponse.json({
      openingszin: "Iemand die er graag voor anderen is",
      schets: "Op basis van wat je hebt ingevuld zie je iemand die praktisch betrokken wil zijn. Niet van een afstand, maar dichtbij.",
      highlights: ["Anderen helpen", "Betrokken aanwezig"],
      familie: "Zorg & aanwezigheid",
      familieToelichting: "Je beweegt je het meest als je concreet iets kunt betekenen voor anderen.",
      bijbelvers: "Draag elkanders lasten",
      bijbelbron: "Galaten 6:2",
      qualityLabels,
      workbio: workbio || null,
    });
  }
}
