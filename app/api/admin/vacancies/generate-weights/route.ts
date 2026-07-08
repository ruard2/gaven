import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);
const qualityList = allQualities.map((q) => `${q.id}: ${q.label}`).join("\n");

export async function POST(req: NextRequest) {
  const { title, category, shortDescription, whyValuable, concreteTasks } = await req.json();

  const prompt = `
Je bent een assistent die helpt bij het matchen van vrijwilligers aan kerkelijke taken.

Op basis van de taakomschrijving hieronder bepaal je welke kwaliteiten relevant zijn voor deze taak en hoe zwaar (0-100).
Alleen kwaliteiten die écht passen krijgen een gewicht boven 0. Geef maximaal 8 kwaliteiten een gewicht.

Taak: ${title}
Categorie: ${category}
Omschrijving: ${shortDescription}
Waarom waardevol: ${whyValuable || ""}
Concreet: ${concreteTasks || ""}

Beschikbare kwaliteiten (id: label):
${qualityList}

Geef je antwoord als JSON object waarbij de keys de quality-ids zijn en de values gewichten van 0-100.
Geef alleen kwaliteiten terug met gewicht > 0.
Voorbeeld: { "luisteren": 80, "empathie": 90, "plannen": 40 }
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    const weights = JSON.parse(content || "{}");

    // Valideer dat alle keys echte quality-ids zijn
    const validIds = new Set(allQualities.map((q) => q.id));
    const cleaned: Record<string, number> = {};
    for (const [id, weight] of Object.entries(weights)) {
      if (validIds.has(id) && typeof weight === "number" && weight > 0) {
        cleaned[id] = Math.min(100, Math.max(0, Math.round(weight as number)));
      }
    }

    return NextResponse.json({ weights: cleaned });
  } catch (e) {
    console.error("OpenAI error:", e);
    return NextResponse.json({ weights: {} }, { status: 500 });
  }
}
