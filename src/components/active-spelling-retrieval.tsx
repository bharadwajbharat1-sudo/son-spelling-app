"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "practice" | "learn" | "complete";
type Feedback = "idle" | "correct" | "incorrect";
type Level = 1 | 2 | 3;

type WordInfo = {
  word?: string;
  syllables: string[];
  tip: string;
  example: string;
  pattern?: string;
};

type Stats = {
  attempted: number;
  correctFirstTry: number;
  mastered: number;
};

const EXTERNAL_API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const generateUrl = (query: string) =>
  EXTERNAL_API ? `${EXTERNAL_API}/generate?${query}` : `/api/generate?${query}`;
const wordInfoUrl = (word: string) =>
  EXTERNAL_API
    ? `${EXTERNAL_API}/word-info?word=${encodeURIComponent(word)}`
    : `/api/word-info?word=${encodeURIComponent(word)}`;
const REVIEW_AFTER_NEW_WORDS = 3;
const REQUIRED_CORRECT_REPEATS = 2;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f4f8ff 0%, #ffffff 60%)",
    color: "#172033",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: "24px 16px 48px",
  },
  shell: { maxWidth: 760, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: 20 },
  card: {
    background: "#ffffff",
    border: "1px solid #dbe4f0",
    borderRadius: 22,
    boxShadow: "0 12px 35px rgba(42, 61, 92, 0.10)",
    padding: 24,
  },
  row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  button: {
    border: 0,
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    background: "#e9f0ff",
    color: "#1c3f78",
  },
  primaryButton: {
    border: 0,
    borderRadius: 12,
    padding: "13px 22px",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    background: "#2457d6",
    color: "white",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "2px solid #9fb4d1",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 27,
    textAlign: "center",
    letterSpacing: 1,
    outline: "none",
    margin: "16px 0 12px",
  },
  pill: {
    borderRadius: 999,
    background: "#eef4ff",
    color: "#274f88",
    padding: "7px 11px",
    fontSize: 14,
    fontWeight: 700,
  },
};

