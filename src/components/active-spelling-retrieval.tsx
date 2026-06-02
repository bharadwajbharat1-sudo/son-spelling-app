"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = 'setup' | 'loading' | 'study' | 'typing' | 'result' | 'builder';
type DiffStatus = 'correct' | 'wrong' | 'current';
type WordResult = {
  target: string; typed: string; correct: boolean;
  letterDiff: { char: string; status: 'correct'|'wrong'|'missing'|'extra' }[];
};

// ── Constants ──────────────────────────────────────────────────────────────────
const API = 'https://son-spelling-backend.onrender.com';
const DRILL_AT = 3;
const LEVELS = [0,100,250,450,700,1000,1400,1900,2500,3200,4000];
const TOPICS = ["Soccer","Basketball","Sneakers","Technology","Space","Science","Geography","History","Video Games","Animals","Food"];

const QW = ["YO ADRIAN — YOU DID IT!","PERFECT. Clean. Sharp. Like a machine.","That's a champion right there.","BEAUTIFUL! Mickey is proud of ya!","Flawless! The gym is yours tonight, champ.","Now THAT'S how you fight!"];
const QL = ["Pay attention to the blueprints, kid.","Sloppy. A champion doesn't let letters beat him.","Heart's there but fingers ain't listening. Again!","Get up! You can do better. Fight back!","Focus. Hands follow brain. Brain follow letters."];
const QS = ["Read it. Say it loud. Burn it in your brain.","Every letter matters. Study it like a blueprint.","Champions know their material. Learn this cold.","Look at every word. Then fight from memory."];
const QB = ["This word's been beating you up. End that today.","I've watched this word knock you down. No more.","We don't run from hard words. We drill 'em til they're easy."];

// ── Voice ──────────────────────────────────────────────────────────────────────
function getVoice() {
  const vs = window.speechSynthesis.getVoices();
  const picks = ['Google UK English Male','Microsoft David - English','David','Daniel','Alex'];
  for (const p of picks) { const v = vs.find(x => x.name.includes(p)); if (v) return v; }
  return vs.find(v => v.lang.startsWith('en') && /male/i.test(v.name)) ?? vs.find(v => v.lang.startsWith('en')) ?? null;
}
function say(text: string, rate=0.72, pitch=0.05) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate; u.pitch = pitch; u.volume = 1;
  const v = getVoice(); if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}
function spellOut(word: string) { say(`${word}. ${word.split('').join(', ')}. ${word}.`, 0.48, 0.05); }

