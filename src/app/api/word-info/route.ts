import { NextRequest, NextResponse } from "next/server";
import { cleanWord, fallbackInfo, lookupWord } from "@/lib/spelling-word-bank";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word") || "";
  const clean = cleanWord(word);

  if (!clean) {
    return NextResponse.json(fallbackInfo("word"));
  }

  const known = lookupWord(clean);
  if (known) {
    return NextResponse.json({ ...known, word: clean });
  }

  return NextResponse.json(fallbackInfo(clean));
}
