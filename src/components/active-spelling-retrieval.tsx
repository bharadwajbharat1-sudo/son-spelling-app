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

  // --- METRICS ---
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [wpm, setWpm] = useState(0);
  const startTime = useRef<number | null>(null);

  // --- TOPIC LIST ---
  const categories = [
    "Soccer", "Basketball", "Sneakers", "Technology", 
    "Space", "Science", "Geography", "History", "Video Games"
  ];

  const rockySpeak = (text: string, slow: boolean = false) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.5; 
      utterance.rate = slow ? 0.4 : 0.7; 
      window.speechSynthesis.speak(utterance);
    }
  };

  const breakDownWord = (word: string) => {
    return word.match(/.{1,3}/g)?.join('-') || word;
  };

  const fetchContent = async (isNewSession: boolean = false) => {
    setLoading(true);
    startTime.current = null;
    setWpm(0);
    setUserInput('');
    setShowHint(false);
    
    // Use the selected dropdown topic
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
      alert("Mission Failed, Mick! Check the connection.");
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
      setTotalCorrect(prev => prev + targetWords.length);
      setPhase('feedback');
      rockySpeak("Yo Adrian, we did it!");
    } else {
      setPhase('debrief');
      rockySpeak("Listen close, kid. We gotta fix these mistakes.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 p-6 font-sans text-slate-900 uppercase">
      
      {/* DASHBOARD */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl shadow-lg border-b-8 border-orange-500 text-center">
          <p className="text-[10px] font-black text-slate-400">Current Speed</p>
          <div className="text-4xl font-black text-orange-600">{wpm} WPM</div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-lg border-b-8 border-indigo-500 text-center">
          <p className="text-[10px] font-black text-slate-400">Total Words Today</p>
          <div className="text-4xl font-black text-indigo-600">{wordsCompleted} / 200</div>
        </div>
        <button onClick={() => setPhase('setup')} className="bg-slate-800 text-white rounded-3xl font-black shadow-lg hover:bg-black transition">Change Training 🛠</button>
        <button onClick={() => setWordsCompleted(0)} className="bg-rose-600 text-white rounded-3xl font-black shadow-lg hover:bg-rose-700 transition">Reset Stats ↺</button>
      </div>

      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-[40px] flex flex-col min-h-[600px] border-4 border-white overflow-hidden">
        
        <div className="bg-rose-700 p-4 text-white text-center font-black italic text-2xl">
          ROCKY SPELLING CAMP: {activeTopic || "CHOOSE YOUR TRAINING"}
        </div>

        <div className="p-10 flex-grow flex flex-col">
          
          {/* PHASE: SETUP (The Dropdown) */}
          {phase === 'setup' && (
            <div className="max-w-xl mx-auto w-full space-y-8 py-10 text-center">
              <div className="space-y-4 text-left">
                <label className="text-xs font-black text-slate-400 ml-4 tracking-widest uppercase">Select Your Training Category</label>
                <select 
                  value={selectedTopic} 
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full p-8 text-3xl border-4 border-slate-100 rounded-[30px] font-black bg-slate-50 appearance-none focus:border-rose-500 outline-none cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => fetchContent(true)} className="w-full py-8 bg-rose-600 text-white rounded-[30px] font-black text-4xl shadow-2xl hover:bg-rose-700 transition active:scale-95">
                {loading ? "DATA RETRIEVAL..." : "RING THE BELL 🔔"}
              </button>
            </div>
          )}

          {/* PHASE: STUDY */}
          {phase === 'study' && (
            <div className="flex-grow flex flex-col justify-center space-y-10">
              <div className="p-16 bg-slate-900 text-white rounded-[50px] text-6xl font-mono text-center border-[12px] border-rose-600 shadow-2xl break-words leading-tight">
                {targetText}
              </div>
              <div className="max-w-2xl mx-auto w-full grid grid-cols-2 gap-6">
                <button onClick={() => rockySpeak(targetText)} className="py-6 bg-blue-700 text-white rounded-3xl font-black text-xl shadow-xl">🔊 READ ALOUD</button>
                <button onClick={() => rockySpeak(targetText, true)} className="py-6 bg-orange-600 text-white rounded-3xl font-black text-xl shadow-xl">🐢 SLOW JAB</button>
              </div>
              <button onClick={() => setPhase('typing')} className="max-w-2xl mx-auto w-full py-8 bg-rose-600 text-white rounded-3xl font-black text-3xl shadow-2xl">GO THE DISTANCE 🥊</button>
            </div>
          )}

          {/* PHASE: TYPING */}
          {phase === 'typing' && (
            <div className="flex-grow flex flex-col space-y-6">
              <div className="flex gap-4 justify-center">
                <button onClick={() => rockySpeak(targetText)} className="px-10 py-3 bg-blue-50 text-blue-800 rounded-2xl font-black border-2 border-blue-100">🔊 Repeat</button>
                <button onClick={() => setShowHint(!showHint)} className={`px-10 py-3 rounded-2xl font-black border-2 transition ${showHint ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-100 text-slate-500'}`}>👁️ Peek</button>
              </div>
              {showHint && <div className="text-center text-4xl font-mono text-indigo-500 py-4 font-black bg-yellow-50 rounded-2xl border-2 border-yellow-100">{targetText}</div>}
              <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} autoFocus className="flex-grow w-full p-12 text-5xl font-mono border-4 border-slate-50 rounded-[50px] outline-none bg-slate-50 resize-none font-black" placeholder="Punch the keys..." />
              <button onClick={checkWork} className="w-full py-8 bg-indigo-600 text-white rounded-[30px] font-black text-4xl shadow-2xl">FINISH ROUND 🎯</button>
            </div>
          )}

          {/* PHASE: DEBRIEF (Teaching Screen) */}
          {phase === 'debrief' && (
            <div className="flex-grow flex flex-col space-y-8 animate-in fade-in duration-500">
              <h2 className="text-4xl font-black text-rose-600 text-center">Correction Room</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {feedback.filter(f => f.status !== 'correct').map((error, i) => (
                  <div key={i} className="bg-slate-50 p-8 rounded-[40px] border-4 border-rose-100 shadow-sm flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold text-sm">YOU WROTE:</span>
                      <span className="text-rose-500 line-through font-mono text-2xl font-black italic">{error.word || "(EMPTY)"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-500 font-black">CORRECT:</span>
                      <span className="text-indigo-900 font-mono text-4xl font-black tracking-widest">{error.target}</span>
                    </div>
                    <div className="pt-4 border-t-2 border-slate-200 text-center">
                      <button onClick={() => rockySpeak(error.target, true)} className="text-3xl font-mono text-indigo-600 font-black tracking-widest bg-white px-6 py-2 rounded-full border-2 border-indigo-100">
                        {breakDownWord(error.target)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex gap-4">
                <button onClick={() => { setPhase('typing'); setUserInput(''); setFeedback([]); }} className="flex-1 py-8 bg-slate-800 text-white rounded-[30px] font-black text-2xl uppercase">Retry Round ↺</button>
                <button onClick={() => fetchContent(false)} className="flex-1 py-8 bg-rose-600 text-white rounded-[30px] font-black text-2xl uppercase">Next Mission 🚀</button>
              </div>
            </div>
          )}

          {/* PHASE: SUCCESS */}
          {phase === 'feedback' && (
            <div className="flex-grow flex flex-col items-center justify-center space-y-12">
              <div className="text-[200px] animate-bounce">🎖️</div>
              <button onClick={() => fetchContent(false)} className="px-24 py-10 bg-rose-600 text-white rounded-full font-black text-4xl shadow-2xl hover:scale-105 transition">CONTINUE TRAINING 🥊</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}