import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);
const qualityList = allQualities.map((q) => `${q.id}: ${q.label}`).join("\n");

export async function POST(req: NextRequest) {
  const { bio } = await req.json();

  if (!bio || bio.trim().length < 5) {
    return NextResponse.json({ qualityIds: [], familieBonus: null });
  }

  const prompt = `
Je helpt bij het matchen van kerkleden aan vrijwilligerstaken.

Iemand beschreef zichzelf zo:
"${bio}"

Bepaal op basis van deze beschrijving:
1. Welke kwaliteiten waarschijnlijk bij deze persoon passen (uit de lijst hieronder)
2. Welke gave-familie het beste past: "Woord & waarheid", "Zorg & aanwezigheid", of "Richting & structuur"

Beschikbare kwaliteiten (id: label):
${qualityList}

Geef je antwoord als JSON:
{
  "qualityIds": ["id1", "id2", ...],
  "familieBonus": "Woord & waarheid" | "Zorg & aanwezigheid" | "Richting & structuur"
}

Geef maximaal 12 kwaliteits-IDs terug. Kies alleen kwaliteiten die écht passen bij de beschrijving.
Gebruik alleen IDs uit de lijst hierboven.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = JSON.parse(completion.choices[0].message.content || "{}");
    const validIds = new Set(allQualities.map((q) => q.id));

    const qualityIds = (content.qualityIds || []).filter((id: string) => validIds.has(id));
    const familieBonus = content.familieBonus || null;

    return NextResponse.json({ qualityIds, familieBonus });
  } catch (e) {
    console.error("Bio-to-qualities error:", e);
    return NextResponse.json({ qualityIds: [], familieBonus: null });
  }
}
