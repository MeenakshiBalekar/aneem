import { NextResponse } from "next/server";
import { getStyleRecommendations, type StyleContext } from "@/lib/ai/style-assistant";

const VALID_CONTEXTS: StyleContext[] = ["gym", "travel", "weekend", "office", "college"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const context = searchParams.get("context") as StyleContext | null;

  if (!context || !VALID_CONTEXTS.includes(context)) {
    return NextResponse.json({ error: "context must be one of: " + VALID_CONTEXTS.join(", ") }, { status: 400 });
  }

  const result = await getStyleRecommendations(context);
  return NextResponse.json(result);
}
