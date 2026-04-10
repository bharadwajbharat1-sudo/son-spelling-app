"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function ActiveSpellingRetrieval() {
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
  const [correctionDrills, setCorrectionDrills] = useState<Record<number, string>>({});

  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [wpm, setWpm] = useState(0);
  const startTime = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const rockySpeak = (text: string, slow: boolean = false) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.5; 
      utterance.rate = slow ? 0.3 : 0.65;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  const getSyllableBreakdown = (word: string) => {
    if (word.length <= 4) return word.toUpperCase();
    return word.toUpperCase().match(/.{1,3}/g)?.join(' - ') || word.toUpperCase();
  };

  const fetchContent = async (isNewSession: boolean = false) => {
    setLoading(true);
    setTargetText('');
    setUserInput('');
    setFeedback([]);
    setCorrectionDrills({});
    setShowHint(false);
    startTime.current = null;
    setWpm(0);

    const currentTopic = isNewSession ? selectedTopic : activeTopic;
    if (isNewSession) setActiveTopic(currentTopic);
    
    try {
      const res = await fetch(`https://son-spelling-backend.onrender.com/generate?mode=${mode}&level=${level}&topic=${encodeURIComponent(currentTopic)}`);
      const data = await res.json();
      if (data.text) {
        setTargetText(data.text);
        setPhase('study');
      }
    } catch (err) {
      alert("Mick! Get the connection back up!");
    } finally {
      setLoading(false);
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
    const correctCount = results.filter(f => f.status === 'correct').length;
    setWordsCompleted(prev => prev + correctCount);

    if (!hasErrors) {
      setPhase('feedback');
      rockySpeak("Yo Adrian! I did it! Perfect round, kid!");
      playSound('https://www.myinstants.com/media/sounds/ding-sound-effect_2.mp3');
    } else {
      setPhase('debrief');
      // Requirement 2: Read back exactly what he wrote
      rockySpeak(`You wrote: ${userInput}. But look at the blueprint. We gotta fix it.`);
    }
  };

  return (
    <div className={`min-h-screen p-6 font-sans text-slate-900 uppercase transition-colors duration-1000 ${wordsCompleted > 75 ? 'bg-orange-100' : 'bg-slate-200'}`}>
      
      {/* --- CHAMPIONSHIP DASHBOARD --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl shadow-lg border-b-8 border-indigo-600">
          <p className="text-[10px] font-black text-slate-400">Total Words Today</p>
          <div className="text-4xl font-black text-indigo-600">{wordsCompleted} / 100</div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2"><div className="bg-indigo-600 h-full transition-all duration-500" style={{width: `${wordsCompleted}%`}}></div></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-lg border-b-8 border-orange-500 flex flex-col justify-center text-center">
          <p className="text-[10px] font-black text-slate-400">Punches (WPM)</p>
          <div className="text-4xl font-black text-orange-600">{wpm}</div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-lg border-b-8 border-emerald-500 flex flex-col justify-center text-center">
          <p className="text-[10px] font-black text-slate-400">Current Rank</p>
          <div className="text-2xl font-black text-emerald-600">
            {wordsCompleted < 25 ? "AMATEUR" : wordsCompleted < 50 ? "CONTENDER" : wordsCompleted < 75 ? "PRO" : "CHAMPION"}
          </div>
        </div>

        <button onClick={() => setPhase('setup')} className="bg-slate-800 text-white rounded-3xl font-black text-xs shadow-lg hover:scale-105 transition">Change Topic 🛠</button>
      </div>

      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-[50px] flex flex-col min-h-[700px] border-4 border-white overflow-hidden relative">
        <div className="bg-rose-700 p-4 text-white text-center font-black italic text-2xl tracking-widest flex justify-between px-10">
          <span>ROCKY SPELLING CAMP</span>
          <span className="opacity-50 text-sm">{activeTopic}</span>
        </div>

        <div className="p-10 flex-grow flex flex-col">
          {phase === 'setup' && (
            <div className="max-w-xl mx-auto w-full space-y-8 py-10 text-center">
              <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-full p-8 text-3xl border-4 border-slate-100 rounded-[30px] font-black bg-slate-50 outline-none">
                {["Soccer", "Basketball", "Sneakers", "Technology", "Space", "Science", "Geography", "History", "Video Games"].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button onClick={() => fetchContent(true)} disabled={loading} className="w-full py-8 bg-rose-600 text-white rounded-[40px] font-black text-4xl shadow-2xl active:scale-95 transition">RING THE BELL 🔔</button>
            </div>
          )}

          {phase === 'study' && (
            <div className="flex-grow flex flex-col justify-center space-y-10 animate-in zoom-in-95 duration-300">
              <div className="p-16 bg-slate-900 text-white rounded-[60px] text-7xl font-mono text-center border-[15px] border-rose-600 shadow-2xl">{targetText}</div>
              <button onClick={() => { setPhase('typing'); rockySpeak("Go get 'em!"); }} className="max-w-2xl mx-auto w-full py-8 bg-rose-600 text-white rounded-[40px] font-black text-4xl shadow-2xl">GO THE DISTANCE 🥊</button>
            </div>
          )}

          {phase === 'typing' && (
            <div className="flex-grow flex flex-col space-y-6">
              <div className="flex gap-4 justify-center">
                <button onMouseDown={(e) => { e.preventDefault(); rockySpeak(targetText); }} className="px-10 py-3 bg-blue-100 text-blue-800 rounded-2xl font-black border-2 border-blue-200">🔊 Repeat</button>
                <button onMouseDown={(e) => { e.preventDefault(); setShowHint(true); }} onMouseUp={() => setShowHint(false)} onMouseLeave={() => setShowHint(false)} className="px-10 py-3 rounded-2xl font-black border-2 bg-slate-100 text-slate-500 border-slate-200 active:bg-yellow-400">👁️ Hold to Peek</button>
              </div>
              <div className="h-16 flex items-center justify-center">
                {showHint && <div className="text-4xl font-mono text-indigo-600 font-black bg-yellow-50 px-8 py-2 rounded-2xl border-2 border-yellow-200">{targetText}</div>}
              </div>
              <textarea 
                ref={inputRef} value={userInput} onChange={(e) => setUserInput(e.target.value)} autoFocus 
                spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none"
                className="flex-grow w-full p-12 text-6xl font-mono border-4 border-slate-50 rounded-[60px] outline-none bg-slate-50 resize-none font-black text-indigo-900" 
              />
              <button onClick={checkWork} className="w-full py-10 bg-indigo-600 text-white rounded-[40px] font-black text-4xl shadow-2xl uppercase">Submit Score 🎯</button>
            </div>
          )}

          {phase === 'debrief' && (
            <div className="flex-grow flex flex-col space-y-8 animate-in slide-in-from-bottom duration-500">
              <h2 className="text-4xl font-black text-rose-600 text-center italic">Blueprint Room: Rebuild it Mick!</h2>
              
              <div className="grid grid-cols-1 gap-8">
                {feedback.filter(f => f.status !== 'correct').map((error, idx) => (
                  <div key={idx} className="bg-slate-50 p-10 rounded-[60px] border-4 border-indigo-100 shadow-xl flex flex-col items-center gap-6">
                    <div className="flex flex-col items-center gap-2">
                       <p className="text-xs font-black text-slate-400">YOU WROTE:</p>
                       <span className="text-rose-500 line-through text-3xl font-mono font-black italic">{error.word || "MISSING"}</span>
                    </div>

                    <div className="text-7xl md:text-8xl font-mono font-black text-indigo-900 tracking-[0.1em] bg-white px-12 py-8 rounded-[40px] shadow-inner border-2 border-slate-100 text-center">
                        {getSyllableBreakdown(error.target)}
                    </div>
                    
                    <input 
                      value={correctionDrills[idx] || ""}
                      onChange={(e) => setCorrectionDrills(prev => ({ ...prev, [idx]: e.target.value }))}
                      spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none"
                      className="w-full p-8 border-4 border-indigo-500 rounded-[30px] text-center text-5xl font-mono bg-white shadow-2xl uppercase font-black outline-none"
                      placeholder="Fix the word..."
                    />
                    {(correctionDrills[idx] || "").toLowerCase() === error.target.toLowerCase() && (
                      <div className="bg-emerald-500 text-white px-10 py-3 rounded-full font-black text-xl shadow-lg">✓ SECURED</div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => fetchContent(false)} disabled={loading} className="w-full py-10 bg-rose-600 text-white rounded-[50px] font-black text-3xl uppercase shadow-2xl hover:bg-rose-700 transition">
                {loading ? "PREPARING NEXT ROUND..." : "Next Round 🚀"}
              </button>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="flex-grow flex flex-col items-center justify-center space-y-12 animate-in zoom-in duration-500">
              <div className="text-[200px] drop-shadow-2xl">🎖️</div>
              <div className="text-center">
                 <h3 className="text-5xl font-black text-indigo-900 mb-2 italic">YO ADRIAN!</h3>
                 <p className="text-slate-500 font-bold">ANOTHER ROUND FOR THE CHAMP.</p>
              </div>
              <button onClick={() => fetchContent(false)} disabled={loading} className="px-24 py-12 bg-rose-600 text-white rounded-full font-black text-5xl shadow-2xl hover:scale-110 transition">
                CONTINUE 🥊
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}