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
      utterance.rate = slow ? 0.3 : 0.6;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getSyllableBreakdown = (word: string) => {
    if (word.length <= 4) return word.toUpperCase();
    return word.toUpperCase().match(/.{1,3}/g)?.join(' - ') || word.toUpperCase();
  };

  // UPDATED: Ensuring word count is committed before moving rounds
  const fetchContent = async (isNewSession: boolean = false) => {
    setLoading(true);
    startTime.current = null; // Reset WPM timer for the new sentence
    setWpm(0);
    setUserInput('');
    setCorrectionDrills({});
    setShowHint(false);
    
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
      alert("System Down, Mick!");
    }
  };

  // UPDATED: WPM calculation logic to be more reactive
  useEffect(() => {
    if (phase === 'typing' && userInput.length > 0) {
      if (!startTime.current) {
        startTime.current = Date.now();
      }
      const timeElapsed = (Date.now() - startTime.current) / 60000; // in minutes
      const wordCount = userInput.trim().split(/\s+/).length;
      if (timeElapsed > 0.01) { // Prevent infinity on first keystroke
        setWpm(Math.round(wordCount / timeElapsed));
      }
    }
  }, [userInput, phase]);

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
    
    // ALWAYS update words completed based on how many he got right
    const correctCount = results.filter(f => f.status === 'correct').length;
    setWordsCompleted(prev => prev + correctCount);

    if (!hasErrors) {
      setPhase('feedback');
      rockySpeak("Great round! Perfect form.");
    } else {
      setPhase('debrief');
      rockySpeak("Check the blueprint. Fix 'em and we move on.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 p-6 font-sans text-slate-900 uppercase">
      
      {/* DASHBOARD */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-indigo-500 text-center">
          <p className="text-[10px] font-black text-slate-400">Target: 100 Words</p>
          <div className="text-4xl font-black text-indigo-600">{wordsCompleted} / 100</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-orange-500 text-center flex flex-col justify-center">
          <div className="text-4xl font-black text-orange-600">{wpm} WPM</div>
        </div>
        <button onClick={() => setPhase('setup')} className="bg-slate-800 text-white rounded-2xl font-black text-xs uppercase shadow-md hover:bg-black transition">New Topic 🛠</button>
      </div>

      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-[40px] flex flex-col min-h-[700px] border-4 border-white overflow-hidden">
        <div className="bg-rose-700 p-4 text-white text-center font-black italic text-2xl uppercase tracking-widest">ROCKY SPELLING CAMP</div>

        <div className="p-10 flex-grow flex flex-col">
          {phase === 'setup' && (
            <div className="max-w-xl mx-auto w-full space-y-8 py-10 text-center">
              <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-full p-8 text-3xl border-4 border-slate-100 rounded-[30px] font-black bg-slate-50 focus:border-rose-500 outline-none cursor-pointer">
                {["Soccer", "Basketball", "Sneakers", "Technology", "Space", "Science", "Geography", "History", "Video Games"].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button onClick={() => fetchContent(true)} className="w-full py-8 bg-rose-600 text-white rounded-[30px] font-black text-4xl shadow-2xl">RING THE BELL 🔔</button>
            </div>
          )}

          {phase === 'study' && (
            <div className="flex-grow flex flex-col justify-center space-y-10">
              <div className="p-16 bg-slate-900 text-white rounded-[50px] text-7xl font-mono text-center border-[12px] border-rose-600 shadow-2xl break-words">{targetText}</div>
              <button onClick={() => setPhase('typing')} className="max-w-2xl mx-auto w-full py-8 bg-rose-600 text-white rounded-3xl font-black text-3xl shadow-2xl">GO THE DISTANCE 🥊</button>
            </div>
          )}

          {phase === 'typing' && (
            <div className="flex-grow flex flex-col space-y-6">
              <div className="flex gap-4 justify-center">
                <button onMouseDown={(e) => { e.preventDefault(); rockySpeak(targetText); }} className="px-10 py-3 bg-blue-100 text-blue-800 rounded-2xl font-black border-2 border-blue-200">🔊 Repeat</button>
                {/* PEEK: Only shows while button is held down */}
                <button 
                    onMouseDown={(e) => { e.preventDefault(); setShowHint(true); }} 
                    onMouseUp={() => setShowHint(false)}
                    onMouseLeave={() => setShowHint(false)}
                    className="px-10 py-3 rounded-2xl font-black border-2 bg-slate-100 text-slate-500 border-slate-200 active:bg-yellow-400 active:text-yellow-900"
                >
                    👁️ Hold to Peek
                </button>
              </div>
              
              <div className="h-16 flex items-center justify-center">
                {showHint && <div className="text-center text-4xl font-mono text-indigo-600 font-black bg-yellow-50 px-6 py-2 rounded-2xl border-2 border-yellow-200 animate-pulse">{targetText}</div>}
              </div>

              <textarea 
                ref={inputRef}
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                autoFocus 
                spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none"
                className="flex-grow w-full p-12 text-5xl font-mono border-4 border-slate-50 rounded-[50px] outline-none bg-slate-50 resize-none font-black" 
              />
              <button onClick={checkWork} className="w-full py-8 bg-indigo-600 text-white rounded-[30px] font-black text-4xl shadow-2xl uppercase tracking-tighter">Finish Round 🎯</button>
            </div>
          )}

          {phase === 'debrief' && (
            <div className="flex-grow flex flex-col space-y-8">
              <h2 className="text-4xl font-black text-rose-600 text-center uppercase italic">The Blueprint Room</h2>
              <div className="grid grid-cols-1 gap-8">
                {feedback.filter(f => f.status !== 'correct').map((error, idx) => (
                  <div key={idx} className="bg-slate-50 p-10 rounded-[50px] border-4 border-indigo-100 shadow-xl flex flex-col items-center gap-6">
                    <div className="text-6xl md:text-8xl font-mono font-black text-indigo-900 tracking-[0.1em] bg-white px-12 py-8 rounded-[40px] shadow-inner border-2 border-slate-100 text-center">
                        {getSyllableBreakdown(error.target)}
                    </div>
                    <input 
                      value={correctionDrills[idx] || ""}
                      onChange={(e) => setCorrectionDrills(prev => ({ ...prev, [idx]: e.target.value }))}
                      spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none"
                      className="w-full p-8 border-4 border-indigo-500 rounded-[30px] text-center text-5xl font-mono bg-white shadow-2xl uppercase font-black outline-none"
                    />
                    {(correctionDrills[idx] || "").toLowerCase() === error.target.toLowerCase() && (
                      <div className="bg-emerald-500 text-white px-10 py-3 rounded-full font-black text-xl shadow-lg">✓ SECURED</div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => fetchContent(false)} className="w-full py-10 bg-rose-600 text-white rounded-[50px] font-black text-3xl uppercase shadow-2xl mt-6">Next Round 🚀</button>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="flex-grow flex flex-col items-center justify-center space-y-12">
              <div className="text-[200px] animate-bounce">🏆</div>
              <button onClick={() => fetchContent(false)} className="px-24 py-10 bg-rose-600 text-white rounded-full font-black text-4xl shadow-2xl">NEXT MISSION 🚀</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}