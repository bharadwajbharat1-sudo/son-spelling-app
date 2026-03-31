"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function ActiveSpellingRetrieval() {
  // --- CORE STATE ---
  const [mode, setMode] = useState('sentence');
  const [level, setLevel] = useState(1);
  const [topic, setTopic] = useState('');
  const [activeTopic, setActiveTopic] = useState('');
  const [targetText, setTargetText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState('setup'); 
  const [agentMessage, setAgentMessage] = useState("Keep punchin', kid. Choose your mission.");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{word: string, status: 'correct' | 'error' | 'missing'}[]>([]);

  // --- SPEEDOMETER & METRICS ---
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [wpm, setWpm] = useState(0);
  const startTime = useRef<number | null>(null);

  const randomTopics = ["Heavyweight Boxing", "Mountain Training", "Philadelphia", "Golden Gloves", "Hard Work"];

  // --- STALLONE VOICE ENGINE ---
  const rockySpeak = (text: string, slow: boolean = false) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Stallone Profile: Deep, slow, and gravelly
      utterance.pitch = 0.5; // Lower pitch for that deep voice
      utterance.rate = slow ? 0.4 : 0.7; // Slower, more deliberate speech
      utterance.volume = 1.0;

      // Try to find a male voice if available
      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Alex'));
      if (maleVoice) utterance.voice = maleVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  // --- WPM CALCULATION ---
  useEffect(() => {
    if (phase === 'typing' && userInput.length === 1 && !startTime.current) {
      startTime.current = Date.now();
    }
    if (phase === 'typing' && startTime.current && userInput.length > 1) {
      const timeElapsed = (Date.now() - startTime.current) / 60000; // in minutes
      const wordCount = userInput.trim().split(/\s+/).length;
      setWpm(Math.round(wordCount / timeElapsed) || 0);
    }
  }, [userInput, phase]);

  const fetchContent = async (isNewTopic: boolean = false) => {
    setLoading(true);
    startTime.current = null;
    setWpm(0);
    const currentTopic = isNewTopic ? (topic.trim() || randomTopics[Math.floor(Math.random() * randomTopics.length)]) : activeTopic;
    if (isNewTopic) setActiveTopic(currentTopic);
    
    try {
      const res = await fetch(`https://son-spelling-backend.onrender.com/generate?mode=${mode}&level=${level}&topic=${encodeURIComponent(currentTopic)}`);
      const data = await res.json();
      setTargetText(data.text);
      setPhase('study');
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setAgentMessage("The base is down, Mick!");
    }
  };

  const checkWork = () => {
    const clean = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/);
    const targetWords = clean(targetText);
    const userWords = clean(userInput);
    const results: typeof feedback = [];
    let errors = 0;

    targetWords.forEach((word, i) => {
      if (!userWords[i]) { results.push({ word, status: 'missing' }); errors++; }
      else if (userWords[i] !== word) { results.push({ word: userWords[i], status: 'error' }); errors++; }
      else { results.push({ word, status: 'correct' }); }
    });

    setFeedback(results);

    if (errors === 0) {
      setPhase('feedback');
      setWordsCompleted(prev => prev + targetWords.length);
      setTotalCorrect(prev => prev + targetWords.length);
      rockySpeak("Yo, Adrian! We did it! Perfect spelling.");
    } else {
      setTotalErrors(prev => prev + errors);
      rockySpeak("Get up! One more round! Check that spelling.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 p-6 font-sans text-slate-900 uppercase">
      
      {/* --- DASHBOARD WITH SPEEDOMETER --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        
        {/* WPM SPEEDOMETER */}
        <div className="bg-white p-5 rounded-3xl shadow-lg border-b-8 border-orange-500 flex flex-col items-center justify-center relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 absolute top-4">Typing Speed</p>
          <div className="text-5xl font-black text-orange-600 z-10">{wpm}</div>
          <div className="text-[10px] font-bold text-orange-400 z-10">WPM</div>
          {/* Visual Gauge Background */}
          <div className="absolute bottom-0 left-0 h-1 bg-orange-200 transition-all duration-300" style={{ width: `${Math.min(wpm * 2, 100)}%` }}></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-lg border-b-8 border-indigo-500">
          <p className="text-[10px] font-black text-slate-400">Target: 200 Words</p>
          <div className="text-4xl font-black text-indigo-600">{wordsCompleted}</div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2"><div className="bg-indigo-500 h-full" style={{ width: `${(wordsCompleted/200)*100}%` }}></div></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-lg border-b-8 border-emerald-500 flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400">Knockouts (Correct)</p>
          <span className="text-4xl font-black text-emerald-600">{totalCorrect}</span>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={() => { setWordsCompleted(0); setPhase('setup'); }} className="flex-1 bg-rose-600 text-white rounded-2xl font-black text-xs shadow-md">Reset Stats ↺</button>
          <button onClick={() => setPhase('setup')} className="flex-1 bg-slate-800 text-white rounded-2xl font-black text-xs shadow-md">New Topic 🛠</button>
        </div>
      </div>

      {/* --- BOXING RING (WORKSPACE) --- */}
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-[40px] overflow-hidden border-4 border-white flex flex-col">
        
        <div className="bg-rose-700 p-4 text-white flex justify-between items-center px-10">
          <span className="font-black italic tracking-tighter text-2xl">ROCKY SPELLING CAMP</span>
          <span className="text-xs font-bold opacity-80">Rounds Completed: {Math.floor(wordsCompleted/5)}</span>
        </div>

        <div className="p-10 flex-grow flex flex-col">
          {phase === 'setup' && (
            <div className="max-w-xl mx-auto w-full space-y-8 py-10">
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. Training)" className="w-full p-8 text-3xl border-4 border-slate-100 rounded-[30px] outline-none focus:border-rose-500 transition font-black" />
              <button onClick={() => fetchContent(true)} className="w-full py-8 bg-rose-600 text-white rounded-[30px] font-black text-4xl shadow-2xl hover:bg-rose-700">RING THE BELL 🔔</button>
            </div>
          )}

          {phase === 'study' && (
            <div className="space-y-10 flex-grow flex flex-col justify-center">
              <div className="p-16 bg-slate-900 text-white rounded-[50px] text-6xl font-mono leading-tight text-center border-[12px] border-rose-600 shadow-2xl">
                {targetText}
              </div>
              <div className="max-w-2xl mx-auto w-full grid grid-cols-2 gap-6">
                <button onClick={() => rockySpeak(targetText)} className="py-6 bg-blue-700 text-white rounded-3xl font-black text-xl shadow-xl">🔊 THE CHAMP SPEAKS</button>
                <button onClick={() => rockySpeak(targetText, true)} className="py-6 bg-orange-600 text-white rounded-3xl font-black text-xl shadow-xl">🐢 SLOW JAB</button>
              </div>
              <button onClick={() => setPhase('typing')} className="max-w-2xl mx-auto w-full py-6 bg-rose-600 text-white rounded-3xl font-black text-2xl">GO THE DISTANCE 🥊</button>
            </div>
          )}

          {phase === 'typing' && (
            <div className="flex-grow flex flex-col space-y-6">
              <div className="flex gap-4 justify-center">
                <button onClick={() => rockySpeak(targetText)} className="px-10 py-3 bg-blue-50 text-blue-800 rounded-2xl font-black border-2 border-blue-200">🔊 Repeat</button>
                <button onClick={() => rockySpeak(targetText, true)} className="px-10 py-3 bg-orange-50 text-orange-800 rounded-2xl font-black border-2 border-orange-200">🐢 Slower</button>
                <button onMouseDown={() => setShowHint(true)} onMouseUp={() => setShowHint(false)} className="px-10 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black">👁️ Peek</button>
              </div>

              {feedback.length > 0 && (
                <div className="p-6 bg-rose-50 rounded-[30px] border-2 border-rose-100 flex flex-wrap gap-4 justify-center">
                  {feedback.map((item, i) => (
                    <span key={i} className={`text-4xl font-mono font-bold ${item.status === 'correct' ? 'text-slate-300' : 'text-rose-600 underline decoration-wavy'}`}>{item.word}</span>
                  ))}
                </div>
              )}

              <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} autoFocus className="flex-grow w-full p-12 text-5xl font-mono border-4 border-slate-100 rounded-[50px] outline-none focus:border-rose-400 transition bg-slate-50 resize-none font-black" placeholder="Start punchin' those keys..." />
              <button onClick={checkWork} className="w-full py-8 bg-rose-600 text-white rounded-[30px] font-black text-4xl shadow-2xl">JUDGE'S SCORE 🎯</button>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="flex-grow flex flex-col items-center justify-center space-y-12">
              <div className="text-[200px] animate-pulse">🥊</div>
              <button onClick={() => { setPhase('setup'); setUserInput(''); setFeedback([]); fetchContent(false); }} className="px-24 py-10 bg-rose-600 text-white rounded-full font-black text-4xl shadow-2xl">NEXT ROUND 🚀</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}