// ── Helpers ────────────────────────────────────────────────────────────────────
function rand<T>(a: T[]): T { return a[Math.floor(Math.random()*a.length)]; }
function cw(s: string) { return s.toLowerCase().replace(/[^a-z0-9\s]/gi,'').trim().split(/\s+/).filter(Boolean); }
function syllabify(w: string): string[] {
  const vowels='aeiouy', word=w.toLowerCase(); let cur=''; const parts:string[]=[];
  for(let i=0;i<word.length;i++){
    cur+=word[i];
    if(vowels.includes(word[i])&&i+1<word.length&&!vowels.includes(word[i+1])&&i+2<word.length&&vowels.includes(word[i+2])&&cur.length>1){parts.push(cur);cur='';}
    else if(vowels.includes(word[i])&&i===word.length-1){parts.push(cur);cur='';}
  }
  if(cur){if(parts.length)parts[parts.length-1]+=cur;else parts.push(cur);}
  return parts.length>1?parts:[w];
}
function diffWord(target:string,typed:string):WordResult['letterDiff'] {
  // Compare lowercase so capitalisation never counts as wrong — spelling only
  const tl=target.toLowerCase().replace(/[^a-z0-9]/g,'');
  const ul=typed.toLowerCase().replace(/[^a-z0-9]/g,'');
  const d:WordResult['letterDiff']=[];
  for(let i=0;i<Math.max(tl.length,ul.length);i++){
    const t=tl[i]??'',u=ul[i]??'';
    if(!t) d.push({char:u,status:'extra'});
    else if(!u) d.push({char:t,status:'missing'});
    else if(t===u) d.push({char:u,status:'correct'});
    else d.push({char:u,status:'wrong'});
  }
  return d;
}
function persist(data:object){try{localStorage.setItem('rsc4',JSON.stringify(data));}catch{}}
function hydrate(){try{return JSON.parse(localStorage.getItem('rsc4')||'{}');}catch{return {};}}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RockySpelling() {
  const p = useRef(hydrate());
  const [xp,setXp]=useState<number>(p.current.xp??0);
  const [level,setLevel]=useState<number>(p.current.level??1);
  const [streak,setStreak]=useState<number>(p.current.streak??0);
  const [mb,setMb]=useState<Record<string,number>>(p.current.mb??{});
  const [grad,setGrad]=useState<Record<string,boolean>>(p.current.grad??{});
  const [bestWpm,setBestWpm]=useState<number>(p.current.bestWpm??0);
  const [totalWords,setTotalWords]=useState<number>(p.current.totalWords??0);

  const [phase,setPhase]=useState<Phase>('setup');
  const [topic,setTopic]=useState('Soccer');
  const [activeTopic,setActiveTopic]=useState('');
  const [round,setRound]=useState(0);
  const [target,setTarget]=useState('');
  const [input,setInput]=useState('');
  const [results,setResults]=useState<WordResult[]>([]);
  const [wpm,setWpm]=useState(0);
  const [showPeek,setShowPeek]=useState(false);
  const [quote,setQuote]=useState('');
  const [xpFlash,setXpFlash]=useState(0);
  const [combo,setCombo]=useState(0);
  const [shake,setShake]=useState(false);
  const [celebration,setCelebration]=useState(false);

  // Word builder
  const [wbQueue,setWbQueue]=useState<string[]>([]);
  const [wbIdx,setWbIdx]=useState(0);
  const [wbWord,setWbWord]=useState('');
  const [wbTrials,setWbTrials]=useState<boolean[]>([]);
  const [wbInput,setWbInput]=useState('');
  const [wbState,setWbState]=useState<'idle'|'ok'|'bad'>('idle');
  const [wbGraduating,setWbGraduating]=useState(false);

  const t0 = useRef<number|null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wbRef = useRef<HTMLInputElement>(null);

  // Streak logic
  useEffect(()=>{
    const h=hydrate(),today=new Date().toDateString();
    if(h.lastDate!==today){
      const yd=new Date();yd.setDate(yd.getDate()-1);
      setStreak(h.lastDate===yd.toDateString()?(h.streak??0)+1:1);
    }
    window.speechSynthesis?.getVoices();
    window.speechSynthesis && (window.speechSynthesis.onvoiceschanged=()=>{});
  },[]);

  useEffect(()=>{
    persist({xp,level,streak,mb,grad,bestWpm,totalWords,lastDate:new Date().toDateString()});
  },[xp,level,streak,mb,grad,bestWpm,totalWords]);

  const drills = useCallback(()=>
    Object.entries(mb).filter(([w,c])=>c>=DRILL_AT&&!grad[w]).sort((a,b)=>b[1]-a[1]).map(([w])=>w)
  ,[mb,grad]);

  const addXP = useCallback((n:number)=>{
    setXp(prev=>{
      const next=prev+n;
      setXpFlash(n);
      setTimeout(()=>setXpFlash(0),1200);
      const ceil=LEVELS[level]??level*600;
      if(next>=ceil&&level<10){
        setLevel(l=>l+1);
        setTimeout(()=>say(`LEVEL ${level+1}! Moving up, champ!`),400);
      }
      return next;
    });
  },[level]);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  async function fetchRound(t:string){
    setPhase('loading'); setInput(''); setResults([]); setShowPeek(false); t0.current=null;
    const fw=drills().slice(0,3);
    const fp=fw.length?`&focus_words=${encodeURIComponent(fw.join(','))}`:'';
    try{
      const r=await fetch(`${API}/generate?mode=sentence&level=1&topic=${encodeURIComponent(t)}${fp}`);
      const d=await r.json();
      if(d.text){setTarget(d.text.trim());setQuote(rand(QS));setPhase('study');setTimeout(()=>say(d.text.trim()),600);}
    }catch{setQuote("Mick, the signal's gone! Check your internet.");setPhase('study');}
  }

  function startSession(){setActiveTopic(topic);setRound(r=>r+1);fetchRound(topic);}

  function goType(){setPhase('typing');t0.current=Date.now();say("Go get 'em!",0.9,0.1);setTimeout(()=>taRef.current?.focus(),80);}

  // ── Live diff — ONLY typed words, never reveals target ───────────────────────
  function liveDiff():{typed:string;status:DiffStatus}[]{
    if(!input.trim()) return [];
    const tw=cw(target);
    const raw=input.toLowerCase().split(/\s+/);
    const out:{typed:string;status:DiffStatus}[]=[];
    for(let i=0;i<raw.length&&i<tw.length;i++){
      const u=raw[i]??'';
      const isCurrent=i===raw.length-1&&!input.endsWith(' ');
      if(isCurrent) out.push({typed:u,status:'current'});          // show only what user typed, not target word
      else out.push({typed:tw[i],status:u===tw[i]?'correct':'wrong'});
    }
    return out;
  }

  // ── Check ────────────────────────────────────────────────────────────────────
  function check(){
    const tw=cw(target),uw=cw(input);
    const elapsed=t0.current?(Date.now()-t0.current)/60000:1;
    const calcWpm=Math.round((input.trim().length/5)/elapsed);
    setWpm(calcWpm);
    if(calcWpm>bestWpm)setBestWpm(calcWpm);

    const res:WordResult[]=tw.map((t,i)=>{
      const u=uw[i]??'';
      return{target:t,typed:u,correct:u===t,letterDiff:diffWord(t,u)};
    });
    setResults(res);
    const wrong=res.filter(r=>!r.correct).map(r=>r.target);
    if(wrong.length){
      const newMb={...mb};wrong.forEach(w=>{newMb[w]=(newMb[w]??0)+1;});setMb(newMb);
      setCombo(0);setShake(true);setTimeout(()=>setShake(false),500);
      const q=rand(QL);setQuote(q);addXP(5);setPhase('result');setTimeout(()=>say(q),150);
    } else {
      const newCombo=combo+1;setCombo(newCombo);
      setTotalWords(t=>t+tw.length);
      const bonus=20+(calcWpm>30?10:0)+(calcWpm>50?15:0)+(newCombo>1?newCombo*5:0);
      addXP(bonus);setCelebration(true);setTimeout(()=>setCelebration(false),2000);
      const q=rand(QW);setQuote(q);setPhase('result');setTimeout(()=>say(q),150);
    }
  }

  // ── Builder ──────────────────────────────────────────────────────────────────
  function launchBuilder(words?:string[]){
    const q=words??drills(); if(!q.length) return;
    setWbQueue(q);setWbIdx(0);doBuilderWord(q[0]);
  }
  function doBuilderWord(word:string){
    setWbWord(word);setWbTrials([]);setWbInput('');setWbState('idle');setWbGraduating(false);
    setQuote(rand(QB));setPhase('builder');
    setTimeout(()=>{spellOut(word);wbRef.current?.focus();},600);
  }
  function submitTrial(){
    const typed=wbInput.trim().toLowerCase();
    const ok=typed===wbWord;
    setWbState(ok?'ok':'bad');
    const nt=[...wbTrials,ok];setWbTrials(nt);
    if(!ok) say(`No no no — it's ${wbWord}. Again!`,0.65);
    setTimeout(()=>{
      setWbInput('');setWbState('idle');
      const last3=nt.slice(-3);
      if(nt.length>=3&&last3.every(Boolean)){
        setWbGraduating(true);
        setGrad(g=>({...g,[wbWord]:true}));addXP(35);
        say(`${wbWord} — GRADUATED! You owned it, champ!`,0.7);
        setTimeout(nextBuilderWord,2400);
      } else if(nt.length>=7){
        say(`We'll come back to ${wbWord}. Keep fighting!`,0.65);
        setTimeout(nextBuilderWord,1600);
      } else {
        if(!ok) setTimeout(()=>spellOut(wbWord),300);
        wbRef.current?.focus();
      }
    },650);
  }
  function nextBuilderWord(){
    const ni=wbIdx+1;
    if(ni<wbQueue.length){setWbIdx(ni);doBuilderWord(wbQueue[ni]);}
    else setPhase('setup');
  }

  const xpBase=LEVELS[level-1]??0;
  const xpCeil=LEVELS[level]??level*600;
  const xpPct=Math.min(100,((xp-xpBase)/(xpCeil-xpBase))*100);
  const drillWords=drills();
  const ld=liveDiff();
  const perfectRound=results.length>0&&results.every(r=>r.correct);

  // ════════════════════════════════════════════════════════════════════════════
  return(
  <div style={{minHeight:'100vh',background:'#09050f',fontFamily:"'Oswald','Impact',sans-serif",color:'#fff',padding:'12px',overflowX:'hidden'}}>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Share+Tech+Mono&display=swap');
    *{box-sizing:border-box;}
    body{background:#09050f;}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
    @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
    @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes xpPop{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-40px);opacity:0}}
    @keyframes glow{0%,100%{box-shadow:0 0 10px rgba(255,215,0,0.3)}50%{box-shadow:0 0 30px rgba(255,215,0,0.7)}}
    @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
    @keyframes letterPop{0%{transform:scale(0) rotate(-10deg);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
    @keyframes ringFlash{0%,100%{opacity:0}50%{opacity:1}}
    @keyframes comboShine{0%{background-position:200%}100%{background-position:-200%}}
    .btn{font-family:'Oswald',sans-serif;font-weight:700;letter-spacing:1.5px;border:none;cursor:pointer;transition:transform 0.08s,filter 0.1s;text-transform:uppercase;}
    .btn:active{transform:scale(0.93)!important;}
    .btn:hover{filter:brightness(1.15);}
    textarea,input[type=text]{font-family:'Share Tech Mono',monospace!important;letter-spacing:2px;}
    .correct-chip{animation:slideUp 0.2s ease forwards;}
    .wrong-chip{animation:shake 0.3s ease;}
    select{font-family:'Oswald',sans-serif!important;}
  `}</style>

  {/* ── TOP HUD ─────────────────────────────────────────────────────────────── */}
  <div style={{maxWidth:680,margin:'0 auto 10px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
    {[
      {label:'WORDS',val:totalWords},
      {label:'WPM',val:wpm||'—',gold:wpm>0&&wpm>=bestWpm},
      {label:'BEST',val:bestWpm||'—'},
      {label:'COMBO',val:combo>1?`×${combo}`:'—',gold:combo>2},
      {label:'🔥',val:`${streak}d`},
    ].map(({label,val,gold})=>(
      <div key={label} style={{
        background:'linear-gradient(160deg,#12071e,#1a0a2e)',
        border:`1px solid ${gold?'#ffd700':'#2a1545'}`,
        borderRadius:8,padding:'7px 4px',textAlign:'center',
        boxShadow:gold?'0 0 12px rgba(255,215,0,0.25)':'none',
        transition:'all 0.3s',
      }}>
        <div style={{fontSize:9,color:'#7040a0',letterSpacing:2,marginBottom:2}}>{label}</div>
        <div style={{fontSize:20,fontWeight:700,color:gold?'#ffd700':'#e0d0ff',lineHeight:1}}>{val}</div>
      </div>
    ))}
  </div>

  {/* XP Bar */}
  <div style={{maxWidth:680,margin:'0 auto 10px',position:'relative'}}>
    <div style={{background:'#12071e',borderRadius:6,height:10,overflow:'hidden',border:'1px solid #2a1545'}}>
      <div style={{
        width:`${xpPct}%`,height:'100%',borderRadius:6,
        background:'linear-gradient(90deg,#6600cc,#aa00ff,#ff6600,#ffd700)',
        backgroundSize:'300% 100%',
        animation:'comboShine 3s linear infinite',
        transition:'width 0.5s ease',
        boxShadow:'0 0 8px rgba(170,0,255,0.5)',
      }}/>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#4a2080',marginTop:3}}>
      <span>LV{level}</span>
      <span style={{position:'relative'}}>
        {xp-xpBase} / {xpCeil-xpBase} XP
        {xpFlash>0&&(
          <span style={{
            position:'absolute',bottom:'100%',right:0,
            color:'#ffd700',fontWeight:700,fontSize:14,
            animation:'xpPop 1.2s ease forwards',whiteSpace:'nowrap',
          }}>+{xpFlash} XP</span>
        )}
      </span>
      <span>LV{level+1}</span>
    </div>
  </div>

  {/* ── RING ────────────────────────────────────────────────────────────────── */}
  <div style={{
    maxWidth:680,margin:'0 auto',
    background:'linear-gradient(180deg,#0f0520 0%,#09050f 100%)',
    borderRadius:12,
    border:'1px solid #2a1545',
    overflow:'hidden',
    position:'relative',
    minHeight:480,
    boxShadow:'0 0 40px rgba(100,0,200,0.2)',
  }}>
    {/* Scanline effect */}
    <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1,overflow:'hidden',borderRadius:12}}>
      <div style={{
        position:'absolute',left:0,right:0,height:'2px',
        background:'linear-gradient(90deg,transparent,rgba(170,0,255,0.08),transparent)',
        animation:'scanline 4s linear infinite',
      }}/>
    </div>

    {/* Ring rope accents */}
    {[0,33,66,100].map(pct=>(
      <div key={pct} style={{position:'absolute',top:0,bottom:0,left:`${pct}%`,width:1,
        background:'linear-gradient(180deg,transparent,rgba(255,215,0,0.06),transparent)',pointerEvents:'none'}}/>
    ))}

    {/* Header */}
    <div style={{
      background:'linear-gradient(135deg,#1a0030 0%,#6600cc 50%,#1a0030 100%)',
      padding:'12px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',
      borderBottom:'2px solid #ffd700',position:'relative',zIndex:2,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:20}}>🥊</span>
        <span style={{fontSize:16,fontWeight:700,letterSpacing:3,textShadow:'0 0 20px rgba(255,215,0,0.5)'}}>
          ROCKY TRAINING CAMP
        </span>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        {activeTopic&&<span style={{background:'rgba(255,215,0,0.15)',color:'#ffd700',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,border:'1px solid rgba(255,215,0,0.3)'}}>{activeTopic.toUpperCase()}</span>}
        {phase!=='setup'&&<button className="btn" onClick={()=>setPhase('setup')} style={{background:'rgba(255,255,255,0.08)',color:'#aaa',borderRadius:6,padding:'3px 10px',fontSize:11,border:'1px solid rgba(255,255,255,0.1)'}}>⚙ MENU</button>}
      </div>
    </div>

    <div style={{padding:'14px 16px',position:'relative',zIndex:2}}>

    {/* ════════════════════════════════════════════════════════════════════════ */}
    {/* SETUP */}
    {phase==='setup'&&(
      <div style={{display:'flex',flexDirection:'column',gap:14,paddingTop:4}}>
        {/* Trophy display */}
        <div style={{textAlign:'center',padding:'10px 0'}}>
          <div style={{fontSize:52,lineHeight:1,filter:'drop-shadow(0 0 20px rgba(255,215,0,0.5))'}}>🏆</div>
          <div style={{fontSize:11,color:'#7040a0',letterSpacing:3,marginTop:6}}>CHOOSE YOUR BATTLE</div>
        </div>

        <select value={topic} onChange={e=>setTopic(e.target.value)} style={{
          fontSize:17,fontWeight:700,background:'#12071e',color:'#ffd700',
          border:'2px solid #4a2080',borderRadius:8,padding:'12px 14px',width:'100%',cursor:'pointer',outline:'none',
        }}>
          {TOPICS.map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>

        {drillWords.length>0&&(
          <div style={{background:'#1a0010',border:'1px solid #8b0000',borderRadius:8,padding:12}}>
            <div style={{fontSize:10,color:'#e74c3c',letterSpacing:2,marginBottom:8}}>⚠ WORDS THAT NEED DRILLING</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
              {drillWords.map(w=>(
                <span key={w} style={{background:'#2d0010',color:'#ff6b6b',borderRadius:20,padding:'3px 10px',fontFamily:'Share Tech Mono',fontSize:12,border:'1px solid #5c0020'}}>
                  {w} <span style={{color:'#ff3333',fontSize:10}}>×{mb[w]}</span>
                </span>
              ))}
            </div>
            <button className="btn" onClick={()=>launchBuilder()} style={{
              width:'100%',background:'linear-gradient(135deg,#5c0000,#a00000)',color:'#ffd700',
              borderRadius:8,padding:10,fontSize:13,
              boxShadow:'0 0 15px rgba(160,0,0,0.4)',
            }}>🎯 DRILL WEAK WORDS FIRST</button>
          </div>
        )}

        {combo>0&&<div style={{
          background:'linear-gradient(135deg,#1a0030,#2d0050)',
          border:'1px solid #ffd700',borderRadius:8,padding:'10px 14px',
          display:'flex',justifyContent:'space-between',alignItems:'center',
        }}>
          <span style={{fontSize:12,color:'#aaa'}}>CURRENT COMBO STREAK</span>
          <span style={{fontSize:24,fontWeight:700,color:'#ffd700'}}>×{combo} 🔥</span>
        </div>}

        <button className="btn" onClick={startSession} style={{
          background:'linear-gradient(135deg,#4400aa,#8800ff)',
          color:'#ffd700',border:'2px solid #ffd700',
          borderRadius:8,padding:'16px',fontSize:22,letterSpacing:3,
          boxShadow:'0 0 30px rgba(136,0,255,0.4)',
          animation:phase==='setup'?'glow 2s ease infinite':'none',
        }}>🔔 RING THE BELL</button>

        {/* Stats summary */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,opacity:0.7}}>
          {[
            {l:'TOTAL WORDS',v:totalWords},
            {l:'BEST WPM',v:bestWpm||'—'},
            {l:'LEVEL',v:level},
          ].map(({l,v})=>(
            <div key={l} style={{background:'#12071e',border:'1px solid #2a1545',borderRadius:6,padding:'8px 4px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#4a2080',letterSpacing:1,marginBottom:2}}>{l}</div>
              <div style={{fontSize:18,fontWeight:700,color:'#e0d0ff'}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* LOADING */}
    {phase==='loading'&&(
      <div style={{textAlign:'center',padding:'80px 20px'}}>
        <div style={{fontSize:50,animation:'pulse 0.8s ease infinite'}}>🥊</div>
        <div style={{color:'#7040a0',fontSize:14,letterSpacing:3,marginTop:16}}>ROUND {round+1} LOADING...</div>
        <div style={{color:'#3a1060',fontSize:11,marginTop:8,letterSpacing:1}}>AI IS BUILDING YOUR SENTENCE</div>
      </div>
    )}

    {/* ════════════════════════════════════════════════════════════════════════ */}
    {/* STUDY */}
    {phase==='study'&&(
      <div style={{display:'flex',flexDirection:'column',gap:12,animation:'slideUp 0.3s ease'}}>
        <MBox quote={quote}/>

        {/* Round badge */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:'#7040a0',letterSpacing:2}}>ROUND {round}</span>
          {combo>1&&<span style={{background:'rgba(255,215,0,0.1)',color:'#ffd700',padding:'3px 10px',borderRadius:20,fontSize:12,border:'1px solid rgba(255,215,0,0.3)'}}>🔥 ×{combo} COMBO</span>}
        </div>

        {/* Sentence */}
        <div style={{
          background:'#000',border:'2px solid #2a1545',borderRadius:10,
          padding:'20px 16px',fontFamily:'Share Tech Mono, monospace',
          fontSize:22,color:'#fff',textAlign:'center',lineHeight:1.6,
          letterSpacing:1,boxShadow:'inset 0 0 30px rgba(100,0,200,0.1)',
          textShadow:'0 0 15px rgba(200,150,255,0.3)',
        }}>
          {target}
        </div>
        <div style={{fontSize:11,color:'#4a2080',textAlign:'center',letterSpacing:1}}>
          READ IT ALOUD · SAY EACH WORD · THEN FIGHT FROM MEMORY
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={()=>say(target)} style={{
            flex:1,background:'#1a0a2e',color:'#9060c0',border:'1px solid #2a1545',
            borderRadius:8,padding:'10px',fontSize:13,
          }}>🔊 HEAR IT</button>
          <button className="btn" onClick={goType} style={{
            flex:2,background:'linear-gradient(135deg,#4400aa,#8800ff)',color:'#ffd700',
            border:'2px solid rgba(255,215,0,0.5)',borderRadius:8,padding:'12px',fontSize:16,letterSpacing:2,
            boxShadow:'0 0 20px rgba(136,0,255,0.3)',
          }}>🥊 I'M READY — FIGHT!</button>
        </div>
      </div>
    )}

    {/* ════════════════════════════════════════════════════════════════════════ */}
    {/* TYPING */}
    {phase==='typing'&&(
      <div style={{display:'flex',flexDirection:'column',gap:10,animation:'slideUp 0.25s ease'}}>

        {/* Hidden sentence — completely invisible until peek, no text content rendered */}
        <div style={{
          background:'#000',border:'2px solid #1a0a2e',borderRadius:8,
          padding:'12px 16px',minHeight:50,position:'relative',
          overflow:'hidden',cursor:'default',
        }}>
          {showPeek?(
            <div style={{fontFamily:'Share Tech Mono',fontSize:16,color:'#fff',textAlign:'center',lineHeight:1.5,letterSpacing:1}}>
              {target}
            </div>
          ):(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:28,gap:8}}>
              <span style={{fontSize:10,color:'#2a1545',letterSpacing:3}}>HOLD PEEK TO REVEAL</span>
              <span style={{display:'flex',gap:3}}>
                {Array(8).fill(0).map((_,i)=>(
                  <span key={i} style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#1a0a2e'}}/>
                ))}
              </span>
            </div>
          )}
        </div>

        {/* Live feedback strip — only shows what user has TYPED, never reveals target */}
        <div style={{
          background:'#0a0518',border:'1px solid #1a0a2e',borderRadius:8,
          padding:'10px 12px',minHeight:42,display:'flex',flexWrap:'wrap',gap:5,alignItems:'center',
        }}>
          {ld.length?(
            ld.map((w,i)=>(
              <span key={i} className={w.status==='correct'?'correct-chip':w.status==='wrong'?'wrong-chip':''}
                style={{
                fontFamily:'Share Tech Mono',fontSize:16,padding:'3px 8px',borderRadius:5,
                letterSpacing:1,transition:'all 0.12s',
                background:w.status==='correct'?'#0a2e18':w.status==='wrong'?'#2e0a10':'#1a1030',
                color:w.status==='correct'?'#00ff88':w.status==='wrong'?'#ff3355':'#ffd700',
                border:`1px solid ${w.status==='correct'?'#00ff44':w.status==='wrong'?'#ff1133':'#ffd700'}`,
                boxShadow:w.status==='correct'?'0 0 8px rgba(0,255,136,0.3)':w.status==='wrong'?'0 0 8px rgba(255,51,85,0.3)':'0 0 8px rgba(255,215,0,0.3)',
              }}>
                {/* Show what they typed — for current word show partial input, for committed show target if correct */}
                {w.status==='current'?w.typed:w.typed}
              </span>
            ))
          ):(
            <span style={{color:'#2a1545',fontSize:12,fontFamily:'Share Tech Mono',letterSpacing:1}}>
              type below · words turn green ✓ or red ✗
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{display:'flex',gap:6}}>
          <button className="btn" onMouseDown={e=>{e.preventDefault();say(target);}} style={{
            background:'#0f0520',color:'#7040a0',border:'1px solid #1a0a2e',
            borderRadius:6,padding:'7px 12px',fontSize:11,letterSpacing:1,
          }}>🔊 REPEAT</button>
          <button className="btn"
            onMouseDown={e=>{e.preventDefault();setShowPeek(true);}}
            onMouseUp={()=>setShowPeek(false)}
            onMouseLeave={()=>setShowPeek(false)}
            onTouchStart={e=>{e.preventDefault();setShowPeek(true);}}
            onTouchEnd={()=>setShowPeek(false)}
            style={{
              background:'#0f0520',color:'#7040a0',border:'1px solid #1a0a2e',
              borderRadius:6,padding:'7px 12px',fontSize:11,letterSpacing:1,
          }}>👁 HOLD PEEK</button>
        </div>

        {/* Input */}
        <textarea ref={taRef} value={input}
          onChange={e=>setInput(e.target.value)}
          onPaste={e=>{e.preventDefault();say("No shortcuts, kid! Type it yourself.",0.8);}}
          onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)check();}}
          autoFocus spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="none"
          placeholder="type the sentence here..."
          style={{
            background:'#050210',border:'2px solid #2a1545',borderRadius:8,
            padding:'14px',resize:'none',height:90,width:'100%',outline:'none',
            fontSize:20,color:'#00ccff',letterSpacing:1,lineHeight:1.5,
            caretColor:'#ffd700',transition:'border-color 0.2s',
          }}
          onFocus={e=>e.target.style.borderColor='#8800ff'}
          onBlur={e=>e.target.style.borderColor='#2a1545'}
        />

        <button className="btn" onClick={check} style={{
          background:'linear-gradient(135deg,#000080,#0044cc)',color:'#fff',
          border:'2px solid #4488ff',borderRadius:8,padding:'14px',fontSize:18,letterSpacing:2,
          boxShadow:'0 0 20px rgba(0,68,204,0.4)',
        }}>
          CHECK SCORE 🎯 <span style={{fontSize:11,opacity:0.5,fontWeight:400}}>(Ctrl+Enter)</span>
        </button>
      </div>
    )}

    {/* ════════════════════════════════════════════════════════════════════════ */}
    {/* RESULT */}
    {phase==='result'&&(
      <div style={{display:'flex',flexDirection:'column',gap:12,animation:'slideUp 0.3s ease'}}>
        {/* Hero */}
        <div style={{textAlign:'center',padding:'6px 0'}}>
          {celebration?(
            <div style={{fontSize:60,animation:'pulse 0.4s ease infinite',filter:'drop-shadow(0 0 20px rgba(255,215,0,0.6))'}}>🏆</div>
          ):(
            <div style={{fontSize:48,animation:shake?'shake 0.4s ease':'none'}}>😤</div>
          )}
          <div style={{fontSize:22,fontWeight:700,letterSpacing:3,marginTop:4,
            color:perfectRound?'#ffd700':'#ff3355',
            textShadow:perfectRound?'0 0 20px rgba(255,215,0,0.5)':'0 0 15px rgba(255,51,85,0.4)',
          }}>
            {perfectRound?'PERFECT ROUND!':'FIGHT HARDER!'}
          </div>
          {combo>1&&perfectRound&&(
            <div style={{fontSize:14,color:'#ff9900',letterSpacing:2,marginTop:4}}>🔥 ×{combo} COMBO BONUS!</div>
          )}
        </div>

        <MBox quote={quote}/>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
          {[
            {l:'ACCURACY',v:`${Math.round((results.filter(r=>r.correct).length/Math.max(1,results.length))*100)}%`,good:perfectRound},
            {l:'WPM',v:wpm||'—',good:wpm>0},
            {l:'XP',v:`+${perfectRound?20+(wpm>30?10:0)+(wpm>50?15:0)+(combo>1?combo*5:0):5}`,good:true},
          ].map(({l,v,good})=>(
            <div key={l} style={{background:'#0f0520',border:`1px solid ${good?'#2a1545':'#1a0520'}`,borderRadius:8,padding:'8px 4px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#4a2080',letterSpacing:1,marginBottom:2}}>{l}</div>
              <div style={{fontSize:20,fontWeight:700,color:good?'#ffd700':'#ff3355'}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Word breakdown — the KEY feedback area */}
        <div style={{background:'#060312',border:'1px solid #1a0a2e',borderRadius:8,padding:'10px 12px'}}>
          <div style={{fontSize:10,color:'#3a1060',letterSpacing:2,marginBottom:8}}>WORD BREAKDOWN</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
            {results.map((r,i)=>(
              <div key={i} className={r.correct?'correct-chip':'wrong-chip'} style={{
                background:r.correct?'#071c0e':'#1c0608',
                border:`1px solid ${r.correct?'#00aa44':'#aa0022'}`,
                borderRadius:6,padding:'7px 10px',minWidth:50,
                boxShadow:r.correct?'0 0 8px rgba(0,170,68,0.2)':'0 0 8px rgba(170,0,34,0.2)',
              }}>
                {r.correct?(
                  <div style={{fontFamily:'Share Tech Mono',fontSize:16,color:'#00ff88',letterSpacing:1}}>{r.target}</div>
                ):(
                  <>
                    {/* What he typed, letter by letter */}
                    <div style={{fontFamily:'Share Tech Mono',fontSize:16,letterSpacing:1}}>
                      {r.letterDiff.map((l,j)=>(
                        <span key={j} style={{
                          color:l.status==='correct'?'#00ff88':l.status==='wrong'?'#ff3355':l.status==='extra'?'#ff9900':'#444',
                          textDecoration:l.status==='wrong'?'underline':'none',
                          fontWeight:l.status!=='correct'?700:400,
                          textShadow:l.status==='wrong'?'0 0 6px rgba(255,51,85,0.5)':'none',
                        }}>
                          {l.status==='missing'?'_':l.char}
                        </span>
                      ))}
                    </div>
                    {/* Correct spelling */}
                    <div style={{fontFamily:'Share Tech Mono',fontSize:12,color:'#005533',borderTop:'1px solid #1a0a1a',paddingTop:4,marginTop:3,letterSpacing:1}}>
                      ✓ {r.target}
                    </div>
                    {/* Miss count */}
                    {mb[r.target]>=2&&(
                      <div style={{fontSize:9,color:mb[r.target]>=DRILL_AT?'#ffd700':'#ff4455',letterSpacing:1,marginTop:3}}>
                        MISSED {mb[r.target]}×{mb[r.target]>=DRILL_AT?' → DRILL!':''}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Drill CTA */}
        {drillWords.length>0&&!perfectRound&&(
          <button className="btn" onClick={()=>launchBuilder(drillWords.slice(0,3))} style={{
            background:'linear-gradient(135deg,#3d0000,#8b0000)',color:'#ffd700',
            border:'1px solid rgba(255,215,0,0.4)',borderRadius:8,padding:'10px',fontSize:13,
            boxShadow:'0 0 15px rgba(139,0,0,0.3)',
          }}>🎯 DRILL {Math.min(drillWords.length,3)} WEAK WORD{drillWords.length>1?'S':''} NOW</button>
        )}

        <div style={{display:'flex',gap:8}}>
          {!perfectRound&&(
            <button className="btn" onClick={()=>{setResults([]);setInput('');t0.current=Date.now();setPhase('study');say('Again! You can do this!',0.85);}} style={{
              flex:1,background:'#12071e',color:'#9060c0',border:'1px solid #2a1545',borderRadius:8,padding:'12px',fontSize:14,
            }}>🔁 AGAIN</button>
          )}
          <button className="btn" onClick={()=>{setRound(r=>r+1);fetchRound(activeTopic);}} style={{
            flex:2,background:'linear-gradient(135deg,#4400aa,#8800ff)',color:'#ffd700',
            border:'2px solid rgba(255,215,0,0.4)',borderRadius:8,padding:'14px',fontSize:18,letterSpacing:2,
            boxShadow:'0 0 20px rgba(136,0,255,0.3)',
          }}>{perfectRound?'🥊 NEXT ROUND!':'⏭ SKIP'}</button>
        </div>
      </div>
    )}

    {/* ════════════════════════════════════════════════════════════════════════ */}
    {/* WORD BUILDER */}
    {phase==='builder'&&(
      <div style={{display:'flex',flexDirection:'column',gap:12,animation:'slideUp 0.3s ease'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:'#7040a0',letterSpacing:2}}>WORD BUILDER · {wbIdx+1}/{wbQueue.length}</span>
          <button className="btn" onClick={()=>setPhase('setup')} style={{background:'transparent',border:'1px solid #2a1545',color:'#555',borderRadius:6,padding:'3px 8px',fontSize:11}}>✕</button>
        </div>

        <MBox quote={quote}/>

        {/* The word — BIG */}
        <div style={{
          background:'#000',border:`2px solid ${wbGraduating?'#00ff88':'#ffd700'}`,
          borderRadius:10,padding:'20px 16px',textAlign:'center',
          boxShadow:wbGraduating?'0 0 30px rgba(0,255,136,0.3)':'0 0 20px rgba(255,215,0,0.2)',
          transition:'all 0.4s',
        }}>
          <div style={{
            fontFamily:'Share Tech Mono',fontSize:44,letterSpacing:6,
            color:wbGraduating?'#00ff88':'#ffd700',
            textShadow:wbGraduating?'0 0 20px rgba(0,255,136,0.6)':'0 0 20px rgba(255,215,0,0.4)',
          }}>
            {wbGraduating?'✓ GRADUATED!':wbWord.toUpperCase()}
          </div>

          {/* Syllables */}
          <div style={{display:'flex',justifyContent:'center',gap:4,marginTop:12,flexWrap:'wrap'}}>
            {syllabify(wbWord).map((s,i,arr)=>(
              <React.Fragment key={i}>
                <span style={{
                  fontFamily:'Share Tech Mono',fontSize:15,padding:'4px 10px',
                  background:i===0?'#2d1500':'#0f0520',
                  border:`1px solid ${i===0?'#ffd700':'#2a1545'}`,
                  color:i===0?'#ffd700':'#9060c0',borderRadius:4,
                }}>{s}</span>
                {i<arr.length-1&&<span style={{color:'#2a1545',alignSelf:'center',fontSize:18}}>·</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Letter boxes */}
          <div style={{display:'flex',justifyContent:'center',gap:4,marginTop:10,flexWrap:'wrap'}}>
            {wbWord.split('').map((l,i)=>(
              <div key={i} style={{
                width:32,height:32,background:'#12071e',border:'1px solid #2a1545',
                borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:'Share Tech Mono',fontSize:17,color:'#9060c0',
                animation:`letterPop 0.3s ease ${i*0.05}s both`,
              }}>{l.toUpperCase()}</div>
            ))}
          </div>
        </div>

        {/* Miss count */}
        {mb[wbWord]>0&&(
          <div style={{textAlign:'center',fontSize:12,color:'#ff4455',letterSpacing:1}}>
            YOU'VE MISSED THIS WORD {mb[wbWord]}× — LET'S END THAT TODAY
          </div>
        )}

        {/* Progress dots — 3 in a row to graduate */}
        <div style={{display:'flex',justifyContent:'center',gap:10,alignItems:'center'}}>
          <span style={{fontSize:10,color:'#3a1060',letterSpacing:1,marginRight:4}}>3 CORRECT IN A ROW</span>
          {[0,1,2].map(i=>{
            const consec=wbTrials.slice(-3).filter(Boolean).length;
            const filled=i<consec;
            return(
              <div key={i} style={{
                width:18,height:18,borderRadius:'50%',
                background:filled?'#00ff88':'#12071e',
                border:`2px solid ${filled?'#00ff88':'#2a1545'}`,
                boxShadow:filled?'0 0 8px rgba(0,255,136,0.5)':'none',
                transition:'all 0.3s',
              }}/>
            );
          })}
        </div>

        {/* Input */}
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onMouseDown={e=>{e.preventDefault();spellOut(wbWord);}} style={{
            background:'#0f0520',color:'#7040a0',border:'1px solid #2a1545',
            borderRadius:6,padding:'10px 12px',fontSize:11,whiteSpace:'nowrap',
          }}>🔊 SPELL IT</button>
          <input ref={wbRef} type="text" value={wbInput}
            onChange={e=>setWbInput(e.target.value)}
            onPaste={e=>e.preventDefault()}
            onKeyDown={e=>{if(e.key==='Enter')submitTrial();}}
            placeholder="type the word..." spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="none"
            className={wbState==='bad'?'wrong-chip':''}
            style={{
              flex:1,fontSize:22,background:'#050210',padding:'10px 14px',
              border:`2px solid ${wbState==='ok'?'#00ff88':wbState==='bad'?'#ff3355':'#2a1545'}`,
              borderRadius:8,
              color:wbState==='ok'?'#00ff88':wbState==='bad'?'#ff3355':'#00ccff',
              outline:'none',letterSpacing:2,caretColor:'#ffd700',transition:'all 0.2s',
              boxShadow:wbState==='ok'?'0 0 12px rgba(0,255,136,0.3)':wbState==='bad'?'0 0 12px rgba(255,51,85,0.3)':'none',
            }}
          />
        </div>

        <button className="btn" onClick={submitTrial} style={{
          background:'linear-gradient(135deg,#4400aa,#8800ff)',color:'#ffd700',
          border:'2px solid rgba(255,215,0,0.4)',borderRadius:8,padding:'14px',fontSize:17,letterSpacing:2,
          boxShadow:'0 0 20px rgba(136,0,255,0.3)',
        }}>SUBMIT 🎯 <span style={{fontSize:11,opacity:0.5,fontWeight:400}}>(or Enter)</span></button>
      </div>
    )}

    </div>{/* end padding div */}
  </div>{/* end ring */}
  </div>
  );
}

function MBox({quote}:{quote:string}){
  return(
    <div style={{
      background:'linear-gradient(135deg,#0a0518,#120a2e)',
      borderLeft:'3px solid #8800ff',borderRadius:'0 8px 8px 0',
      padding:'10px 14px',display:'flex',gap:10,alignItems:'flex-start',
      boxShadow:'inset 0 0 20px rgba(136,0,255,0.05)',
    }}>
      <span style={{fontSize:20,lineHeight:1,filter:'drop-shadow(0 0 6px rgba(255,100,0,0.4))'}}>🥊</span>
      <div>
        <div style={{fontSize:9,color:'#6600cc',letterSpacing:2,marginBottom:3}}>MICKEY</div>
        <div style={{fontFamily:'Share Tech Mono',fontSize:13,color:'#ffd700',lineHeight:1.5,fontStyle:'italic'}}>
          "{quote||'...'}"
        </div>
      </div>
    </div>
  );
}