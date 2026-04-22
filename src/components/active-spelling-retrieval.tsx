"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function ActiveSpellingRetrieval() {
  const [selectedTopic, setSelectedTopic] = useState('Soccer');
  const [activeTopic, setActiveTopic] = useState('');
  const [targetText, setTargetText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState('setup'); 
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{word: string, target: string, status: 'correct' | 'error' | 'missing'}[]>([]);
  const [mistakeBank, setMistakeBank] = useState<string[]>([]); // Memory for next round
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [wpm, setWpm] = useState(0);
  
  const startTime = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const rockyQuotes = [
    "Yo Adrian, I did it!",
    "Going one more round when you don't think you can, that's what makes the difference.",
    "Every champion was once a contender who refused to give up.",
    "It ain't about how hard you hit. It's about how hard you can get hit and keep moving forward.",
    "You're gonna eat lightning and you're gonna crap thunder!",
    "Win, Rocky, Win!",
    "There is no 'tomorrow'!",
    "Cut me, Mick!",
    "To beat the guy, you gotta out-eat him. You gotta out-sleep him.",
    "Get up, you son of a b!@#$, 'cause Mickey loves ya!"
  ];

  const rockySpeak = (text: string, rate: number = 0.6) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.1; // Deep gravel
      utterance.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const deepVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David'));
      if (deepVoice) utterance.voice = deepVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playBell = () => {
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const fetchContent = async (isNewSession: boolean = false) => {
    setLoading(true);
    playBell();
    setUserInput('');
    setFeedback([]);
    setShowHint(false);
    startTime.current = null;

    const currentTopic = isNewSession ? selectedTopic : activeTopic;
    if (isNewSession) setActiveTopic(currentTopic);

    // AI Logic: Inject previous mistakes into the prompt
    const mistakeContext = mistakeBank.length > 0 ? `. Include these specific words: ${mistakeBank.join(', ')}` : "";
    
    try {
      const res = await fetch(`https://son-spelling-backend.onrender.com/generate?mode=sentence&level=1&topic=${encodeURIComponent(currentTopic + mistakeContext)}`);
      const data = await res.json();
      if (data.text) {
        setTargetText(data.text);
        setPhase('study');
        // Requirement 1: Auto-read the sentence first time
        setTimeout(() => rockySpeak(data.text), 1000);
      }
    } catch (err) {
      rockySpeak("Mick, the signal's gone!");
    } finally {
      setLoading(false);
    }
  };

  const checkWork = () => {
    const clean = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/);
    const targetWords = clean(targetText);
    const userWords = clean(userInput);
    const results: typeof feedback = [];
    const newMistakes: string[] = [];

    targetWords.forEach((targetW, i) => {
      const userW = userWords[i] || "";
      if (userW === targetW) {
        results.push({ word: userW, target: targetW, status: 'correct' });
      } else {
        results.push({ word: userW, target: targetW, status: 'error' });
        newMistakes.push(targetW);
      }
    });

    setFeedback(results);
    setMistakeBank(newMistakes); // Save for next round

    if (newMistakes.length === 0) {
      setWordsCompleted(prev => prev + targetWords.length);
      setPhase('feedback');
      rockySpeak(rockyQuotes[Math.floor(Math.random() * rockyQuotes.length)]);
    } else {
      // Requirement 2: If wrong, stay on screen and prompt
      rockySpeak("Pay attention to the blueprints, kid. You missed some words.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 font-sans text-white uppercase overflow-x-hidden">
      
      {/* HUD DASHBOARD */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-3xl border-b-8 border-rose-600 text-center">
          <p className="text-[10px] font-black text-rose-400 tracking-widest">Training Goal</p>
          <div className="text-5xl font-black">{wordsCompleted} / 100</div>
        </div>
        <div className="bg-slate-800 p-6 rounded-3xl border-b-8 border-orange-500 text-center flex flex-col justify-center">
          <p className="text-[10px] font-black text-orange-400 tracking-widest">Punch Speed</p>
          <div className="text-4xl font-black">{wpm} WPM</div>
        </div>
        <button onClick={() => setPhase('setup')} className="bg-rose-600 hover:bg-rose-700 text-white rounded-3xl font-black text-xl shadow-lg transition">Change Topic 🛠</button>
      </div>

      <div className="max-w-6xl mx-auto bg-slate-800 shadow-2xl rounded-[60px] border-4 border-slate-700 min-h-[700px] flex flex-col relative overflow-hidden">
        
        {/* UPPER RING */}
        <div className="bg-rose-600 p-6 flex justify-between items-center px-12 shadow-lg">
          <span className="font-black italic text-3xl tracking-tighter">ROCKY TRAINING CAMP</span>
          <span className="bg-black/20 px-4 py-1 rounded-full text-sm font-bold">{activeTopic}</span>
        </div>

        <div className="p-12 flex-grow flex flex-col">
          
          {phase === 'setup' && (
            <div className="max-w-xl mx-auto w-full space-y-10 py-16 text-center">
              <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-full p-10 text-4xl border-4 border-slate-600 rounded-[40px] font-black bg-slate-900 text-white outline-none focus:border-rose-500 cursor-pointer">
                {["Soccer", "Basketball", "Sneakers", "Technology", "Space", "Science", "Geography", "History", "Video Games"].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button onClick={() => fetchContent(true)} className="w-full py-10 bg-rose-600 rounded-[40px] font-black text-5xl shadow-2xl hover:scale-105 transition">RING THE BELL 🔔</button>
            </div>
          )}

          {phase === 'study' && (
            <div className="flex-grow flex flex-col justify-center space-y-12 animate-in zoom-in-95 duration-500">
              <div className="p-20 bg-black text-white rounded-[80px] text-7xl font-mono text-center border-[15px] border-slate-700 shadow-2xl leading-tight">
                {targetText}
              </div>
              <button onClick={() => { setPhase('typing'); rockySpeak("Go get 'em!"); }} className="max-w-2xl mx-auto w-full py-8 bg-rose-600 text-white rounded-[40px] font-black text-4xl shadow-2xl">GO THE DISTANCE 🥊</button>
            </div>
          )}

          {phase === 'typing' && (
            <div className="flex-grow flex flex-col space-y-6">
              
              {/* FEEDBACK OVERLAY (Requirement 2: Highlight mistakes here) */}
              {feedback.length > 0 && (
                <div className="p-8 bg-black/40 rounded-[40px] border-2 border-slate-600 flex flex-wrap gap-6 justify-center">
                  {feedback.map((f, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className={`${f.status === 'correct' ? 'text-emerald-500' : 'text-rose-500 line-through'} text-4xl font-mono font-black`}>
                        {f.word || "___"}
                      </span>
                      {f.status !== 'correct' && (
                        <span className="text-indigo-400 font-mono text-xl mt-1">{f.target.toUpperCase().split('').join('-')}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button onMouseDown={(e) => { e.preventDefault(); rockySpeak(targetText); }} className="px-12 py-4 bg-indigo-600 rounded-2xl font-black text-sm">🔊 Repeat</button>
                <button onMouseDown={(e) => { e.preventDefault(); setShowHint(true); }} onMouseUp={() => setShowHint(false)} onMouseLeave={() => setShowHint(false)} className="px-12 py-4 bg-slate-700 rounded-2xl font-black text-sm active:bg-rose-500">👁️ Hold Peek</button>
              </div>

              <textarea 
                ref={inputRef} value={userInput} onChange={(e) => { setUserInput(e.target.value); if(feedback.length > 0) setFeedback([]); }} 
                autoFocus spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none"
                className="flex-grow w-full p-12 text-6xl font-mono border-4 border-slate-700 rounded-[60px] outline-none bg-black/30 resize-none font-black text-rose-500 focus:border-rose-500 transition-all shadow-inner" 
              />
              
              <div className="flex gap-4">
                <button onClick={checkWork} className="flex-[2] py-10 bg-indigo-600 rounded-[40px] font-black text-4xl shadow-2xl">CHECK SCORE 🎯</button>
                {feedback.length > 0 && <button onClick={() => fetchContent(false)} className="flex-1 py-10 bg-rose-600 rounded-[40px] font-black text-2xl shadow-2xl">SKIP ROUND 🚀</button>}
              </div>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="flex-grow flex flex-col items-center justify-center space-y-12">
              <div className="text-[250px] animate-bounce drop-shadow-[0_0_50px_rgba(225,29,72,0.8)]">🏆</div>
              <h3 className="text-6xl font-black text-rose-500 italic">NEXT ROUND, KID!</h3>
              <button onClick={() => fetchContent(false)} className="px-24 py-12 bg-rose-600 rounded-full font-black text-5xl shadow-2xl hover:scale-110 transition">CONTINUE 🥊</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}