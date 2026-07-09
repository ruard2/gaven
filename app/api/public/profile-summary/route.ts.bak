import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { QUALITY_CATEGORIES, NEGATIVE_PREFERENCES } from "@/lib/qualities";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);

export async function POST(req: NextRequest) {
  const { bio, qualities, negatives, name } = await req.json();

  const qualityLabels = (qualities as string[])
    .map((id) => allQualities.find((q) => q.id === id)?.label)
    .filter(Boolean);

  const negativeLabels = (negatives as string[])
    .map((id) => NEGATIVE_PREFERENCES.find((n) => n.id === id)?.label)
    .filter(Boolean);

  const prompt = `
Je bent een vriendelijke assistent die mensen helpt hun plek te vinden in een kerkgemeenschap.

Op basis van de volgende informatie over een gemeentelid schrijf je een korte, warme karakterschets.
De toon is persoonlijk, herkenbaar, niet overdreven en niet zweverig.
Geen psychologisch jargon. Schrijf alsof je de persoon een beetje kent.

Naam: ${name}
Dagelijks leven (eigen woorden): "${bio || "niet ingevuld"}"
Kwaliteiten die bij hen passen: ${qualityLabels.join(", ") || "niet ingevuld"}
Wat minder past: ${negativeLabels.join(", ") || "niets aangegeven"}

Geef je antwoord in dit exacte JSON-formaat:

{
  "openingszin": "één korte zin die de kern van deze persoon raakt (max 10 woorden, geen naam erin)",
  "schets": "twee à drie zinnen karakterschets. Warm, concreet, herkenbaar. Geen opsomming.",
  "familie": "één van: Woord & waarheid | Zorg & aanwezigheid | Richting & structuur",
  "familieToelichting": "één zin die uitlegt waarom dit bij hen past",
  "bijbelvers": "een kort bijbelvers dat aansluit bij dit profiel (maximaal 15 woorden)",
  "bijbelbron": "bijv. Galaten 6:2"
}

Schrijf alles in het Nederlands. Gebruik 'jij/jou' taal.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    const result = JSON.parse(content || "{}");
    return NextResponse.json(result);
  } catch (e) {
    console.error("OpenAI error:", e);
    // Fallback als OpenAI niet beschikbaar is
    return NextResponse.json({
      openingszin: "Iemand die er graag voor anderen is",
      schets: "Op basis van wat je hebt ingevuld zie je iemand die praktisch betrokken wil zijn. Niet van een afstand, maar dichtbij.",
      familie: "Zorg & aanwezigheid",
      familieToelichting: "Je beweegt je het meest als je concreet iets kunt betekenen voor anderen.",
      bijbelvers: "Draag elkanders lasten",
      bijbelbron: "Galaten 6:2",
    });
  }
}
