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

  const getSyllableBreakdown = (word: string) => {
    return word.match(/.{1,3}/g)?.join('-').toUpperCase() || word.toUpperCase();
  };

  const fetchContent = async (isNewSession: boolean = false) => {
    setLoading(true);
    startTime.current = null;
    setWpm(0);
    setUserInput('');
    setCorrectionDrills({});
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
      rockySpeak("Great round! Perfect form.");
    } else {
      setPhase('debrief');
      setCorrectionDrills({});
      rockySpeak("Check the blueprint, kid. Rebuild these words.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 p-6 font-sans text-slate-900 uppercase">
      
      {/* DASHBOARD */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-indigo-500 text-center">
          <p className="text-[10px] font-black text-slate-400">Target: 100 Words</p>
          <div className="text-4xl font-black text-indigo-600">{wordsCompleted} / 100</div>
          <div className="w-full bg-slate-100 h-3 rounded-full mt-2"><div className="bg-indigo-500 h-full" style={{ width: `${Math.min(wordsCompleted, 100)}%` }}></div></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-orange-500 text-center flex flex-col justify-center"><div className="text-4xl font-black text-orange-600">{wpm} WPM</div></div>
        <div className="flex flex-col gap-2"><button onClick={() => setPhase('setup')} className="flex-1 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase shadow-md">New Topic 🛠</button></div>
      </div>

      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-[40px] flex flex-col min-h-[650px] border-4 border-white overflow-hidden">
        <div className="bg-rose-700 p-4 text-white text-center font-black italic text-2xl uppercase">ROCKY SPELLING CAMP</div>

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
              <div className="p-16 bg-slate-900 text-white rounded-[50px] text-6xl font-mono text-center border-[12px] border-rose-600 shadow-2xl">{targetText}</div>
              <button onClick={() => setPhase('typing')} className="max-w-2xl mx-auto w-full py-8 bg-rose-600 text-white rounded-3xl font-black text-3xl shadow-2xl">GO THE DISTANCE 🥊</button>
            </div>
          )}

          {phase === 'typing' && (
            <div className="flex-grow flex flex-col space-y-6">
              <div className="flex gap-4 justify-center">
                <button onClick={() => rockySpeak(targetText)} className="px-10 py-3 bg-blue-100 text-blue-800 rounded-2xl font-black border-2 border-blue-200">🔊 Repeat</button>
                <button onClick={() => setShowHint(!showHint)} className="px-10 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black border-2 border-slate-200">👁️ Peek</button>
              </div>
              
              {/* THE TEXTAREA: AUTOCORRECT DISABLED */}
              <textarea 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                autoFocus 
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                className="flex-grow w-full p-12 text-5xl font-mono border-4 border-slate-50 rounded-[50px] outline-none bg-slate-50 resize-none font-black" 
                placeholder="Start punchin'..." 
              />
              
              <button onClick={checkWork} className="w-full py-8 bg-indigo-600 text-white rounded-[30px] font-black text-4xl shadow-2xl uppercase">Finish Round 🎯</button>
            </div>
          )}

          {phase === 'debrief' && (
            <div className="flex-grow flex flex-col space-y-6">
              <h2 className="text-3xl font-black text-rose-600 text-center uppercase italic">Correction Drill</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {feedback.filter(f => f.status !== 'correct').map((error, idx) => (
                  <div key={idx} className="bg-slate-50 p-6 rounded-[30px] border-4 border-indigo-50 shadow-md flex flex-col items-center gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blueprint: {getSyllableBreakdown(error.target)}</p>
                    <div className="text-4xl font-mono font-black text-indigo-900 tracking-widest">{error.target}</div>
                    
                    {/* CORRECTION INPUT: AUTOCORRECT DISABLED */}
                    <input 
                      value={correctionDrills[idx] || ""}
                      onChange={(e) => setCorrectionDrills(prev => ({ ...prev, [idx]: e.target.value }))}
                      spellCheck="false"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      placeholder="Retype correctly..."
                      className="w-full p-5 border-4 border-white rounded-2xl text-center text-3xl font-mono bg-white shadow-inner uppercase"
                    />
                    
                    {(correctionDrills[idx] || "").toLowerCase() === error.target.toLowerCase() && (
                      <span className="text-emerald-500 font-black animate-bounce text-xs italic">✓ WORD SECURED!</span>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => { setPhase('typing'); setUserInput(''); setFeedback([]); setCorrectionDrills({}); }} className="w-full py-8 bg-slate-800 text-white rounded-[40px] font-black text-2xl uppercase shadow-xl mt-4">Retry Round ↺</button>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="flex-grow flex flex-col items-center justify-center space-y-12">
              <div className="text-[180px] animate-bounce">🏆</div>
              <button onClick={() => fetchContent(false)} className="px-24 py-10 bg-rose-600 text-white rounded-full font-black text-4xl shadow-2xl">NEXT MISSION 🚀</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}