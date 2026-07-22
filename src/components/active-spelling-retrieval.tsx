// app/page.tsx

"use client";
import React, { useEffect, useState } from "react";

const API = "http://localhost:8000";

type Mode = "word" | "train";

export default function SpellingApp() {
  const [mode, setMode] = useState<Mode>("word");
  const [word, setWord] = useState("");
  const [input, setInput] = useState("");
  const [repeat, setRepeat] = useState(0);
  const [info, setInfo] = useState<any>(null);
  const [mistakes, setMistakes] = useState<string[]>([]);

  // 🔊 Speak
  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.7;
    speechSynthesis.speak(u);
  };

  const spell = (w: string) => {
    speak(`${w}. ${w.split("").join(", ")}`);
  };

  // 🎯 Fetch word
  const fetchWord = async () => {
    const res = await fetch(`${API}/generate?mode=word`);
    const data = await res.json();
    setWord(data.text.trim());
    speak(data.text);
  };

  // 📚 Word info
  const fetchInfo = async (w: string) => {
    const res = await fetch(`${API}/word-info?word=${w}`);
    const data = await res.json();
    setInfo(data);
  };

  useEffect(() => {
    fetchWord();
  }, []);

  // ✅ Submit word
  const submit = () => {
    if (input.toLowerCase() === word.toLowerCase()) {
      setInput("");
      setRepeat(0);
      fetchWord();
    } else {
      setMistakes(prev => [...new Set([...prev, word])]);
      fetchInfo(word);
      setMode("train");
      setRepeat(0);
    }
  };

  // 🔁 Training submit
  const trainSubmit = () => {
    if (input.toLowerCase() === word.toLowerCase()) {
      const next = repeat + 1;
      setRepeat(next);
      setInput("");

      if (next >= 2) {
        setMode("word");
        fetchWord();
      }
    } else {
      speak("Try again");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>🧠 Spelling Trainer</h1>

      {mode === "word" && (
        <>
          <h2>Spell this word:</h2>
          <h1 style={{ fontSize: 50 }}>{word}</h1>

          <button onClick={() => speak(word)}>🔊 Say</button>
          <button onClick={() => spell(word)}>🔊 Spell</button>

          <br /><br />

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ fontSize: 24 }}
          />

          <button onClick={submit}>Submit</button>
        </>
      )}

      {mode === "train" && info && (
        <>
          <h2>💪 Learn this word</h2>

          <h1>{word}</h1>

          <p><b>Syllables:</b> {info.syllables.join(" • ")}</p>
          <p><b>Tip:</b> {info.tip}</p>
          <p><b>Example:</b> {info.example}</p>

          <button onClick={() => speak(word)}>🔊 Say</button>
          <button onClick={() => spell(word)}>🔊 Spell</button>

          <p>Type it correctly 2 times:</p>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ fontSize: 24 }}
          />

          <button onClick={trainSubmit}>Submit</button>

          <p>Progress: {repeat}/2</p>
        </>
      )}
    </div>
  );
}