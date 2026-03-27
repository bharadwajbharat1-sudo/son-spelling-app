"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

const DISPLAY_MS = 5000

export function ActiveSpellingRetrieval() {
  const didInitialLoadRef = useRef(false)
  const [sentence, setSentence] = useState("")
  const [loadingSentence, setLoadingSentence] = useState(true)
  const [phase, setPhase] = useState<"idle" | "showing" | "typing" | "done">("idle")
  const [mode, setMode] = useState<"word" | "sentence" | "paragraph">("word")
  const [level, setLevel] = useState(1)
  const [showHint, setShowHint] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [inputBlueFlash, setInputBlueFlash] = useState(false)
  const [typed, setTyped] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wrongLetter, setWrongLetter] = useState("")
  const [wrongIndex, setWrongIndex] = useState<number | null>(null)
  const [correctionsCount, setCorrectionsCount] = useState(0)
  const [typingStartedAt, setTypingStartedAt] = useState<number | null>(null)
  const [timeTakenSec, setTimeTakenSec] = useState<number | null>(null)
  const [submitFeedback, setSubmitFeedback] = useState("")
  const [perfectStreak, setPerfectStreak] = useState(0)
  const [levelUpMessage, setLevelUpMessage] = useState("")
  const progressValue = sentence.length > 0 ? (typed.length / sentence.length) * 100 : 0
  const levelBadgeClass =
    level <= 3
      ? "bg-emerald-100 text-emerald-800"
      : level <= 7
        ? "bg-orange-100 text-orange-800"
        : "bg-red-100 text-red-800"

  const buildLocalFallbackSentence = (): string => {
    const options = [
      "In FC26, your quick passing builds the perfect winning move.",
      "Science fact: a house stays strong when every brick is aligned.",
      "While building a house, careful plans help every wall stand tall.",
      "FC26 players use science to improve speed, focus, and balance.",
    ]
    return options[Math.floor(Math.random() * options.length)]
  }

  const speakText = (text: string) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }

  const fetchSentenceFromBackend = useCallback(
    async (
      previousSentence: string | undefined,
      nextMode: "sentence" | "paragraph",
      nextLevel: number,
    ): Promise<string> => {
    const extractSentence = (data: unknown): string => {
      if (typeof data !== "object" || data === null) return ""
      const obj = data as {
        sentence?: unknown
        text?: unknown
        sentences?: unknown
      }
      if (typeof obj.sentence === "string") return obj.sentence
      if (typeof obj.text === "string") return obj.text
      if (Array.isArray(obj.sentences) && typeof obj.sentences[0] === "string") {
        return obj.sentences[0]
      }
      return ""
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      // Replace the existing fetch line with this one:
let response = await fetch(
  `http://localhost:8000/generate?mode=${nextMode}&level=${nextLevel}&t=${Date.now()}`,
  { cache: "no-store" }
)
      // Backward-compatible fallback for older backend shape.
      if (response.status === 404) {
        response = await fetch("http://localhost:8000/sentences/today", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interests: ["FC26", "Science"] }),
          cache: "no-store",
        })
      }
      if (!response.ok) throw new Error("Failed to fetch sentence")

      const data = await response.json()
      const fetchedSentence = extractSentence(data)
      const candidate = fetchedSentence || "No sentence returned from backend."
      if (!previousSentence || candidate !== previousSentence || attempt === 3) {
        return candidate
      }
    }
    return "No sentence returned from backend."
    },
    [],
  )

  const speakSentence = () => speakText(sentence)

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  useEffect(() => {
    if (phase !== "showing") return

    const timer = window.setTimeout(() => {
      setPhase("typing")
      setInputBlueFlash(true)
      window.setTimeout(() => setInputBlueFlash(false), 700)
    }, DISPLAY_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [phase])

  const startRound = () => {
    if (!sentence || loadingSentence || sentence.startsWith("Unable to load")) {
      void fetchNewSentence()
      return
    }

    setTyped("")
    setCurrentIndex(0)
    setWrongLetter("")
    setWrongIndex(null)
    setCorrectionsCount(0)
    setTimeTakenSec(null)
    setSubmitFeedback("")
    setTypingStartedAt(null)
    setHintUsed(false)
    setShowHint(false)
    setPhase("showing")
    speakSentence()
  }

  async function fetchNewSentence(
    nextMode: "sentence" | "paragraph" = mode,
    nextLevel: number = level,
  ) {
    const previousSentence = sentence
    setSentence("Loading next challenge...")
    setLoadingSentence(true)
    setTyped("")
    setCurrentIndex(0)
    setWrongLetter("")
    setWrongIndex(null)
    setCorrectionsCount(0)
    setTimeTakenSec(null)
    setSubmitFeedback("")
    setTypingStartedAt(null)
    setHintUsed(false)
    setShowHint(false)
    setPhase("idle")

    try {
      const nextSentence = await fetchSentenceFromBackend(previousSentence, nextMode, nextLevel)
      setSentence(nextSentence)
      setPhase("showing")
      speakText(nextSentence)
    } catch {
      const fallbackSentence = buildLocalFallbackSentence()
      setSentence(fallbackSentence)
      setPhase("showing")
      speakText(fallbackSentence)
    }
    setLoadingSentence(false)
  }

  useEffect(() => {
    const loadSentence = async () => {
      if (!didInitialLoadRef.current) {
        didInitialLoadRef.current = true
      } else {
        setSentence("Loading next challenge...")
        setTyped("")
        setCurrentIndex(0)
        setWrongLetter("")
        setWrongIndex(null)
        setCorrectionsCount(0)
        setTimeTakenSec(null)
        setSubmitFeedback("")
        setTypingStartedAt(null)
        setHintUsed(false)
        setShowHint(false)
        setPhase("idle")
      }

      setLoadingSentence(true)
      try {
        const nextSentence = await fetchSentenceFromBackend(undefined, mode, level)
        setSentence(nextSentence)
        setPhase("showing")
        speakText(nextSentence)
      } catch {
        const fallbackSentence = buildLocalFallbackSentence()
        setSentence(fallbackSentence)
        setPhase("showing")
        speakText(fallbackSentence)
      } finally {
        setLoadingSentence(false)
      }
    }

    void loadSentence()
  }, [level, mode, fetchSentenceFromBackend])

  const showQuickHint = () => {
    if (phase !== "typing") return
    setHintUsed(true)
    setShowHint(true)
    window.setTimeout(() => setShowHint(false), 500)
  }

  const logMistake = async (letter: string, index: number) => {
    try {
      await fetch("http://localhost:8000/log-mistake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter,
          index,
          expected: sentence[index] ?? "",
          typedSoFar: typed,
        }),
      })
    } catch {
      // Ignore logging failures to keep typing flow responsive.
    }
  }

  const onType = (value: string) => {
    if (phase !== "typing") return

    if (value.length > 0 && typingStartedAt === null) {
      setTypingStartedAt(Date.now())
    }

    if (value.length > sentence.length) return
    if (sentence.startsWith(value)) {
      setTyped(value)
      setCurrentIndex(value.length)
      setWrongLetter("")
      setWrongIndex(null)
      return
    }

    let mismatchIndex = 0
    while (mismatchIndex < value.length && value[mismatchIndex] === sentence[mismatchIndex]) {
      mismatchIndex += 1
    }

    setWrongIndex(mismatchIndex)
    const wrong = value[mismatchIndex] ?? ""
    setWrongLetter(wrong)
    setCorrectionsCount((previous) => previous + 1)
    setSubmitFeedback("")
    void logMistake(wrong, mismatchIndex)
  }

  const submitSentence = () => {
    if (phase !== "typing") return

    if (typed !== sentence) {
      setSubmitFeedback("Almost there - finish the full sentence, then press Enter.")
      return
    }

    const endedAt = Date.now()
    if (typingStartedAt) {
      setTimeTakenSec(Number(((endedAt - typingStartedAt) / 1000).toFixed(1)))
    } else {
      setTimeTakenSec(0)
    }
    setSubmitFeedback("")

    if (correctionsCount === 0) {
      const nextStreak = perfectStreak + 1
      if (nextStreak >= 3) {
        setPerfectStreak(0)
        setLevel((previous) => Math.min(10, previous + 1))
        setLevelUpMessage("Level Up! You're getting stronger!")
        window.setTimeout(() => setLevelUpMessage(""), 2200)
      } else {
        setPerfectStreak(nextStreak)
      }
    } else {
      setPerfectStreak(0)
    }

    setPhase("done")
  }

  return (
    <main className="mx-auto mt-8 w-full max-w-3xl px-4">
      <Card className="border-0 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-extrabold">Active Spelling Retrieval</CardTitle>
          <CardDescription className="text-base">
            Hit Start, study for 5 seconds, then type from memory.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2">
  <Button
    type="button"
    variant={mode === "word" ? "default" : "outline"}
    onClick={() => setMode("word")}
    size="sm"
  >
    Words
  </Button>
  <Button
    type="button"
    variant={mode === "sentence" ? "default" : "outline"}
    onClick={() => setMode("sentence")}
    size="sm"
  >
    Sentence
  </Button>
  <Button
    type="button"
    variant={mode === "paragraph" ? "default" : "outline"}
    onClick={() => setMode("paragraph")}
    size="sm"
  >
    Paragraph
  </Button>
</div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLevel((previous) => Math.max(1, previous - 1))}
            >
              Step Down (-)
            </Button>
            <div className="text-lg font-bold">Level: {level}</div>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${levelBadgeClass}`}>
              {level <= 3 ? "Easy" : level <= 7 ? "Medium" : "Hard"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLevel((previous) => Math.min(10, previous + 1))}
            >
              Step Up (+)
            </Button>
          </div>
          <Progress className="h-3" value={progressValue} />
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          {levelUpMessage && (
            <div className="rounded-lg border border-sky-300 bg-sky-100 px-4 py-2 text-center text-sm font-bold text-sky-900">
              {levelUpMessage}
            </div>
          )}
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm font-medium">
            Hint Used: <span className={hintUsed ? "text-orange-600" : "text-emerald-600"}>{hintUsed ? "Yes" : "No"}</span>
          </div>

          <Button
            type="button"
            onClick={startRound}
            disabled={loadingSentence || phase === "showing"}
            size="lg"
            className="px-6 text-base font-bold"
          >
            Start
          </Button>

          {loadingSentence && <p className="text-sm text-muted-foreground">Loading sentence...</p>}

          {phase === "showing" && (
            <div className="relative rounded-xl bg-primary/10 px-4 py-5">
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                onClick={speakSentence}
                className="absolute right-3 top-3"
                aria-label="Speak sentence"
              >
                <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
                  <path
                    d="M14 7.5a5 5 0 0 1 0 9m2.5-11.5a8 8 0 0 1 0 14M4 14h4l5 4V6L8 10H4v4Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
              <p className="text-center text-3xl font-extrabold tracking-wide">{sentence}</p>
            </div>
          )}

          {(phase === "typing" || showHint) && showHint && (
            <p className="rounded-xl bg-amber-100 px-4 py-3 text-center text-xl font-bold text-amber-900">
              Hint: {sentence}
            </p>
          )}

          {(phase === "typing" || phase === "done") && (
            <div className="space-y-3">
              <label htmlFor="retrieval-input" className="block text-center text-lg font-semibold">
                Type from memory
              </label>
              <p className="text-center text-sm text-muted-foreground">
                Progress: {currentIndex}/{sentence.length}
              </p>
              <Input
                id="retrieval-input"
                type="text"
                value={typed}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    submitSentence()
                  }
                }}
                disabled={phase !== "typing"}
                className={`mx-auto h-16 max-w-2xl text-center text-2xl font-semibold ${
                  inputBlueFlash ? "bg-sky-100" : ""
                }`}
              />

              {phase === "typing" && (
                <div className="flex justify-center">
                  <Button type="button" variant="secondary" onClick={showQuickHint} className="text-sm font-bold">
                    Show Hint
                  </Button>
                </div>
              )}

              {wrongLetter && wrongIndex !== null && (
                <p className="text-center text-base font-medium text-red-600">
                  Oops! Check that last letter. You got this!{" "}
                  <span className="font-extrabold">{wrongLetter}</span>
                </p>
              )}

              {submitFeedback && (
                <p className="text-center text-sm font-medium text-amber-700">{submitFeedback}</p>
              )}
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-lg font-bold text-emerald-600">Success! You typed it perfectly. ✅</p>
              <p className="text-sm font-medium text-emerald-800">
                Corrections: {correctionsCount} | Time: {timeTakenSec ?? 0}s
              </p>
              <div className="flex justify-center">
                <Button type="button" onClick={fetchNewSentence} className="font-bold">
                  Next Sentence
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
