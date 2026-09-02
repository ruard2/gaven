import { NextRequest, NextResponse } from "next/server";
import { generateQualityWeights } from "@/lib/vacancyWeights";

export async function POST(req: NextRequest) {
  const { title, category, shortDescription, whyValuable, concreteTasks } = await req.json();

  try {
    const { weights, specificRequirements, taskLevel } = await generateQualityWeights({ title, category, shortDescription, whyValuable, concreteTasks });
    return NextResponse.json({ weights, specificRequirements, taskLevel });
  } catch (e) {
    console.error("OpenAI error:", e);
    return NextResponse.json({ weights: {}, specificRequirements: [], taskLevel: "regulier" }, { status: 500 });
  }
}
