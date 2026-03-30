"use client";

import React, { useState } from 'react';

export default function ActiveSpellingRetrieval() {
  const [mode, setMode] = useState('sentence');
  const [level, setLevel] = useState(1);
  const [topic, setTopic] = useState('');
  const [targetText, setTargetText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState('setup');
  const [agentMessage, setAgentMessage] = useState("Ready for a mission? Enter a topic or leave it blank for a surprise!");
  const [loading, setLoading] = useState(false);

  const randomTopics = ["Outer Space", "Minecraft", "Dinosaurs", "Soccer Stars", "Undersea Adventure", "Robots", "Jungle Animals", "Volcanoes"];

  const speak = (text: string, slow: boolean = false) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = slow ? 0.5 : 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const fetchContent = async () => {
    setLoading(true);
    const selectedTopic = topic.trim() || randomTopics[Math.floor(Math.random() * randomTopics.length)];
    setAgentMessage(`🚀 Launching mission: ${selectedTopic}...`);
    
    try {
      const backendUrl = "https://son-spelling-backend.onrender.com";
      const res = await fetch(`${backendUrl}/generate?mode=${mode}&level=${level}&topic=${encodeURIComponent(selectedTopic)}`);
      
      if (!res.ok) throw new Error("Backend offline");
      
      const data = await res.json();
      setTargetText(data.text);
      setPhase('study');
      setAgentMessage("👀 Study & Listen! Tap the buttons to hear the mission.");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setAgentMessage("❌ Connection Error. Check your Render dashboard!");
    }
  };

  const checkWork = () => {
    if (userInput.trim().toLowerCase() === targetText.trim().toLowerCase()) {
      setPhase('feedback');
      setAgentMessage("🏆 MISSION ACCOMPLISHED!");
    } else {
      setAgentMessage("🤔 Not quite! Use the 'Repeat' buttons to hear it again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border-t-8 border-indigo-600">
        
        {/* Header */}
        <div className="p-6 bg-indigo-50 border-b border-indigo-100 text-center">
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight italic">SPELLING COMMANDER</h1>
        </div>

        {/* Agent Bubble */}
        <div className="p-6">
          <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl relative shadow-sm">
            <p className="text-amber-900 font-medium italic">"{agentMessage}"</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* SETUP PHASE */}
          {phase === 'setup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {['word', 'sentence', 'paragraph'].map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={`py-2 rounded-xl font-bold capitalize border-2 transition ${mode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500'}`}>{m}</button>
                ))}
              </div>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter topic or leave blank for Random 🎲" className="w-full p-4 text-lg border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none shadow-inner" />
              <button disabled={loading} onClick={fetchContent} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 shadow-lg active:scale-95 transition disabled:opacity-50">
                {loading ? "Initializing..." : "Launch Mission 🚀"}
              </button>
            </div>
          )}

          {/* STUDY PHASE */}
          {phase === 'study' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-10 bg-indigo-900 text-white rounded-3xl text-3xl font-mono leading-relaxed shadow-2xl text-center border-4 border-indigo-400">
                {targetText}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => speak(targetText)} className="py-4 bg-blue-500 text-white rounded-2xl font-bold text-lg hover:bg-blue-600 shadow-md flex items-center justify-center gap-2">🔊 Read Aloud</button>
                <button onClick={() => speak(targetText, true)} className="py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg hover:bg-orange-600 shadow-md flex items-center justify-center gap-2">🐢 Slow Mode</button>
              </div>
              <button onClick={() => { setPhase('typing'); setAgentMessage("✍️ Type exactly what you heard!"); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 shadow-lg">Start Typing ⌨️</button>
            </div>
          )}

          {/* TYPING PHASE */}
          {phase === 'typing' && (
            <div className="space-y-4 animate-in zoom-in-95">
              <div className="flex gap-2 mb-2">
                <button onClick={() => speak(targetText)} className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-bold border border-blue-200">🔊 Repeat</button>
                <button onClick={() => speak(targetText, true)} className="flex-1 py-2 bg-orange-100 text-orange-700 rounded-xl text-sm font-bold border border-orange-200">🐢 Slower</button>
              </div>
              <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} autoFocus className="w-full p-6 h-40 text-xl border-3 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none resize-none shadow-inner bg-slate-50" placeholder="Type here..." />
              <button onClick={checkWork} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xl hover:bg-emerald-600 shadow-xl transition active:scale-95">Verify Coordinates 🎯</button>
            </div>
          )}

          {/* FEEDBACK PHASE */}
          {phase === 'feedback' && (
            <div className="text-center py-10 space-y-8">
              <div className="text-8xl animate-bounce">🥇</div>
              <button onClick={() => { setPhase('setup'); setUserInput(''); setTargetText(''); setTopic(''); }} className="px-10 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg shadow-lg">New Mission</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}