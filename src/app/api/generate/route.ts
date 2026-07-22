import { NextRequest, NextResponse } from "next/server";
import { parseLevel, pickRandomSentence, pickRandomWord, pickReviewWord } from "@/lib/spelling-word-bank";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("mode") || "word";
  const level = parseLevel(searchParams.get("level"));
  const focusWords = searchParams.get("focus_words");

  if (focusWords) {
    const chosen = pickReviewWord(focusWords);
    if (chosen) {
      if (mode === "word") {
        return NextResponse.json({ text: chosen, source: "review" });
      }
      return NextResponse.json({ text: `Please use ${chosen} in a sentence.`, source: "review" });
    }
  }

  if (mode === "word") {
    const item = pickRandomWord(level);
    return NextResponse.json({ text: item.word, pattern: item.pattern, source: "curated" });
  }

  return NextResponse.json({ text: pickRandomSentence(level), source: "curated" });
}
