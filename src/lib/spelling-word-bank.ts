export type Level = 1 | 2 | 3;

export type WordItem = {
  word: string;
  syllables: string[];
  tip: string;
  example: string;
  pattern: string;
};

export const WORD_BANK: Record<Level, WordItem[]> = {
  1: [
    { word: "the", syllables: ["the"], tip: "Say: th + uh. It is a small but important word.", example: "The dog ran home.", pattern: "function word" },
    { word: "was", syllables: ["was"], tip: "Remember: w-a-s, even though it may sound like wuz.", example: "He was very kind.", pattern: "function word" },
    { word: "his", syllables: ["his"], tip: "End with s: h-i-s.", example: "His bag is blue.", pattern: "final sound" },
    { word: "from", syllables: ["from"], tip: "Hear the blend fr at the start.", example: "She came from school.", pattern: "consonant blend" },
    { word: "with", syllables: ["with"], tip: "Start with w and finish with th.", example: "I went with Dad.", pattern: "function word" },
    { word: "went", syllables: ["went"], tip: "Tap every sound: w-e-n-t.", example: "We went to class.", pattern: "sound sequencing" },
    { word: "stop", syllables: ["stop"], tip: "Hear both sounds in st.", example: "Stop at the line.", pattern: "consonant blend" },
    { word: "best", syllables: ["best"], tip: "Do not drop the final t.", example: "Try your best today.", pattern: "final consonant" },
  ],
  2: [
    { word: "made", syllables: ["made"], tip: "Silent e makes a say its name.", example: "She made a card.", pattern: "silent e" },
    { word: "smile", syllables: ["smile"], tip: "Silent e makes i long: smile.", example: "His smile was bright.", pattern: "silent e" },
    { word: "became", syllables: ["be", "came"], tip: "Split it: be + came.", example: "The sky became dark.", pattern: "syllable chunking" },
    { word: "letter", syllables: ["let", "ter"], tip: "Double t in the middle.", example: "I wrote a letter.", pattern: "double consonant" },
    { word: "smelled", syllables: ["smelled"], tip: "Start with smell, then add ed.", example: "The flower smelled sweet.", pattern: "word ending" },
    { word: "fluttered", syllables: ["flut", "tered"], tip: "Build it: flutter + ed.", example: "The flag fluttered softly.", pattern: "word ending" },
    { word: "noise", syllables: ["noise"], tip: "The vowel team oi says oy.", example: "I heard a loud noise.", pattern: "vowel team" },
    { word: "their", syllables: ["their"], tip: "Their has heir inside it.", example: "Their house is nearby.", pattern: "confused word" },
  ],
  3: [
    { word: "advantage", syllables: ["ad", "van", "tage"], tip: "Say and type each chunk: ad-van-tage.", example: "Practice gives you an advantage.", pattern: "multisyllable" },
    { word: "exceptional", syllables: ["ex", "cep", "tion", "al"], tip: "Build it in four chunks.", example: "She did an exceptional job.", pattern: "multisyllable" },
    { word: "different", syllables: ["dif", "fer", "ent"], tip: "Double f, then end with ent.", example: "Each person is different.", pattern: "double consonant" },
    { word: "important", syllables: ["im", "por", "tant"], tip: "Listen for three beats: im-por-tant.", example: "Reading is important.", pattern: "multisyllable" },
    { word: "beautiful", syllables: ["beau", "ti", "ful"], tip: "Remember: beau + ti + ful.", example: "The garden looked beautiful.", pattern: "vowel pattern" },
    { word: "remember", syllables: ["re", "mem", "ber"], tip: "Say every chunk slowly.", example: "Remember to check your work.", pattern: "multisyllable" },
    { word: "because", syllables: ["be", "cause"], tip: "Big Elephants Can Always Understand Small Elephants.", example: "I smiled because I won.", pattern: "memory word" },
    { word: "sentence", syllables: ["sen", "tence"], tip: "It starts with sent, but ends with ence.", example: "Write one clear sentence.", pattern: "word ending" },
  ],
};

const SENTENCE_BANK: Record<Level, string[]> = {
  1: ["The dog ran home.", "He was very kind.", "We went to class."],
  2: ["She made a bright card.", "The flag fluttered softly.", "Their house is nearby."],
  3: ["Practice gives you an advantage.", "Reading is very important.", "Write one clear sentence."],
};

export function cleanWord(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z'-]/g, "");
}

export function lookupWord(word: string): WordItem | undefined {
  const target = cleanWord(word);
  for (const entries of Object.values(WORD_BANK)) {
    const match = entries.find((item) => item.word === target);
    if (match) return match;
  }
  return undefined;
}

export function fallbackInfo(word: string): WordItem {
  const clean = cleanWord(word) || word.trim();
  return {
    word: clean,
    syllables: [clean],
    tip: "Look, say, cover, type, and check the word.",
    example: `I can spell ${clean}.`,
    pattern: "practice word",
  };
}

export function pickRandomWord(level: Level): WordItem {
  const pool = WORD_BANK[level];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickRandomSentence(level: Level): string {
  const pool = SENTENCE_BANK[level];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickReviewWord(focusWords: string): string | undefined {
  const candidates = focusWords
    .split(",")
    .map(cleanWord)
    .filter(Boolean);
  if (!candidates.length) return undefined;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function parseLevel(value: string | null): Level {
  const level = Number(value);
  if (level === 2) return 2;
  if (level === 3) return 3;
  return 1;
}
