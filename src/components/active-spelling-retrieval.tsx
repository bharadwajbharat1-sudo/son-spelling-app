"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function ActiveSpellingRetrieval() {
  // --- CORE STATE ---
  const [mode, setMode] = useState('sentence');
  const [level, setLevel] = useState(1);
  const [selectedTopic, setSelectedTopic] = useState('Soccer');
  const [activeTopic, setActiveTopic] = useState('');
  const [targetText, setTargetText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState('setup'); 
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{word: string, target: string, status: 'correct' | 'error' | 'missing'}[]>([]);
  const [correctionInput, setCorrectionInput] = useState("");

  // --- METRICS ---
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [wpm, setWpm] = useState(0);
  const startTime = useRef<number | null>(null);
  const lastMilestone = useRef(0);

  const categories = ["Soccer", "Basketball", "Sneakers", "Technology", "Space", "Science", "Geography", "History", "Video Games"];

  const rockySpeak = (text: string, slow: boolean = false) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.5; 
      utterance.rate = slow ? 0.4 : 0.7; 
      window.speechSynthesis.speak(utterance);
    }
  };

  const playBell = () => {
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  // --- MILESTONE LOGIC ---
  useEffect(() => {
    const milestones = [25, 50, 75, 100];
    const reached = milestones.find(m => wordsCompleted >= m && lastMilestone.current < m);
    if (reached) {
      lastMilestone.current = reached;
      playBell();
      if (reached === 100) rockySpeak("You did it, kid! 100 words! You're the champion of the world!");
      else rockySpeak(`That's ${reached} words! You're flyin' now! Don't stop!`);
    }
  }, [wordsCompleted]);

  const fetchContent = async (isNewSession: boolean = false) => {
    setLoading(true);
    startTime.current = null;
    setWpm(0);
    setUserInput('');
    const currentTopic = isNewSession ? selectedTopic : activeTopic;
    if (isNewSession) setActiveTopic(currentTopic);
    
    try {
      const res = await fetch(`https://son-spelling-backend.onrender.com/generate?mode=${mode}&level=${level}&topic=${encodeURIComponent(currentTopic)}`);
      const data = await res.json();
      setTargetText(data.text);
      setPhase('study');
      setLoading(false);
    } catch (err) {
      setLoading(false);
      alert("System Overload, Mick!");
    }
  };

  const checkWork = () => {
    const clean = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/);
    const targetWords = clean(targetText);
    const userWords = clean(userInput);
    const results: typeof feedback = [];
    let hasErrors = false;

    targetWords.forEach((targetW, i) => {
      const userW = userWords[i] || "";
      if (userW === targetW) {
        results.push({ word: userW, target: targetW, status: 'correct' });
      } else {
        results.push({ word: userW, target: targetW, status: userW ? 'error' : 'missing' });
        hasErrors = true;
      }
    });

    setFeedback(results);
    
    if (!hasErrors) {
      setWordsCompleted(prev => prev + targetWords.length);
      setPhase('feedback');
      rockySpeak("Great round! Keep it moving!");
    } else {
      setPhase('debrief');
      setCorrectionInput("");
      rockySpeak("Mistakes are just lessons, kid. Let's fix 'em.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 p-6 font-sans text-slate-900 uppercase overflow-x-hidden">
      
      {/* DASHBOARD */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-indigo-500 text-center">
          <p className="text-[10px] font-black text-slate-400 mb-1">Training Progress</p>
          <div className="text-5xl font-black text-indigo-600">{wordsCompleted} <span className="text-xl">/ 100 WORDS</span></div>
          <div className="w-full bg-slate-100 h-4 rounded-full mt-4 overflow-hidden border-2 border-slate-50">
            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.min(wordsCompleted, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-orange-500 text-center flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 mb-1">Speedometer</p>
          <div className="text-5xl font-black text-orange-600">{wpm} <span className="text-xl">WPM</span></div>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={() => { setWordsCompleted(0); lastMilestone.current = 0; setPhase('setup'); }} className="flex-1 bg-rose-600 text-white rounded-2xl font-black text-sm shadow-lg">Reset Day ↺</button>
          <button onClick={() => setPhase('setup')} className="flex-1 bg-slate-800 text-white rounded-2xl font-black text-sm shadow-lg">Change Training 🛠</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-[40px] flex flex-col min-h-[650px] border-4 border-white overflow-hidden relative">
        <div className="bg-rose-700 p-4 text-white text-center font-black italic text-2xl tracking-tighter">ROCKY SPELLING CAMP: {activeTopic || "AWAITING MISSION"}</div>

        <div className="p-10 flex-grow flex flex-col">
          {phase === 'setup' && (
            <div className="max-w-xl mx-auto w-full space-y-8 py-10 text-center">
              <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-full p-8 text-3xl border-4 border-slate-100 rounded-[30px] font-black bg-slate-50 focus:border-rose-500 outline-none">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button onClick={() => fetchContent(true)} className="w-full py-8 bg-rose-600 text-white rounded-[30px] font-black text-4xl shadow-2xl">RING THE BELL 🔔</button>
            </div>
          )}

          {phase === 'study' && (
            <div className="flex-grow flex flex-col justify-center space-y-10">
              <div className="p-16 bg-slate-900 text-white rounded-[50px] text-6xl font-mono text-center border-[12px] border-rose-600 shadow-2xl break-words leading-tight">{targetText}</div>
              <button onClick={() => setPhase('typing')} className="max-w-2xl mx-auto w-full py-8 bg-rose-600 text-white rounded-3xl font-black text-4xl shadow-2xl">GO THE DISTANCE 🥊</button>
            </div>
          )}

          {phase === 'typing' && (
            <div className="flex-grow flex flex-col space-y-6">
              <div className="flex gap-4 justify-center">
                <button onClick={() => rockySpeak(targetText)} className="px-10 py-3 bg-blue-100 text-blue-800 rounded-2xl font-black border-2 border-blue-200">🔊 Repeat</button>
                <button onClick={() => setShowHint(!showHint)} className="px-10 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black border-2 border-slate-200">👁️ Peek</button>
              </div>
              {showHint && <div className="text-center text-4xl font-mono text-indigo-500 py-4 font-black">{targetText}</div>}
              <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} autoFocus className="flex-grow w-full p-12 text-5xl font-mono border-4 border-slate-50 rounded-[50px] outline-none bg-slate-50 resize-none font-black" placeholder="Punch the keys..." />
              <button onClick={checkWork} className="w-full py-8 bg-indigo-600 text-white rounded-[30px] font-black text-4xl shadow-2xl">FINISH ROUND 🎯</button>
            </div>
          )}

          {phase === 'debrief' && (
            <div className="flex-grow flex flex-col space-y-6 animate-in fade-in">
              <h2 className="text-3xl font-black text-rose-600 text-center">CORRECTION DRILL: FIX YOUR MISTAKES</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedback.filter(f => f.status !== 'correct').map((error, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-[30px] border-4 border-rose-100 shadow-sm flex flex-col items-center gap-4 text-center">
                    <p className="text-sm font-black text-slate-400 uppercase">You wrote: <span className="line-through text-rose-500 ml-2">{error.word || "EMPTY"}</span></p>
                    <div className="text-4xl font-mono font-black text-indigo-900 tracking-widest">{error.target}</div>
                    <input 
                      value={correctionInput}
                      onChange={(e) => setCorrectionInput(e.target.value)}
                      placeholder="Type the word here correctly..."
                      className="w-full p-4 border-2 border-slate-200 rounded-xl text-center text-2xl font-mono"
                    />
                    {correctionInput.toLowerCase() === error.target.toLowerCase() && (
                      <p className="text-emerald-500 font-black animate-bounce text-sm">✓ GOOD WORK! NOW DO THE ROUND AGAIN.</p>
                    )}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => { setPhase('typing'); setUserInput(''); setFeedback([]); setCorrectionInput(""); }} 
                className="w-full py-8 bg-slate-800 text-white rounded-[30px] font-black text-2xl"
              >
                TRY ROUND AGAIN ↺
              </button>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="flex-grow flex flex-col items-center justify-center space-y-12 text-center">
              <div className="text-[180px] animate-bounce">🎖️</div>
              <button onClick={() => fetchContent(false)} className="px-24 py-10 bg-rose-600 text-white rounded-full font-black text-4xl shadow-2xl">NEXT MISSION 🚀</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}