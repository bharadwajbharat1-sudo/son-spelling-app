"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'setup' | 'loading' | 'study' | 'typing' | 'result' | 'builder';
type WordResult = {
  target: string;
  typed: string;
  correct: boolean;
  letterDiff: { char: string; status: 'correct' | 'wrong' | 'missing' | 'extra' }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────
const API = 'https://son-spelling-backend.onrender.com';
const DRILL_THRESHOLD = 3;
const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

const TOPICS = ["Soccer", "Basketball", "Sneakers", "Technology", "Space", "Science", "Geography", "History", "Video Games", "Animals", "Food"];

const MICKEY_WIN = [
  "YO ADRIAN — YOU DID IT!", "PERFECT. Clean. Sharp. Like a machine.", "That's a champion right there.",
  "BEAUTIFUL! Mickey is proud of ya!", "Flawless! The gym is yours tonight, champ.",
  "Now THAT'S how you fight! Perfect round!"
];
const MICKEY_LOSE = [
  "Pay attention to the blueprints, kid. You missed some words.",
  "That was sloppy. A champion doesn't let letters beat him.",
  "You got heart but those fingers ain't listening. Again!",
  "Get up! You can do better than that. Fight back!",
  "Focus, Rock. Hands follow brain. Brain follow letters."
];
const MICKEY_STUDY = [
  "Read it. Say it out loud. Burn it into your brain.",
  "Every letter matters. Study it like a blueprint.",
  "Champions know their material. Learn this sentence cold.",
  "Look at every word. Then fight from memory.",
];
const MICKEY_BUILDER = [
  "This word's been beating you up. Time to end that.",
  "I've watched this word knock you down. No more.",
  "We don't run from hard words. We drill 'em til they're easy.",
];

// ─── Voice Engine ─────────────────────────────────────────────────────────────
// Browser TTS is unreliable for "Rocky voice". Strategy:
// 1. Pick the deepest male English voice available
// 2. Apply extreme pitch/rate settings
// 3. Prepend "Ey," to short phrases to trigger Philly cadence
let _voicesLoaded = false;
function getMickeyVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Priority order: known deep voices first
  const priority = ['Google UK English Male', 'Microsoft David', 'David', 'Alex', 'Daniel'];
  for (const name of priority) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  // Fallback: any male-labeled English voice
  return voices.find(v => v.lang.startsWith('en') && /male/i.test(v.name)) || null;
}

