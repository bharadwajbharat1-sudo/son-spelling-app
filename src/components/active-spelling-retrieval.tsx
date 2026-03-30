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
  const [feedback, setFeedback] = useState<{word: string, status: 'correct' | 'error' | 'missing'}[]>([]);

  const randomTopics = ["Outer Space", "Minecraft", "Soccer Stars", "Robots", "Formula 1"];

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
      setAgentMessage("👀 Study the words! Click 'Start' when ready.");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setAgentMessage("❌ Connection Error.");
    }
  };

  const checkWork = () => {
    // Clean text: remove punctuation and extra spaces for the comparison
    const clean = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/);
    
    const targetWords = clean(targetText);
    const userWords = clean(userInput);
    
    const results: typeof feedback = [];
    let allCorrect = true;

    targetWords.forEach((word, i) => {
      if (!userWords[i]) {
        results.push({ word, status: 'missing' });
        allCorrect = false;
      } else if (userWords[i] !== word) {
        results.push({ word: userWords[i], status: 'error' });
        allCorrect = false;
      } else {
        results.push({ word, status: 'correct' });
      }
    });

    setFeedback(results);

    if (allCorrect) {
      setPhase('feedback');
      setAgentMessage("🏆 MISSION ACCOMPLISHED!");
      speak("Mission accomplished! Perfect spelling.");
    } else {
      const firstMissing = results.find(r => r.status === 'missing');
      const firstError = results.find(r => r.status === 'error');

      if (firstMissing) {
        setAgentMessage(`📉 You missed a word: "${firstMissing.word}"`);
        speak(`You missed the word: ${firstMissing.word}`);
      } else if (firstError) {
        setAgentMessage(`❌ Almost! Check your spelling of "${firstError.word}"`);
        speak(`Check your spelling of ${firstError.word}`);
      }
    }
  };

  const playKeySound = () => {
    const audio = new Audio('https://www.soundjay.com/communication/typewriter-key-1.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
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
              <button onClick={() => { setPhase('typing'); setFeedback([]); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl">Start Typing ⌨️</button>
            </div>
          )}

          {phase === 'typing' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-2">
                <button onClick={() => speak(targetText)} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold">🔊 Repeat</button>
                <button onClick={() => speak(targetText, true)} className="flex-1 py-3 bg-orange-100 text-orange-700 rounded-xl font-bold">🐢 Slower</button>
                <button onMouseDown={() => setShowHint(true)} onMouseUp={() => setShowHint(false)} className="px-4 bg-slate-100 text-slate-600 rounded-xl font-bold border-2 border-slate-200">👁️ Peek</button>
              </div>

              {showHint && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-yellow-800 font-mono text-center mb-2">
                   {targetText}
                </div>
              )}

              {/* FEEDBACK HIGHLIGHTER */}
              {feedback.length > 0 && (
                <div className="p-4 bg-slate-100 rounded-xl flex flex-wrap gap-2 justify-center border-2 border-slate-200">
                  {feedback.map((item, i) => (
                    <span key={i} className={`px-2 py-1 rounded font-bold ${item.status === 'correct' ? 'text-emerald-600' : 'text-rose-600 bg-rose-50 border border-rose-200 animate-pulse'}`}>
                      {item.word}
                    </span>
                  ))}
                </div>
              )}

              <textarea value={userInput} onKeyDown={playKeySound} onChange={(e) => setUserInput(e.target.value)} autoFocus className="w-full p-6 h-40 text-xl border-3 border-indigo-100 rounded-2xl outline-none bg-slate-50 font-mono" placeholder="Type here..." />
              <button onClick={checkWork} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xl shadow-xl">Verify Coordinates 🎯</button>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="text-center py-10 space-y-8">
              <div className="text-8xl animate-bounce">🥇</div>
              <button onClick={() => { setPhase('setup'); setUserInput(''); setTargetText(''); setTopic(''); setFeedback([]); }} className="px-10 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg">New Mission</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}