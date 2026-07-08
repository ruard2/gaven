import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);
const qualityList = allQualities.map((q) => `${q.id}: ${q.label}`).join("\n");

export async function POST(req: NextRequest) {
  const { work } = await req.json();

  if (!work || work.trim().length < 3) {
    return NextResponse.json({ qualityIds: [], familieBonus: null });
  }

  const prompt = `
Je helpt bij het matchen van mensen aan vrijwilligerstaken in een kerk.

Iemand beschrijft zijn of haar werk, studie of dagelijkse bezigheid:
"${work}"

Leid hieruit af welke kwaliteiten deze persoon waarschijnlijk heeft op basis van hun achtergrond en ervaring.
Denk aan vaardigheden, competenties en eigenschappen die je opdoet in dat beroep of die studie.

Bepaal ook welke gave-familie het beste past bij deze achtergrond:
- "Woord & waarheid": communicatie, lesgeven, bijbel, geloof, schrijven, spreken
- "Zorg & aanwezigheid": zorg, mensen helpen, luisteren, pastoraat, bezoek
- "Richting & structuur": organiseren, plannen, bestuur, financiën, projecten

Beschikbare kwaliteiten (id: label):
${qualityList}

Geef je antwoord als JSON:
{
  "qualityIds": ["id1", "id2", ...],
  "familieBonus": "Woord & waarheid" | "Zorg & aanwezigheid" | "Richting & structuur" | null
}

Geef maximaal 10 kwaliteits-IDs terug die écht aansluiten bij deze werkachtergrond.
Gebruik alleen IDs uit de lijst hierboven.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = JSON.parse(completion.choices[0].message.content || "{}");
    const validIds = new Set(allQualities.map((q) => q.id));

    const qualityIds = (content.qualityIds || []).filter((id: string) => validIds.has(id));
    const familieBonus = content.familieBonus || null;

    return NextResponse.json({ qualityIds, familieBonus });
  } catch (e) {
    console.error("Work-to-qualities error:", e);
    return NextResponse.json({ qualityIds: [], familieBonus: null });
  }
}
