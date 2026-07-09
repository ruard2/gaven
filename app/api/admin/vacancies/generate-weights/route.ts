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

Analyseer de onderstaande taakomschrijving en geef elk kwaliteit een gewicht dat weergeeft HOE ESSENTIEEL die kwaliteit is voor DEZE specifieke taak.

Regels:
- Gewicht 85-100: absoluut onmisbaar — iemand zonder deze kwaliteit kan de taak niet uitvoeren
- Gewicht 50-80: duidelijk helpend, maar niet doorslaggevend
- Gewicht 20-45: handig, maar bijzaak
- Geef MAXIMAAL 8 kwaliteiten een gewicht
- Wees ONDERSCHEIDEND: geef alleen hoge gewichten aan kwaliteiten die écht uniek zijn voor deze taak
- Vermijd generieke kwaliteiten (coordineren, plannen, overzicht) tenzij ze de KERN van de taak zijn
- Technische rollen: geef vakspecifieke technische kwaliteiten het hoogste gewicht (90-100); organisatorische skills zijn bijzaak (20-40)
- Sociale rollen: geef mensgerichte kwaliteiten het hoogste gewicht; techniek is bijzaak
- Eenvoudige taken: geef geen hoge gewichten aan geavanceerde skills — de drempel is laag

Taak: ${title}
Categorie: ${category}
Omschrijving: ${shortDescription}
Waarom waardevol: ${whyValuable || ""}
Concreet: ${concreteTasks || ""}

Beschikbare kwaliteiten (id: label):
${qualityList}

Geef je antwoord als JSON object: { "quality-id": gewicht, ... }
Gewichten zijn gehele getallen van 1-100. Geef alleen kwaliteiten terug met gewicht > 0.
Voorbeeld technische taak: { "geluid": 95, "livestream": 85, "ict2": 70, "plannen": 30 }
Voorbeeld sociale taak: { "luisteren": 95, "empathie": 90, "verbinden": 80, "helpen": 60 }
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
