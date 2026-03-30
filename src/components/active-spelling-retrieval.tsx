"use client";

import React, { useState } from 'react';

export default function ActiveSpellingRetrieval() {
  const [mode, setMode] = useState('sentence');
  const [level, setLevel] = useState(1);
  const [topic, setTopic] = useState('');
  const [targetText, setTargetText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState('setup'); // phases: setup, study, typing, feedback
  const [agentMessage, setAgentMessage] = useState("Ready for a mission? What should we write about?");
  const [loading, setLoading] = useState(false);

  const speak = (text: string, slow: boolean = false) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = slow ? 0.5 : 0.9; // 0.5 is nice and slow for spelling
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const fetchContent = async () => {
    setLoading(true);
    setAgentMessage("🚀 Consulting the AI archives for your mission...");
    
    try {
      const backendUrl = "https://son-spelling-backend.onrender.com";
      const res = await fetch(`${backendUrl}/generate?mode=${mode}&level=${level}&topic=${encodeURIComponent(topic || 'Science')}`);
      
      if (!res.ok) throw new Error("Backend offline");
      
      const data = await res.json();
      setTargetText(data.text);
      setPhase('study');
      setAgentMessage("👀 Study and Listen! Click 'Start' when you are ready to type.");
      setLoading(false);
      
    } catch (err) {
      setLoading(false);
      setAgentMessage("❌ Connection Error. Is the Render backend running?");
    }
  };

  const checkWork = () => {
    const isCorrect = userInput.trim().toLowerCase() === targetText.trim().toLowerCase();
    
    if (isCorrect) {
      setPhase('feedback');
      setAgentMessage("🏆 MISSION ACCOMPLISHED! Your spelling is flawless.");
    } else {
      const targetWords = targetText.split(' ');
      const userWords = userInput.split(' ');
      let firstErrorIndex = targetWords.findIndex(
        (w, i) => w.toLowerCase() !== (userWords[i] || "").toLowerCase()
      );
      
      setAgentMessage(`🤔 Almost! Check word #${firstErrorIndex + 1}. Try listening again.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border-t-8 border-indigo-600">
        
        {/* Header Area */}
        <div className="p-6 bg-indigo-50 border-b border-indigo-100 text-center">
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight italic">SPELLING COMMANDER</h1>
          <div className="mt-2 flex justify-center gap-2">
            <span className="px-3 py-1 bg-indigo-200 text-indigo-800 rounded-full text-xs font-bold uppercase">Level {level}</span>
            <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold uppercase">{mode}</span>
          </div>
        </div>

        {/* Agent Speech Bubble */}
        <div className="p-6">
          <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl relative shadow-sm">
            <p className="text-amber-900 font-medium italic">"{agentMessage}"</p>
            <div className="absolute -bottom-2 left-10 w-4 h-4 bg-amber-50 border-b-2 border-r-2 border-amber-200 rotate-45"></div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* PHASE 1: SETUP */}
          {phase === 'setup' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-3 gap-2">
                {['word', 'sentence', 'paragraph'].map((m) => (
                  <button 
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-2 rounded-xl font-bold capitalize border-2 transition ${mode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Topic</label>
                <input 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Liverpool FC, Space, Coding..."
                  className="w-full p-4 text-lg border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition shadow-inner"
                />
              </div>

              <button 
                disabled={loading}
                onClick={fetchContent}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 shadow-lg active:scale-95 transition disabled:opacity-50"
              >
                {loading ? "Initializing..." : "Launch Mission 🚀"}
              </button>
            </div>
          )}

          {/* PHASE 2: STUDY */}
          {phase === 'study' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-10 bg-indigo-900 text-white rounded-3xl text-3xl font-mono leading-relaxed shadow-2xl text-center border-4 border-indigo-400">
                {targetText}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => speak(targetText)}
                  className="py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  🔊 Read Aloud
                </button>
                <button 
                  onClick={() => speak(targetText, true)}
                  className="py-4 bg-white border-2 border-amber-500 text-amber-600 rounded-2xl font-bold text-lg hover:bg-amber-50 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  🐢 Slow Mode
                </button>
              </div>

              <button 
                onClick={() => {
                  setPhase('typing');
                  setAgentMessage("✍️ Type exactly what you heard!");
                }}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 shadow-lg mt-4"
              >
                Start Typing ⌨️
              </button>
            </div>
          )}

          {/* PHASE 3: TYPING */}
          {phase === 'typing' && (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              <div className="flex gap-2 mb-2">
                <button 
                  onClick={() => speak(targetText)}
                  className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold border border-indigo-200"
                >
                  🔊 Repeat
                </button>
                <button 
                  onClick={() => speak(targetText, true)}
                  className="flex-1 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-bold border border-amber-200"
                >
                  🐢 Slower
                </button>
              </div>

              <textarea 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                autoFocus
                className="w-full p-6 h-40 text-xl border-3 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none resize-none shadow-inner bg-slate-50"
                placeholder="Enter the words here..."
              />
              <button 
                onClick={checkWork}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xl hover:bg-emerald-600 shadow-xl transition active:scale-95"
              >
                Verify Coordinates 🎯
              </button>
            </div>
          )}

          {/* PHASE 4: FEEDBACK */}
          {phase === 'feedback' && (
            <div className="text-center py-10 space-y-8">
              <div className="text-8xl animate-bounce">🥇</div>
              <h2 className="text-2xl font-black text-slate-800">MISSION SUCCESSFUL</h2>
              <button 
                onClick={() => {
                  setPhase('setup');
                  setUserInput('');
                  setTargetText('');
                  setTopic('');
                }}
                className="px-10 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 shadow-lg"
              >
                New Mission
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}