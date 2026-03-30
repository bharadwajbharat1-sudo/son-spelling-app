"use client";

import React, { useState } from 'react';

export default function ActiveSpellingRetrieval() {
  const [mode, setMode] = useState('sentence');
  const [level, setLevel] = useState(1);
  const [topic, setTopic] = useState('');
  const [targetText, setTargetText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState('setup'); 
  const [agentMessage, setAgentMessage] = useState("Ready for a mission?");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const randomTopics = ["Outer Space", "Minecraft", "Soccer Stars", "Robots", "Dinosaurs"];

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
    const target = targetText.trim();
    const user = userInput.trim();

    // 1. Perfect Match
    if (user === target) {
      setPhase('feedback');
      setAgentMessage("🏆 MISSION ACCOMPLISHED! Perfect spelling and punctuation.");
      return;
    }

    // 2. Check for Case/Punctuation only
    if (user.toLowerCase().replace(/[^\w\s]/g, '') === target.toLowerCase().replace(/[^\w\s]/g, '')) {
      setAgentMessage("⚠️ Almost! The words are right, but check your Capital Letters or Punctuation (. , !).");
      return;
    }

    // 3. Word Count Check
    const targetWords = target.split(/\s+/);
    const userWords = user.split(/\s+/);

    if (userWords.length < targetWords.length) {
      setAgentMessage(`📉 Mission incomplete! You are missing some words. You wrote ${userWords.length} of ${targetWords.length} words.`);
    } else {
      // 4. Find the first spelling error
      let firstErrorIndex = targetWords.findIndex((w, i) => w.toLowerCase() !== (userWords[i] || "").toLowerCase());
      setAgentMessage(`❌ Spelling Error! Check word #${firstErrorIndex + 1}. Try listening to the "Slower" mode.`);
    }
  };

  const playKeySound = () => {
    // Mechanical typewriter click sound
    const audio = new Audio('https://www.soundjay.com/communication/typewriter-key-1.mp3');
    audio.volume = 0.4; // Adjust volume as needed
    audio.play().catch(() => {
      // Ignore errors if the browser blocks the first click
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border-t-8 border-indigo-600">
        
        <div className="p-6 bg-indigo-50 border-b border-indigo-100 text-center">
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight italic">SPELLING COMMANDER</h1>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl relative shadow-sm">
            <p className="text-amber-900 font-medium italic">"{agentMessage}"</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {phase === 'setup' && (
            <div className="space-y-6">
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (or leave blank for Random)" className="w-full p-4 border-2 border-slate-200 rounded-2xl outline-none" />
              <button disabled={loading} onClick={fetchContent} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl">Launch Mission 🚀</button>
            </div>
          )}

          {phase === 'study' && (
            <div className="space-y-6">
              <div className="p-10 bg-indigo-900 text-white rounded-3xl text-3xl font-mono text-center border-4 border-indigo-400">
                {targetText}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => speak(targetText)} className="py-4 bg-blue-600 text-white rounded-2xl font-bold">🔊 Read Aloud</button>
                <button onClick={() => speak(targetText, true)} className="py-4 bg-orange-500 text-white rounded-2xl font-bold">🐢 Slow Mode</button>
              </div>
              <button onClick={() => setPhase('typing')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl">Start Typing ⌨️</button>
            </div>
          )}

          {phase === 'typing' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-2">
                <button onClick={() => speak(targetText)} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold">🔊 Repeat</button>
                <button onClick={() => speak(targetText, true)} className="flex-1 py-3 bg-orange-100 text-orange-700 rounded-xl font-bold">🐢 Slower</button>
                <button 
                  onMouseDown={() => setShowHint(true)} 
                  onMouseUp={() => setShowHint(false)}
                  onMouseLeave={() => setShowHint(false)}
                  className="px-4 bg-slate-100 text-slate-600 rounded-xl font-bold border-2 border-slate-200"
                >
                  👁️ Peek
                </button>
              </div>

              {showHint && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-yellow-800 font-mono text-center animate-pulse">
                   {targetText}
                </div>
              )}

              <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={playKeySound} autoFocus className="w-full p-6 h-40 text-xl border-3 border-indigo-100 rounded-2xl outline-none bg-slate-50" placeholder="Type here..." />
              <button onClick={checkWork} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xl shadow-xl">Verify Coordinates 🎯</button>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="text-center py-10 space-y-8">
              <div className="text-8xl animate-bounce">🥇</div>
              <button onClick={() => { setPhase('setup'); setUserInput(''); setTargetText(''); setTopic(''); }} className="px-10 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg">New Mission</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}