export default function SpellingApp() {
  const [mode, setMode] = useState<Mode>("practice");
  const [level, setLevel] = useState<Level>(1);
  const [word, setWord] = useState("");
  const [input, setInput] = useState("");
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [message, setMessage] = useState("Listen carefully, then type the word.");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [repeatCount, setRepeatCount] = useState(0);
  const [newWordsSinceReview, setNewWordsSinceReview] = useState(0);
  const [showWord, setShowWord] = useState(false);
  const [stats, setStats] = useState<Stats>({ attempted: 0, correctFirstTry: 0, mastered: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const accuracy = useMemo(() => {
    if (!stats.attempted) return 0;
    return Math.round((stats.correctFirstTry / stats.attempted) * 100);
  }, [stats]);

  const speak = useCallback((text: string, rate = 0.68) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const spellAloud = () => {
    if (!word) return;
    speak(`${word}. ${word.split("").join(". ")}`, 0.58);
  };

  const fetchInfo = async (targetWord: string) => {
    try {
      const response = await fetch(wordInfoUrl(targetWord));
      if (!response.ok) throw new Error(`Word information failed (${response.status})`);
      const data = (await response.json()) as WordInfo;
      setInfo({
        syllables: Array.isArray(data.syllables) && data.syllables.length ? data.syllables : [targetWord],
        tip: data.tip || "Look, say, cover, type, and check.",
        example: data.example || `I can spell ${targetWord}.`,
        pattern: data.pattern || "practice word",
      });
    } catch {
      setInfo({
        syllables: [targetWord],
        tip: "Look, say, cover, type, and check.",
        example: `I can spell ${targetWord}.`,
        pattern: "practice word",
      });
    }
  };

  const loadWord = useCallback(async (forceReview = false) => {
    setLoading(true);
    setError("");
    setInput("");
    setInfo(null);
    setFeedback("idle");
    setShowWord(false);
    setRepeatCount(0);
    setMode("practice");

    try {
      const shouldReview = reviewQueue.length > 0 && (forceReview || newWordsSinceReview >= REVIEW_AFTER_NEW_WORDS);
      const focus = shouldReview ? `&focus_words=${encodeURIComponent(reviewQueue.join(","))}` : "";
      const response = await fetch(generateUrl(`mode=word&level=${level}${focus}`), { cache: "no-store" });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      const nextWord = String(data.text || "").trim().toLowerCase();
      if (!nextWord) throw new Error("The server returned an empty word.");

      setWord(nextWord);
      if (shouldReview) {
        setNewWordsSinceReview(0);
        setMessage("Review word: listen, remember, and type it.");
      } else {
        setNewWordsSinceReview((count) => count + 1);
        setMessage("Listen carefully, then type the word.");
      }
      setTimeout(() => speak(nextWord), 180);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown connection error";
      setError(`Could not load a word. ${detail}`);
      setWord("");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [level, newWordsSinceReview, reviewQueue, speak]);

  useEffect(() => {
    void loadWord();
  }, [level]); // deliberately reload only when the level changes

  const normalize = (value: string) => value.trim().toLowerCase();

  const submitPractice = async (event: FormEvent) => {
    event.preventDefault();
    if (!word || !normalize(input)) return;

    const isCorrect = normalize(input) === normalize(word);
    setStats((current) => ({
      ...current,
      attempted: current.attempted + 1,
      correctFirstTry: current.correctFirstTry + (isCorrect ? 1 : 0),
    }));

    if (isCorrect) {
      setFeedback("correct");
      setMessage("Correct! Great careful listening.");
      speak("Correct. Great job.");
      setReviewQueue((queue) => queue.filter((item) => item !== word));
      window.setTimeout(() => void loadWord(), 700);
      return;
    }

    setFeedback("incorrect");
    setMessage("Good try. Let us learn this word in small steps.");
    setReviewQueue((queue) => (queue.includes(word) ? queue : [...queue, word]));
    setInput("");
    setRepeatCount(0);
    setMode("learn");
    setShowWord(true);
    await fetchInfo(word);
    speak(`The word is ${word}`);
  };

  const submitLearning = (event: FormEvent) => {
    event.preventDefault();
    if (!normalize(input)) return;

    if (normalize(input) !== normalize(word)) {
      setFeedback("incorrect");
      setMessage("Almost. Look at the word, then type it again.");
      speak("Almost. Try again slowly.");
      setInput("");
      return;
    }

    const next = repeatCount + 1;
    setRepeatCount(next);
    setInput("");
    setFeedback("correct");

    if (next >= REQUIRED_CORRECT_REPEATS) {
      setStats((current) => ({ ...current, mastered: current.mastered + 1 }));
      setReviewQueue((queue) => queue.filter((item) => item !== word));
      setMode("complete");
      setMessage("You fixed this word. It will return later for review.");
      speak("Excellent. You learned the word.");
      return;
    }

    setMessage(`Correct. Type it ${REQUIRED_CORRECT_REPEATS - next} more time.`);
    speak("Correct. One more time.");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const revealForFiveSeconds = () => {
    setShowWord(true);
    window.setTimeout(() => setShowWord(false), 5000);
  };

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <h1 style={{ fontSize: 32, margin: "4px 0 8px" }}>Active Spelling Retrieval</h1>
          <p style={{ margin: 0, color: "#5c6b82", fontSize: 17 }}>Short, calm practice with repeat review</p>
        </header>

        <section style={{ ...styles.card, marginBottom: 14 }}>
          <div style={{ ...styles.row, justifyContent: "space-between" }}>
            <div style={styles.row}>
              <span style={styles.pill}>Attempts: {stats.attempted}</span>
              <span style={styles.pill}>First-try: {accuracy}%</span>
              <span style={styles.pill}>Learned: {stats.mastered}</span>
              <span style={styles.pill}>Review: {reviewQueue.length}</span>
            </div>
            <label style={{ fontWeight: 700 }}>
              Level:{" "}
              <select
                value={level}
                onChange={(event) => setLevel(Number(event.target.value) as Level)}
                style={{ padding: "8px 10px", borderRadius: 9, fontSize: 15 }}
              >
                <option value={1}>1 · Core words</option>
                <option value={2}>2 · Patterns</option>
                <option value={3}>3 · Longer words</option>
              </select>
            </label>
          </div>
        </section>

        <section style={styles.card} aria-live="polite">
          {loading ? (
            <div style={{ textAlign: "center", padding: 36 }}>
              <div style={{ fontSize: 42 }}>🔄</div>
              <h2>Loading a practice word…</h2>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <h2>Connection problem</h2>
              <p style={{ color: "#9d2636", lineHeight: 1.5 }}>{error}</p>
              <button style={styles.primaryButton} onClick={() => void loadWord()}>Try again</button>
            </div>
          ) : mode === "practice" ? (
            <form onSubmit={submitPractice}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 4 }}>🎧</div>
                <h2 style={{ margin: "4px 0 6px" }}>Listen and spell</h2>
                <p style={{ color: "#5c6b82", minHeight: 24 }}>{message}</p>

                <div style={styles.row}>
                  <button type="button" style={styles.button} onClick={() => speak(word)}>🔊 Say word</button>
                  <button type="button" style={styles.button} onClick={() => speak(info?.example || `The word is ${word}`)}>💬 Use in sentence</button>
                  <button type="button" style={styles.button} onClick={revealForFiveSeconds}>👀 Quick look</button>
                </div>

                {showWord && <div style={{ fontSize: 42, fontWeight: 900, marginTop: 18, letterSpacing: 2 }}>{word}</div>}

                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => { setInput(event.target.value); setFeedback("idle"); }}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label="Type the spelling word"
                  placeholder="Type the word"
                  style={{
                    ...styles.input,
                    borderColor: feedback === "correct" ? "#2c8a4b" : feedback === "incorrect" ? "#c34858" : "#9fb4d1",
                  }}
                />
                <button type="submit" style={styles.primaryButton}>Check spelling</button>
              </div>
            </form>
          ) : mode === "learn" ? (
            <form onSubmit={submitLearning}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>🧩</div>
                <h2>Learn it in small steps</h2>
                <div style={{ fontSize: 45, fontWeight: 900, letterSpacing: 2, margin: "10px 0" }}>{word}</div>

                {!info ? (
                  <p>Preparing a spelling hint…</p>
                ) : (
                  <div style={{ textAlign: "left", background: "#f5f8fc", borderRadius: 16, padding: 17, lineHeight: 1.6 }}>
                    <p><strong>Chunks:</strong> {info.syllables.join(" • ")}</p>
                    <p><strong>Pattern:</strong> {info.pattern || "practice word"}</p>
                    <p><strong>Memory tip:</strong> {info.tip}</p>
                    <p><strong>Sentence:</strong> {info.example}</p>
                  </div>
                )}

                <div style={{ ...styles.row, marginTop: 16 }}>
                  <button type="button" style={styles.button} onClick={() => speak(word)}>🔊 Say</button>
                  <button type="button" style={styles.button} onClick={spellAloud}>🔤 Spell aloud</button>
                  <button type="button" style={styles.button} onClick={() => speak(info?.example || word)}>💬 Sentence</button>
                </div>

                <p style={{ fontWeight: 700, marginTop: 20 }}>Type it correctly {REQUIRED_CORRECT_REPEATS} times.</p>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label="Retype the learned word"
                  placeholder="Copy the word carefully"
                  style={styles.input}
                />
                <button type="submit" style={styles.primaryButton}>Check</button>
                <p style={{ fontSize: 17, fontWeight: 800 }}>Progress: {repeatCount}/{REQUIRED_CORRECT_REPEATS}</p>
                <p style={{ color: "#5c6b82" }}>{message}</p>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 60 }}>⭐</div>
              <h2>Word learned</h2>
              <p style={{ color: "#5c6b82", fontSize: 18 }}>{message}</p>
              <button style={styles.primaryButton} onClick={() => void loadWord()}>Next word</button>
              {reviewQueue.length > 0 && (
                <button style={{ ...styles.button, marginLeft: 10 }} onClick={() => void loadWord(true)}>Review a missed word</button>
              )}
            </div>
          )}
        </section>

        <p style={{ textAlign: "center", color: "#68758a", fontSize: 14, marginTop: 16 }}>
          Recommended session: 8–12 words, then stop while confidence is still high.
        </p>
      </div>
    </main>
  );
}
