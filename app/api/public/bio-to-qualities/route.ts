import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { QUALITY_CATEGORIES } from "@/lib/qualities";
import { rateLimit, getIp } from "@/lib/rateLimit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);
const qualityList = allQualities.map((q) => `${q.id}: ${q.label}`).join("\n");

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 15)) {
    return NextResponse.json({ error: "Te veel verzoeken" }, { status: 429 });
  }
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

BELANGRIJK — niet verzinnen:
- Geef ALLEEN kwaliteiten die concreet uit de beschrijving blijken. Vul niet aan met wat "ook wel zou kunnen".
- Is de beschrijving vaag, kort, of zegt de persoon eigenlijk niets concreets (bijv. "weet niet", "zie wel", "geen idee")? Geef dan wéinig of GEEN kwaliteiten terug (desnoods een lege lijst). Een leeg profiel is beter dan een verzonnen profiel.
- Een negatieve zin ("ik wil niet...") levert géén kwaliteiten op.

Geef maximaal 6 kwaliteits-IDs terug, alleen die écht passen. Liever te weinig dan te veel.
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
