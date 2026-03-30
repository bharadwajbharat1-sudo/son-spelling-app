"use client";

import React, { useState, useEffect } from 'react';

export default function ActiveSpellingRetrieval() {
  // --- STATE ---
  const [mode, setMode] = useState('sentence');
  const [level, setLevel] = useState(1);
  const [topic, setTopic] = useState('');
  const [targetText, setTargetText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState('setup'); 
  const [agentMessage, setAgentMessage] = useState("Ready for a mission?");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{word: string, status: 'correct' | 'error' | 'missing'}[]>([]);

  // --- METRICS ---
  const [dailyGoal] = useState(200);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  const randomTopics = ["Outer Space", "Minecraft", "Soccer Stars", "Robots", "Formula 1", "Deep Sea", "Coding"];

  const speak = (text: string, slow: boolean = false) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = slow ? 0.5 : 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const fetchContent = async () => {
    setLoading(true);
    const selectedTopic = topic.trim() || randomTopics[Math.floor(Math.random() * randomTopics.length)];
    try {
      const res = await fetch(`https://son-spelling-backend.onrender.com/generate?mode=${mode}&level=${level}&topic=${encodeURIComponent(selectedTopic)}`);
      const data = await res.json();
      setTargetText(data.text);
      setPhase('study');
      setAgentMessage("👀 Study the coordinates! Click 'Start' when ready.");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setAgentMessage("❌ Connection Error.");
    }
  };

  const checkWork = () => {
    const clean = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/);
    const targetWords = clean(targetText);
    const userWords = clean(userInput);
    
    const results: typeof feedback = [];
    let correctInThisSession = 0;
    let errorsInThisSession = 0;

    targetWords.forEach((word, i) => {
      if (!userWords[i]) {
        results.push({ word, status: 'missing' });
        errorsInThisSession++;
      } else if (userWords[i] !== word) {
        results.push({ word: userWords[i], status: 'error' });
        errorsInThisSession++;
      } else {
        results.push({ word, status: 'correct' });
        correctInThisSession++;
      }
    });

    setFeedback(results);

    if (errorsInThisSession === 0) {
      setPhase('feedback');
      setWordsCompleted(prev => prev + targetWords.length);
      setTotalCorrect(prev => prev + correctInThisSession);
      speak("Mission accomplished! Perfect spelling.");
    } else {
      setTotalErrors(prev => prev + errorsInThisSession);
      const firstError = results.find(r => r.status !== 'correct');
      if (firstError) {
        speak(`Check the word ${firstError.word}`);
      }
    }
  };

  const playKeySound = () => {
    const audio = new Audio('https://www.soundjay.com/communication/typewriter-key-1.mp3');
    audio.volume = 0.15;
    audio.play().catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900">
      
      {/* 1. TOP DASHBOARD: FULL WIDTH */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-indigo-500">
          <p className="text-xs font-bold text-slate-400 uppercase">Daily Goal</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-indigo-600">{wordsCompleted}</span>
            <span className="text-slate-400 mb-1">/ {dailyGoal} words</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${Math.min((wordsCompleted/dailyGoal)*100, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase">Correct Words</p>
          <span className="text-3xl font-black text-emerald-600">{totalCorrect}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-rose-500">
          <p className="text-xs font-bold text-slate-400 uppercase">Mistakes Made</p>
          <span className="text-3xl font-black text-rose-600">{totalErrors}</span>
        </div>

        <div className="bg-indigo-600 p-4 rounded-2xl shadow-sm text-white flex flex-col justify-center">
          <h1 className="text-xl font-black italic tracking-tighter">SPELLING COMMANDER</h1>
          <p className="text-[10px] uppercase opacity-70 tracking-widest">Operational Hub</p>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: WIDE LAYOUT */}
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-3xl overflow-hidden min-h-[600px] flex flex-col">
        
        {/* Agent Messaging Strip */}
        <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center justify-center gap-3">
          <span className="text-2xl">🤖</span>
          <p className="text-amber-900 font-bold italic">"{agentMessage}"</p>
        </div>

        <div className="p-8 flex-grow flex flex-col">
          {/* SETUP */}
          {phase === 'setup' && (
            <div className="max-w-xl mx-auto w-full space-y-8 py-10">
              <div className="grid grid-cols-3 gap-4">
                {['word', 'sentence', 'paragraph'].map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={`py-4 rounded-2xl font-black capitalize border-2 transition ${mode === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>{m}</button>
                ))}
              </div>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter a custom topic..." className="w-full p-6 text-2xl border-2 border-slate-200 rounded-3xl outline-none focus:border-indigo-500 transition shadow-inner" />
              <button onClick={fetchContent} disabled={loading} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-2xl hover:bg-indigo-700 active:scale-95 transition shadow-2xl">
                {loading ? "INITIALIZING MISSION..." : "LAUNCH MISSION 🚀"}
              </button>
            </div>
          )}

          {/* STUDY */}
          {phase === 'study' && (
            <div className="space-y-8 flex-grow flex flex-col justify-center py-6">
              <div className="p-12 bg-indigo-900 text-white rounded-[40px] text-5xl font-mono leading-tight shadow-2xl text-center border-8 border-indigo-400">
                {targetText}
              </div>
              <div className="max-w-2xl mx-auto w-full grid grid-cols-2 gap-6">
                <button onClick={() => speak(targetText)} className="py-6 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-xl hover:scale-105 transition">🔊 READ ALOUD</button>
                <button onClick={() => speak(targetText, true)} className="py-6 bg-orange-500 text-white rounded-3xl font-black text-xl shadow-xl hover:scale-105 transition">🐢 SLOW MODE</button>
              </div>
              <button onClick={() => setPhase('typing')} className="max-w-2xl mx-auto w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-2xl shadow-2xl mt-4">START TYPING ⌨️</button>
            </div>
          )}

          {/* TYPING */}
          {phase === 'typing' && (
            <div className="flex-grow flex flex-col space-y-6">
              <div className="flex gap-4 justify-center">
                <button onClick={() => speak(targetText)} className="px-8 py-3 bg-blue-100 text-blue-700 rounded-2xl font-bold border-2 border-blue-200">🔊 Repeat</button>
                <button onClick={() => speak(targetText, true)} className="px-8 py-3 bg-orange-100 text-orange-700 rounded-2xl font-bold border-2 border-orange-200">🐢 Slower</button>
                <button onMouseDown={() => setShowHint(true)} onMouseUp={() => setShowHint(false)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold border-2 border-slate-200">👁️ Peek</button>
              </div>

              {showHint && <div className="text-center text-4xl font-mono text-indigo-400 py-4 animate-pulse">{targetText}</div>}

              {/* LIVE FEEDBACK BOX */}
              {feedback.length > 0 && (
                <div className="p-6 bg-slate-50 rounded-[30px] border-2 border-slate-200 flex flex-wrap gap-4 justify-center">
                  {feedback.map((item, i) => (
                    <span key={i} className={`text-3xl font-mono font-bold ${item.status === 'correct' ? 'text-emerald-500' : 'text-rose-500 underline decoration-wavy underline-offset-8'}`}>
                      {item.word}
                    </span>
                  ))}
                </div>
              )}

              <textarea 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                onKeyDown={playKeySound}
                autoFocus 
                className="flex-grow w-full p-10 text-4xl font-mono border-4 border-indigo-50 rounded-[40px] outline-none focus:border-indigo-400 transition bg-slate-50 shadow-inner resize-none" 
                placeholder="Type your coordinates..."
              />
              <button onClick={checkWork} className="w-full py-8 bg-emerald-500 text-white rounded-[30px] font-black text-3xl shadow-2xl hover:bg-emerald-600 transition">VERIFY COORDINATES 🎯</button>
            </div>
          )}

          {/* SUCCESS */}
          {phase === 'feedback' && (
            <div className="flex-grow flex flex-col items-center justify-center space-y-10">
              <div className="text-[150px] animate-bounce">🏆</div>
              <h2 className="text-5xl font-black text-indigo-900">MISSION SUCCESS!</h2>
              <button onClick={() => { setPhase('setup'); setUserInput(''); setTargetText(''); setFeedback([]); }} className="px-20 py-8 bg-indigo-600 text-white rounded-full font-black text-3xl shadow-2xl hover:scale-110 transition">NEXT MISSION 🚀</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}