function mickeySpeak(text: string, opts: { rate?: number; pitch?: number } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate ?? 0.72;
  u.pitch = opts.pitch ?? 0.05; // As low as possible = gravelly
  u.volume = 1;
  const v = getMickeyVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

function speakLetterByLetter(word: string) {
  // Spell it out: "b... e... c... a... u... s... e"
  const spelled = word.split('').join('... ');
  mickeySpeak(`${word}. ${spelled}. ${word}.`, { rate: 0.5, pitch: 0.05 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanWords(s: string): string[] {
  return s.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/).filter(Boolean);
}

function diffWord(target: string, typed: string): WordResult['letterDiff'] {
  const diff: WordResult['letterDiff'] = [];
  const maxLen = Math.max(target.length, typed.length);
  for (let i = 0; i < maxLen; i++) {
    const t = target[i] ?? '';
    const u = typed[i] ?? '';
    if (!t) diff.push({ char: u, status: 'extra' });
    else if (!u) diff.push({ char: t, status: 'missing' });
    else if (t === u) diff.push({ char: u, status: 'correct' });
    else diff.push({ char: u, status: 'wrong' });
  }
  return diff;
}

function syllabify(word: string): string[] {
  // Simple rule-based syllabification
  const w = word.toLowerCase();
  const vowels = 'aeiouy';
  const parts: string[] = [];
  let cur = '';
  for (let i = 0; i < w.length; i++) {
    cur += w[i];
    const isVowel = vowels.includes(w[i]);
    const nextIsConsonant = i + 1 < w.length && !vowels.includes(w[i + 1]);
    const nextNextIsVowel = i + 2 < w.length && vowels.includes(w[i + 2]);
    if (isVowel && nextIsConsonant && nextNextIsVowel && cur.length > 1) {
      parts.push(cur); cur = '';
    } else if (isVowel && i === w.length - 1) {
      parts.push(cur); cur = '';
    }
  }
  if (cur) {
    if (parts.length) parts[parts.length - 1] += cur;
    else parts.push(cur);
  }
  return parts.length > 1 ? parts : [word];
}

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadPersist() {
  try {
    return JSON.parse(localStorage.getItem('rsc3') || '{}');
  } catch { return {}; }
}
function savePersist(data: object) {
  try { localStorage.setItem('rsc3', JSON.stringify(data)); } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ActiveSpellingRetrieval() {
  // Persist
  const persist = useRef(loadPersist());
  const [xp, setXp] = useState<number>(persist.current.xp ?? 0);
  const [level, setLevel] = useState<number>(persist.current.level ?? 1);
  const [streak, setStreak] = useState<number>(persist.current.streak ?? 0);
  const [mistakeBank, setMistakeBank] = useState<Record<string, number>>(persist.current.mb ?? {});
  const [graduated, setGraduated] = useState<Record<string, boolean>>(persist.current.grad ?? {});

  // Session
  const [phase, setPhase] = useState<Phase>('setup');
  const [topic, setTopic] = useState('Soccer');
  const [activeTopic, setActiveTopic] = useState('');
  const [round, setRound] = useState(0);
  const [targetText, setTargetText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState<WordResult[]>([]);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [bestWpm, setBestWpm] = useState<number>(persist.current.bestWpm ?? 0);
  const [showPeek, setShowPeek] = useState(false);
  const [mickyQuote, setMickeyQuote] = useState('');
  const [punchAnim, setPunchAnim] = useState(false);

  // Word Builder
  const [wbQueue, setWbQueue] = useState<string[]>([]);
  const [wbIdx, setWbIdx] = useState(0);
  const [wbWord, setWbWord] = useState('');
  const [wbTrials, setWbTrials] = useState<boolean[]>([]);
  const [wbInput, setWbInput] = useState('');
  const [wbInputState, setWbInputState] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [wbTrialCount, setWbTrialCount] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wbInputRef = useRef<HTMLInputElement>(null);

  // Load voices async (Chrome requires a gesture first)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.getVoices(); // prime
    window.speechSynthesis.onvoiceschanged = () => { _voicesLoaded = true; };
  }, []);

  // Streak check
  useEffect(() => {
    const p = persist.current;
    const today = new Date().toDateString();
    if (p.lastDate !== today) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const newStreak = p.lastDate === yesterday.toDateString() ? (p.streak ?? 0) + 1 : 1;
      setStreak(newStreak);
    }
  }, []);

  // Persist on changes
  useEffect(() => {
    const data = {
      xp, level, streak, mb: mistakeBank, grad: graduated,
      bestWpm, lastDate: new Date().toDateString()
    };
    savePersist(data);
  }, [xp, level, streak, mistakeBank, graduated, bestWpm]);

  const getDrillWords = useCallback(() => {
    return Object.entries(mistakeBank)
      .filter(([w, c]) => c >= DRILL_THRESHOLD && !graduated[w])
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w);
  }, [mistakeBank, graduated]);

  const addXP = useCallback((n: number) => {
    setXp(prev => {
      const next = prev + n;
      const ceil = LEVELS[level] ?? level * 600;
      if (next >= ceil && level < 10) {
        setLevel(l => l + 1);
        setTimeout(() => mickeySpeak(`LEVEL ${level + 1}! You're movin up, champ!`), 300);
      }
      return next;
    });
    setPunchAnim(true);
    setTimeout(() => setPunchAnim(false), 600);
  }, [level]);

  // ── Fetch round ─────────────────────────────────────────────────────────────
  async function fetchRound(newTopic?: string) {
    const t = newTopic ?? activeTopic;
    setPhase('loading');
    setUserInput('');
    setResults([]);
    setShowPeek(false);
    startTimeRef.current = null;

    const focusWords = getDrillWords().slice(0, 4);
    const focusParam = focusWords.length ? `&focus_words=${encodeURIComponent(focusWords.join(','))}` : '';

    try {
      const res = await fetch(`${API}/generate?mode=sentence&level=1&topic=${encodeURIComponent(t)}${focusParam}`);
      const data = await res.json();
      if (data.text) {
        setTargetText(data.text.trim());
        const q = rand(MICKEY_STUDY);
        setMickeyQuote(q);
        setPhase('study');
        setTimeout(() => mickeySpeak(data.text.trim()), 800);
      }
    } catch {
      setMickeyQuote("Mick, the signal's gone! Check your internet.");
      setPhase('study');
    }
  }

  function startSession() {
    setActiveTopic(topic);
    setRound(r => r + 1);
    fetchRound(topic);
  }

  function goTyping() {
    setPhase('typing');
    startTimeRef.current = Date.now();
    mickeySpeak("Go get 'em!", { rate: 0.85, pitch: 0.1 });
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  // ── Live diff while typing ───────────────────────────────────────────────────
  function getLiveDiff(): { word: string; status: 'correct' | 'wrong' | 'pending' | 'current' }[] {
    const tw = cleanWords(targetText);
    const uw = cleanWords(userInput);
    // also include partial current word
    const rawWords = userInput.toLowerCase().split(/\s+/);
    return tw.map((w, i) => {
      if (i >= rawWords.length) return { word: w, status: 'pending' };
      const typed = rawWords[i] ?? '';
      // If this is the last "current" word being typed (no space after)
      const isCurrentWord = i === rawWords.length - 1 && !userInput.endsWith(' ');
      if (isCurrentWord) return { word: w, status: 'current' };
      if (typed === w) return { word: w, status: 'correct' };
      return { word: w, status: 'wrong' };
    });
  }

  // ── Check answer ─────────────────────────────────────────────────────────────
  function checkAnswer() {
    const tw = cleanWords(targetText);
    const uw = cleanWords(userInput);

    // ✅ WPM: characters typed / 5 / minutes elapsed
    const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 60000 : 1;
    const charCount = userInput.trim().length;
    const calcWpm = Math.round((charCount / 5) / elapsed);
    setWpm(calcWpm);
    if (calcWpm > bestWpm) setBestWpm(calcWpm);

    const wordResults: WordResult[] = tw.map((target, i) => {
      const typed = uw[i] ?? '';
      return {
        target,
        typed,
        correct: typed === target,
        letterDiff: diffWord(target, typed),
      };
    });
    setResults(wordResults);

    const mistakes = wordResults.filter(r => !r.correct).map(r => r.target);
    const newBank = { ...mistakeBank };
    mistakes.forEach(w => { newBank[w] = (newBank[w] ?? 0) + 1; });
    if (mistakes.length) setMistakeBank(newBank);

    if (mistakes.length === 0) {
      setWordsCompleted(prev => prev + tw.length);
      addXP(20 + (calcWpm > 30 ? 10 : 0) + (calcWpm > 50 ? 15 : 0));
      const q = rand(MICKEY_WIN);
      setMickeyQuote(q);
      setPhase('result');
      setTimeout(() => mickeySpeak(q), 200);
    } else {
      addXP(5);
      const q = rand(MICKEY_LOSE);
      setMickeyQuote(q);
      setPhase('result');
      setTimeout(() => mickeySpeak(q), 200);
    }
  }

  // ── Word Builder ─────────────────────────────────────────────────────────────
  function launchBuilder(words?: string[]) {
    const queue = words ?? getDrillWords();
    if (!queue.length) return;
    setWbQueue(queue);
    setWbIdx(0);
    startBuilderWord(queue[0]);
  }

  function startBuilderWord(word: string) {
    setWbWord(word);
    setWbTrials([]);
    setWbInput('');
    setWbInputState('idle');
    setWbTrialCount(0);
    setMickeyQuote(rand(MICKEY_BUILDER));
    setPhase('builder');
    setTimeout(() => {
      speakLetterByLetter(word);
      wbInputRef.current?.focus();
    }, 800);
  }

  function submitBuilderTrial() {
    const typed = wbInput.trim().toLowerCase();
    const correct = typed === wbWord;
    setWbInputState(correct ? 'ok' : 'bad');
    const newTrials = [...wbTrials, correct];
    setWbTrials(newTrials);
    setWbTrialCount(c => c + 1);

    if (!correct) {
      mickeySpeak(`No no no — it's ${wbWord}. Again!`, { rate: 0.65 });
    }

    setTimeout(() => {
      setWbInput('');
      setWbInputState('idle');
      // Need 3 correct in a row
      const correctStreak = newTrials.slice(-3).every(Boolean) && newTrials.length >= 3;
      if (correctStreak) {
        // Graduate!
        setGraduated(g => ({ ...g, [wbWord]: true }));
        addXP(35);
        mickeySpeak(`${wbWord}. GRADUATED! You owned that word, champ!`, { rate: 0.7 });
        setTimeout(() => nextBuilderWord(), 2200);
      } else if (newTrials.length >= 6 && !correctStreak) {
        // Too many failures — skip with encouragement
        mickeySpeak(`We'll come back to ${wbWord}. Keep fighting!`, { rate: 0.65 });
        setTimeout(() => nextBuilderWord(), 1800);
      } else {
        if (!correct) speakLetterByLetter(wbWord);
        wbInputRef.current?.focus();
      }
    }, 700);
  }

  function nextBuilderWord() {
    const next = wbIdx + 1;
    if (next < wbQueue.length) {
      setWbIdx(next);
      startBuilderWord(wbQueue[next]);
    } else {
      // Done with all drill words
      setPhase('setup');
    }
  }

  // ── XP / Level display ────────────────────────────────────────────────────────
  const xpBase = LEVELS[level - 1] ?? 0;
  const xpCeil = LEVELS[level] ?? level * 600;
  const xpPct = Math.min(100, ((xp - xpBase) / (xpCeil - xpBase)) * 100);
  const drillWords = getDrillWords();

  // ── Live diff component ──────────────────────────────────────────────────────
  const liveDiff = getLiveDiff();

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0800',
      fontFamily: "'Oswald', 'Impact', sans-serif",
      color: '#fff',
      padding: '16px',
      overflowX: 'hidden',
    }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        body { background: #0f0800; }
        .pulse { animation: pulse 0.6s ease; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        .shake { animation: shake 0.4s ease; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        .flash-green { animation: fg 0.4s ease; }
        @keyframes fg { 0%{background:#1a5c2a} 100%{background:transparent} }
        .flash-red { animation: fr 0.4s ease; }
        @keyframes fr { 0%{background:#5c1a1a} 100%{background:transparent} }
        .letter-bounce { display:inline-block; animation: lb 0.5s ease forwards; }
        @keyframes lb { 0%{transform:translateY(-8px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        .glow-gold { box-shadow: 0 0 20px rgba(255,215,0,0.4); }
        .glow-red { box-shadow: 0 0 20px rgba(192,57,43,0.6); }
        .ring-corner { position:absolute; width:20px; height:20px; border:3px solid rgba(255,215,0,0.3); }
        .scanlines { 
          position:absolute; inset:0; pointer-events:none; z-index:1;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
        }
        textarea { 
          font-family: 'Share Tech Mono', monospace !important;
          letter-spacing: 1px;
        }
        .btn-punch:active { transform: scale(0.94) rotate(-1deg); }
        input[type=text] { 
          font-family: 'Share Tech Mono', monospace !important;
          letter-spacing: 2px;
        }
      `}</style>

      {/* ── TOP HUD ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 700, margin: '0 auto 12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { label: 'WORDS', value: wordsCompleted },
          { label: 'WPM', value: wpm || '—', highlight: wpm > 0 && wpm === bestWpm },
          { label: 'LEVEL', value: level },
          { label: '🔥 STREAK', value: `${streak}d` },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{
            background: '#1a0a00', border: `1px solid ${highlight ? '#ffd700' : '#3d1500'}`,
            borderRadius: 8, padding: '8px 6px', textAlign: 'center',
            boxShadow: highlight ? '0 0 12px rgba(255,215,0,0.3)' : 'none',
          }}>
            <div style={{ fontSize: 9, color: '#c0392b', letterSpacing: 2, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? '#ffd700' : '#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* XP Bar */}
      <div style={{ maxWidth: 700, margin: '0 auto 12px' }}>
        <div style={{ background: '#1a0a00', borderRadius: 6, height: 8, overflow: 'hidden', border: '1px solid #3d1500' }}>
          <div style={{
            width: `${xpPct}%`, height: '100%',
            background: 'linear-gradient(90deg, #8b0000, #c0392b, #ff6b35)',
            transition: 'width 0.6s ease', borderRadius: 6,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 3 }}>
          <span>LEVEL {level}</span>
          <span className={punchAnim ? 'pulse' : ''}>{xp - xpBase} / {xpCeil - xpBase} XP → LV{level + 1}</span>
        </div>
      </div>

      {/* ── MAIN RING ────────────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 700, margin: '0 auto',
        background: '#140800',
        borderRadius: 12,
        border: '2px solid #3d1500',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 500,
      }}>
        <div className="scanlines" />
        {/* Ring corners */}
        {[{ top: 8, left: 8, borderRight: 'none', borderBottom: 'none' },
          { top: 8, right: 8, borderLeft: 'none', borderBottom: 'none' },
          { bottom: 8, left: 8, borderRight: 'none', borderTop: 'none' },
          { bottom: 8, right: 8, borderLeft: 'none', borderTop: 'none' }].map((s, i) => (
          <div key={i} className="ring-corner" style={s as React.CSSProperties} />
        ))}

        {/* Ring header */}
        <div style={{
          background: 'linear-gradient(135deg, #8b0000 0%, #c0392b 50%, #8b0000 100%)',
          padding: '12px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '3px solid #ffd700',
          position: 'relative', zIndex: 2,
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>
            ⚔️ ROCKY TRAINING CAMP
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeTopic && (
              <span style={{ background: 'rgba(0,0,0,0.4)', color: '#ffd700', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {activeTopic.toUpperCase()}
              </span>
            )}
            {phase !== 'setup' && (
              <button onClick={() => setPhase('setup')} style={{
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11,
                cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontWeight: 600,
              }}>⚙ MENU</button>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px', position: 'relative', zIndex: 2 }}>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SETUP SCREEN */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'setup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
              {/* Mickey face */}
              <div style={{ textAlign: 'center', fontSize: 64, lineHeight: 1 }}>🥊</div>
              <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: 4, color: '#ffd700' }}>
                PICK YOUR FIGHT
              </div>

              <select value={topic} onChange={e => setTopic(e.target.value)} style={{
                fontFamily: 'Oswald, sans-serif', fontSize: 18, fontWeight: 700,
                background: '#0d0500', color: '#ffd700',
                border: '2px solid #3d1500', borderRadius: 8,
                padding: '12px 16px', width: '100%', cursor: 'pointer', outline: 'none',
              }}>
                {TOPICS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>

              {/* Drill alert */}
              {drillWords.length > 0 && (
                <div style={{
                  background: '#200800', border: '2px solid #c0392b',
                  borderRadius: 8, padding: 12,
                }}>
                  <div style={{ fontSize: 11, color: '#c0392b', letterSpacing: 2, marginBottom: 8 }}>
                    ⚠ WORDS THAT NEED DRILLING ({drillWords.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {drillWords.map(w => (
                      <span key={w} style={{
                        background: '#3d0d0d', color: '#ff6b6b',
                        borderRadius: 20, padding: '3px 10px',
                        fontFamily: 'Share Tech Mono, monospace', fontSize: 13,
                      }}>
                        {w} ×{mistakeBank[w]}
                      </span>
                    ))}
                  </div>
                  <button className="btn-punch" onClick={() => launchBuilder()} style={{
                    width: '100%', background: '#c0392b', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '10px', fontSize: 15,
                    fontFamily: 'Oswald, sans-serif', fontWeight: 700, cursor: 'pointer',
                    letterSpacing: 2,
                  }}>
                    DRILL THESE WORDS FIRST 🎯
                  </button>
                </div>
              )}

              <button className="btn-punch glow-red" onClick={startSession} style={{
                background: 'linear-gradient(135deg, #8b0000, #c0392b)',
                color: '#ffd700', border: '2px solid #ffd700',
                borderRadius: 8, padding: '18px', fontSize: 22,
                fontFamily: 'Oswald, sans-serif', fontWeight: 700, cursor: 'pointer',
                letterSpacing: 3, transition: 'transform 0.1s',
              }}>
                🔔 RING THE BELL
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* LOADING */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'loading' && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🥊</div>
              <div style={{ color: '#888', fontSize: 15, letterSpacing: 2 }}>ROUND {round + 1} LOADING...</div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STUDY PHASE */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'study' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <MickeyBox quote={mickyQuote} />

              {/* Sentence display */}
              <div style={{
                background: '#000',
                border: '3px solid #3d1500',
                borderRadius: 8,
                padding: 20,
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 22,
                color: '#fff',
                textAlign: 'center',
                lineHeight: 1.6,
                letterSpacing: 1,
                textShadow: '0 0 10px rgba(255,107,53,0.3)',
              }}>
                {targetText}
              </div>

              <div style={{ fontSize: 12, color: '#555', textAlign: 'center', letterSpacing: 1 }}>
                READ IT ALOUD. MEMORIZE IT. THEN YOU FIGHT FROM MEMORY.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-punch" onClick={() => mickeySpeak(targetText)} style={{
                  flex: 1, background: '#1a0a00', color: '#ffd700',
                  border: '1px solid #3d1500', borderRadius: 8, padding: '10px',
                  fontFamily: 'Oswald, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer', letterSpacing: 1,
                }}>🔊 HEAR IT AGAIN</button>
                <button className="btn-punch glow-red" onClick={goTyping} style={{
                  flex: 2, background: '#c0392b', color: '#ffd700',
                  border: '2px solid #ffd700', borderRadius: 8, padding: '12px',
                  fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 16, cursor: 'pointer', letterSpacing: 2,
                }}>
                  🥊 I'M READY — HIDE IT
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TYPING PHASE */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'typing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Blurred sentence (peek-able) */}
              <div style={{
                background: '#000', border: '2px solid #1a0800',
                borderRadius: 8, padding: '12px 16px',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 16, color: '#333',
                textAlign: 'center', lineHeight: 1.5,
                filter: showPeek ? 'none' : 'blur(6px)',
                transition: 'filter 0.2s',
                userSelect: showPeek ? 'auto' : 'none',
              }}>
                {targetText}
              </div>

              {/* LIVE word-by-word diff — this is the key feedback */}
              <div style={{
                background: '#0a0500', border: '1px solid #2d1000',
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 46, alignItems: 'center',
              }}>
                {liveDiff.length ? liveDiff.map((w, i) => (
                  <span key={i} style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 16,
                    padding: '2px 6px',
                    borderRadius: 4,
                    letterSpacing: 1,
                    background: w.status === 'correct' ? '#0f3d1a'
                      : w.status === 'wrong' ? '#3d0d0d'
                      : w.status === 'current' ? '#2d1500'
                      : 'transparent',
                    color: w.status === 'correct' ? '#2ecc71'
                      : w.status === 'wrong' ? '#e74c3c'
                      : w.status === 'current' ? '#ffd700'
                      : '#333',
                    border: w.status === 'current' ? '1px solid #ffd700' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                    {w.word}
                  </span>
                )) : (
                  <span style={{ color: '#333', fontSize: 13, fontFamily: 'Share Tech Mono, monospace' }}>
                    words light up as you type...
                  </span>
                )}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-punch"
                  onMouseDown={e => { e.preventDefault(); mickeySpeak(targetText); }}
                  style={{
                    background: '#1a0a00', color: '#aaa', border: '1px solid #2d1000',
                    borderRadius: 6, padding: '7px 12px', fontSize: 12,
                    fontFamily: 'Oswald, sans-serif', cursor: 'pointer', letterSpacing: 1,
                  }}>🔊 REPEAT</button>
                <button className="btn-punch"
                  onMouseDown={e => { e.preventDefault(); setShowPeek(true); }}
                  onMouseUp={() => setShowPeek(false)}
                  onMouseLeave={() => setShowPeek(false)}
                  onTouchStart={e => { e.preventDefault(); setShowPeek(true); }}
                  onTouchEnd={() => setShowPeek(false)}
                  style={{
                    background: '#1a0a00', color: '#aaa', border: '1px solid #2d1000',
                    borderRadius: 6, padding: '7px 12px', fontSize: 12,
                    fontFamily: 'Oswald, sans-serif', cursor: 'pointer', letterSpacing: 1,
                  }}>👁 HOLD TO PEEK</button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) checkAnswer(); }}
                autoFocus spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="none"
                placeholder="type the sentence here..."
                style={{
                  background: '#050200', border: '2px solid #2d1000',
                  borderRadius: 8, padding: '14px', resize: 'none', height: 100,
                  width: '100%', outline: 'none',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 20, color: '#7ecfff',
                  letterSpacing: 1, lineHeight: 1.5,
                  transition: 'border-color 0.2s',
                  caretColor: '#ffd700',
                }}
                onFocus={e => { e.target.style.borderColor = '#c0392b'; }}
                onBlur={e => { e.target.style.borderColor = '#2d1000'; }}
              />

              <button className="btn-punch" onClick={checkAnswer} style={{
                background: 'linear-gradient(135deg, #1a3a7a, #2255cc)',
                color: '#fff', border: '2px solid #4a80ff',
                borderRadius: 8, padding: '14px', fontSize: 18,
                fontFamily: 'Oswald, sans-serif', fontWeight: 700, cursor: 'pointer',
                letterSpacing: 2,
              }}>
                CHECK SCORE 🎯 <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 400 }}>(or Ctrl+Enter)</span>
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* RESULT SCREEN */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'result' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(() => {
                const perfect = results.every(r => r.correct);
                return (
                  <>
                    {/* Header */}
                    <div style={{
                      textAlign: 'center', fontSize: perfect ? 48 : 36,
                      animation: 'pulse 0.6s ease',
                      marginBottom: 4,
                    }}>
                      {perfect ? '🏆' : '😤'}
                    </div>
                    <div style={{
                      textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 3,
                      color: perfect ? '#ffd700' : '#e74c3c',
                    }}>
                      {perfect ? 'PERFECT ROUND!' : 'FIGHT HARDER!'}
                    </div>

                    <MickeyBox quote={mickyQuote} />

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[
                        { label: 'ACCURACY', value: `${Math.round((results.filter(r => r.correct).length / results.length) * 100)}%`, good: perfect },
                        { label: 'WPM', value: wpm || '—', good: wpm > 0 },
                        { label: 'XP EARNED', value: `+${perfect ? 20 + (wpm > 30 ? 10 : 0) + (wpm > 50 ? 15 : 0) : 5}`, good: true },
                      ].map(({ label, value, good }) => (
                        <div key={label} style={{
                          background: '#0d0500', border: `1px solid ${good ? '#3d1500' : '#2d0000'}`,
                          borderRadius: 8, padding: '8px 6px', textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 9, color: '#888', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: good ? '#ffd700' : '#e74c3c' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Word-by-word breakdown — detailed letter diff */}
                    <div style={{
                      background: '#080400', border: '1px solid #2d1000',
                      borderRadius: 8, padding: 12,
                    }}>
                      <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 8 }}>WORD BREAKDOWN</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {results.map((r, i) => (
                          <div key={i} style={{
                            background: r.correct ? '#0a2e14' : '#2e0a0a',
                            border: `1px solid ${r.correct ? '#1a5c2a' : '#5c1a1a'}`,
                            borderRadius: 6, padding: '6px 10px',
                            minWidth: 60,
                          }}>
                            {r.correct ? (
                              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 16, color: '#2ecc71', letterSpacing: 1 }}>
                                {r.target}
                              </div>
                            ) : (
                              <>
                                {/* What he typed — letter by letter with diff colors */}
                                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 16, letterSpacing: 1, marginBottom: 2 }}>
                                  {r.letterDiff.map((l, j) => (
                                    <span key={j} style={{
                                      color: l.status === 'correct' ? '#2ecc71'
                                        : l.status === 'wrong' ? '#e74c3c'
                                        : l.status === 'extra' ? '#ff6b35'
                                        : '#555',
                                      textDecoration: l.status === 'wrong' ? 'underline' : 'none',
                                      fontWeight: l.status !== 'correct' ? 700 : 400,
                                    }}>
                                      {l.status === 'missing' ? '_' : l.char}
                                    </span>
                                  ))}
                                </div>
                                {/* Correct version */}
                                <div style={{
                                  fontFamily: 'Share Tech Mono, monospace', fontSize: 13,
                                  color: '#aaa', borderTop: '1px solid #3d1500', paddingTop: 3,
                                  letterSpacing: 1,
                                }}>
                                  ✓ {r.target}
                                </div>
                                {/* Miss count badge */}
                                {mistakeBank[r.target] >= 2 && (
                                  <div style={{
                                    marginTop: 4, fontSize: 10, color: '#ff6b35',
                                    letterSpacing: 1,
                                  }}>
                                    MISSED {mistakeBank[r.target]}×
                                    {mistakeBank[r.target] >= DRILL_THRESHOLD && (
                                      <span style={{ color: '#ffd700', marginLeft: 6 }}>→ DRILL!</span>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Drill prompt if words need it */}
                    {drillWords.length > 0 && !perfect && (
                      <button className="btn-punch" onClick={() => launchBuilder(drillWords.slice(0, 3))} style={{
                        background: '#3d1500', color: '#ffd700',
                        border: '1px solid #ffd700', borderRadius: 8, padding: '10px',
                        fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        letterSpacing: 2,
                      }}>
                        🎯 DRILL {Math.min(drillWords.length, 3)} WEAK WORD{drillWords.length > 1 ? 'S' : ''} NOW
                      </button>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      {!perfect && (
                        <button className="btn-punch" onClick={() => {
                          setResults([]); setUserInput('');
                          startTimeRef.current = Date.now();
                          setPhase('study');
                          mickeySpeak('Again! You can do this!', { rate: 0.8 });
                        }} style={{
                          flex: 1, background: '#1a0a00', color: '#ffd700',
                          border: '1px solid #3d1500', borderRadius: 8, padding: '12px',
                          fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', letterSpacing: 1,
                        }}>🔁 TRY AGAIN</button>
                      )}
                      <button className="btn-punch glow-red" onClick={() => { setRound(r => r + 1); fetchRound(); }} style={{
                        flex: 2, background: '#c0392b', color: '#ffd700',
                        border: '2px solid #ffd700', borderRadius: 8, padding: '14px',
                        fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 18, cursor: 'pointer', letterSpacing: 2,
                      }}>
                        {perfect ? '🥊 NEXT ROUND!' : '⏭ SKIP ROUND'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* WORD BUILDER */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'builder' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#888', letterSpacing: 2 }}>
                  WORD BUILDER — {wbIdx + 1} of {wbQueue.length}
                </span>
                <button onClick={() => setPhase('setup')} style={{
                  background: 'transparent', border: '1px solid #3d1500', color: '#888',
                  borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                }}>✕ EXIT</button>
              </div>

              <MickeyBox quote={mickyQuote} />

              {/* BIG WORD */}
              <div style={{
                background: '#000', borderRadius: 8, padding: '20px',
                textAlign: 'center', border: '2px solid #ffd700',
              }}>
                <div style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 42, color: '#ffd700', letterSpacing: 6,
                  textShadow: '0 0 20px rgba(255,215,0,0.5)',
                }}>
                  {wbWord.toUpperCase()}
                </div>

                {/* Syllables */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                  {syllabify(wbWord).map((syl, i, arr) => (
                    <React.Fragment key={i}>
                      <span style={{
                        fontFamily: 'Share Tech Mono, monospace',
                        fontSize: 16, padding: '4px 10px',
                        background: i === 0 ? '#3d1500' : '#1a0a00',
                        border: `1px solid ${i === 0 ? '#ffd700' : '#3d1500'}`,
                        color: i === 0 ? '#ffd700' : '#aaa',
                        borderRadius: 4,
                      }}>{syl}</span>
                      {i < arr.length - 1 && <span style={{ color: '#555', alignSelf: 'center', fontSize: 18 }}>·</span>}
                    </React.Fragment>
                  ))}
                </div>

                {/* Letter boxes */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 12, flexWrap: 'wrap' }}>
                  {wbWord.split('').map((l, i) => (
                    <div key={i} className="letter-bounce" style={{
                      width: 34, height: 34, background: '#1a0a00',
                      border: '1px solid #3d1500', borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Share Tech Mono, monospace', fontSize: 18, color: '#ccc',
                      animationDelay: `${i * 0.06}s`,
                    }}>
                      {l.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Trial progress dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#555', letterSpacing: 1, marginRight: 4 }}>3 IN A ROW TO GRADUATE</span>
                {[0, 1, 2].map(i => {
                  const recentCorrect = wbTrials.filter(Boolean);
                  const done = i < Math.min(recentCorrect.length, 3) && wbTrials.slice(-3).filter(Boolean).length > i;
                  const active = !done && i === wbTrials.filter(Boolean).length % 3;
                  return (
                    <div key={i} style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: done ? '#2ecc71' : active ? '#ffd700' : '#1a0a00',
                      border: `2px solid ${done ? '#2ecc71' : active ? '#ffd700' : '#3d1500'}`,
                      transition: 'all 0.3s',
                    }} />
                  );
                })}
              </div>

              {/* Mistake count */}
              {mistakeBank[wbWord] > 0 && (
                <div style={{ textAlign: 'center', fontSize: 12, color: '#e74c3c', letterSpacing: 1 }}>
                  YOU'VE MISSED THIS WORD {mistakeBank[wbWord]}×
                </div>
              )}

              {/* Input */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-punch"
                  onMouseDown={e => { e.preventDefault(); speakLetterByLetter(wbWord); }}
                  style={{
                    background: '#1a0a00', color: '#888', border: '1px solid #3d1500',
                    borderRadius: 6, padding: '10px 12px', fontSize: 12,
                    fontFamily: 'Oswald, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>🔊 LETTERS</button>
                <input
                  ref={wbInputRef}
                  type="text"
                  value={wbInput}
                  onChange={e => setWbInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitBuilderTrial(); }}
                  placeholder="type it..."
                  spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="none"
                  className={wbInputState === 'ok' ? 'flash-green' : wbInputState === 'bad' ? 'shake' : ''}
                  style={{
                    flex: 1, fontFamily: 'Share Tech Mono, monospace', fontSize: 22,
                    background: '#050200', padding: '10px 14px',
                    border: `2px solid ${wbInputState === 'ok' ? '#2ecc71' : wbInputState === 'bad' ? '#e74c3c' : '#3d1500'}`,
                    borderRadius: 8, color: wbInputState === 'ok' ? '#2ecc71' : wbInputState === 'bad' ? '#e74c3c' : '#7ecfff',
                    outline: 'none', letterSpacing: 2, transition: 'border-color 0.2s, color 0.2s',
                    caretColor: '#ffd700',
                  }}
                />
              </div>

              <button className="btn-punch" onClick={submitBuilderTrial} style={{
                background: '#c0392b', color: '#ffd700',
                border: '2px solid #ffd700', borderRadius: 8, padding: '14px',
                fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 17, cursor: 'pointer',
                letterSpacing: 2,
              }}>
                SUBMIT 🎯 <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>(or Enter)</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Mickey Box sub-component ─────────────────────────────────────────────────
function MickeyBox({ quote }: { quote: string }) {
  return (
    <div style={{
      background: '#0a0400',
      borderLeft: '4px solid #c0392b',
      borderRadius: '0 6px 6px 0',
      padding: '10px 14px',
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>🥊</span>
      <div>
        <div style={{ fontSize: 9, color: '#c0392b', letterSpacing: 2, marginBottom: 3 }}>MICKEY</div>
        <div style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 13, color: '#ffd700', lineHeight: 1.5,
        }}>
          {quote || '…'}
        </div>
      </div>
    </div>
  );
}