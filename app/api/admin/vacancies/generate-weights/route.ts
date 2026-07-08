import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);
const qualityList = allQualities.map((q) => `${q.id}: ${q.label}`).join("\n");

export async function POST(req: NextRequest) {
  const { title, category, shortDescription, whyValuable, concreteTasks } = await req.json();

  const prompt = `
Je bent een expert in het matchen van vrijwilligers aan kerkelijke taken op basis van gaven en kwaliteiten.

Analyseer de onderstaande taakomschrijving en bepaal welke kwaliteiten iemand nodig heeft om deze taak goed te vervullen.
Wees precies: een hoog gewicht (80-100) betekent dat deze kwaliteit essentieel is voor de taak.
Een middelhoog gewicht (40-70) betekent dat het helpt maar niet doorslaggevend is.
Geef maximaal 10 kwaliteiten een gewicht, alleen die écht relevant zijn.

Taak: ${title}
Categorie: ${category}
Omschrijving: ${shortDescription}
Waarom waardevol: ${whyValuable || ""}
Concreet: ${concreteTasks || ""}

Beschikbare kwaliteiten (id: label):
${qualityList}

Geef je antwoord als JSON object: { "quality-id": gewicht, ... }
Gewichten zijn gehele getallen van 1-100. Geef alleen kwaliteiten terug met gewicht > 0.
Voorbeeld: { "luisteren": 85, "empathie": 90, "plannen": 45 }
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
