import { useState, useEffect, useRef } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, BarChart, Bar, Cell, PieChart, Pie, Legend
} from "recharts";

import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { LoginScreen, LogoutButton } from "./Auth";

(() => {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap";
  document.head.appendChild(l);
})();

const GS = () => (
  <style>{`
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#07090e;--surface:#0d1018;--card:#111520;--border:#1a2030;
      --accent:#00ffd0;--red:#ff4d6d;--gold:#ffd166;--purple:#a78bfa;--blue:#60c8ff;
      --text:#e6eaf2;--muted:#4a566e;
      --ff:"Syne",sans-serif;--fm:"DM Mono",monospace;
    }
    body{background:var(--bg);color:var(--text);font-family:var(--fm);overflow-x:hidden}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fu{animation:fadeUp .38s ease both}
    .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px}
    .btn{font-family:var(--ff);font-weight:700;font-size:11px;letter-spacing:.07em;text-transform:uppercase;padding:8px 15px;border-radius:8px;border:none;cursor:pointer;transition:all .18s}
    .btn-p{background:var(--accent);color:#07090e}.btn-p:hover{opacity:.82;transform:translateY(-1px)}
    .btn-g{background:var(--border);color:var(--text)}.btn-g:hover{background:var(--muted)}
    .btn-r{background:var(--red);color:#fff}.btn-r:hover{opacity:.82}
    .btn:disabled{opacity:.5;cursor:not-allowed;transform:none!important}
    .inp{background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:var(--fm);font-size:12px;padding:9px 12px;border-radius:8px;outline:none;width:100%;transition:border-color .2s}
    .inp:focus{border-color:var(--accent)}
    select.inp option{background:var(--card)}
    .badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:99px;font-family:var(--fm);font-size:10px;font-weight:500}
    .tab-btn{background:none;border:none;cursor:pointer;font-family:var(--ff);font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:7px 14px;border-radius:6px;color:var(--muted);transition:all .18s;white-space:nowrap}
    .tab-btn:hover{color:var(--text);background:var(--border)}
    .tab-btn.on{color:#07090e;background:var(--accent)}
    .modal-bg{position:fixed;inset:0;background:#00000099;z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:26px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto}
    @media(max-width:640px){
      .hide-m{display:none!important}
      .g2{grid-template-columns:1fr 1fr!important}
      .g3{grid-template-columns:1fr 1fr!important}
      .g4{grid-template-columns:1fr 1fr!important}
      .mob-nav{display:flex!important}
      .top-tabs{display:none!important}
      .two-col{grid-template-columns:1fr!important}
    }
  `}</style>
);

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const getToday = () => new Date();
const getTodayKey = () => new Date().toISOString().slice(0, 10);
const getThisMonth = () => {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
// Keep TODAY as a constant for the session, but derived fresh
const TODAY = getToday();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const todayKey = getTodayKey();
const thisMonth = getThisMonth();
const CAT_COLORS = {Food:"#ffd166",Health:"#00ffd0",Transport:"#a78bfa",Entertainment:"#ff4d6d",Education:"#60c8ff",Shopping:"#f97316",Rent:"#fb7185",Other:"#4a566e"};
const PRIO = {high:"#ff4d6d",medium:"#ffd166",low:"#00ffd0"};

// ── SEED DATA ─────────────────────────────────────────────────────────────────
const SEED_SOURCES = [
  {id:"s1",name:"Salary",color:"#00ffd0",icon:"💼",income:50000},
  {id:"s2",name:"Freelance",color:"#ffd166",icon:"💻",income:15000},
  {id:"s3",name:"Family",color:"#a78bfa",icon:"👨‍👩‍👦",income:5000},
];
const SEED_HABITS = [
  {id:"h1",name:"Morning Run",icon:"🏃",color:"#00ffd0",streak:12,log:{}},
  {id:"h2",name:"Read 30 min",icon:"📚",color:"#a78bfa",streak:5,log:{}},
  {id:"h3",name:"Meditate",icon:"🧘",color:"#ffd166",streak:3,log:{}},
  {id:"h4",name:"Cold Shower",icon:"🚿",color:"#ff4d6d",streak:8,log:{}},
];
const SEED_EXERCISES = [
  // PUSH — Mon / Thu
  {id:"e1", name:"Incline Push-ups",    unit:"reps", color:"#00ffd0", day:"Push (Mon/Thu)"},
  {id:"e2", name:"Normal Push-ups",     unit:"reps", color:"#00ffd0", day:"Push (Mon/Thu)"},
  {id:"e3", name:"Bench Dips",          unit:"reps", color:"#00ffd0", day:"Push (Mon/Thu)"},
  {id:"e4", name:"Pike Push-ups",       unit:"reps", color:"#00ffd0", day:"Push (Mon/Thu)"},
  {id:"e5", name:"Plank",               unit:"sec",  color:"#00ffd0", day:"Push (Mon/Thu)"},
  // PULL — Tue / Fri
  {id:"e6", name:"Dead Hang",           unit:"sec",  color:"#a78bfa", day:"Pull (Tue/Fri)"},
  {id:"e7", name:"Assisted Pull-ups",   unit:"reps", color:"#a78bfa", day:"Pull (Tue/Fri)"},
  {id:"e8", name:"Negative Pull-ups",   unit:"reps", color:"#a78bfa", day:"Pull (Tue/Fri)"},
  {id:"e9", name:"Australian Rows",     unit:"reps", color:"#a78bfa", day:"Pull (Tue/Fri)"},
  {id:"e10",name:"Hanging Knee Raises", unit:"reps", color:"#a78bfa", day:"Pull (Tue/Fri)"},
  // LEGS + CORE — Wed / Sat
  {id:"e11",name:"Bodyweight Squats",   unit:"reps", color:"#ffd166", day:"Legs+Core (Wed/Sat)"},
  {id:"e12",name:"Lunges",              unit:"reps", color:"#ffd166", day:"Legs+Core (Wed/Sat)"},
  {id:"e13",name:"Glute Bridges",       unit:"reps", color:"#ffd166", day:"Legs+Core (Wed/Sat)"},
  {id:"e14",name:"Calf Raises",         unit:"reps", color:"#ffd166", day:"Legs+Core (Wed/Sat)"},
  {id:"e15",name:"Leg Raises",          unit:"reps", color:"#ffd166", day:"Legs+Core (Wed/Sat)"},
  {id:"e16",name:"Russian Twists",      unit:"reps", color:"#ffd166", day:"Legs+Core (Wed/Sat)"},
  // SKILL — Anyday
  {id:"e17",name:"Hollow Body Hold",    unit:"sec",  color:"#ff4d6d", day:"Skill (Anyday)"},
  {id:"e18",name:"Mountain Climbers",   unit:"reps", color:"#ff4d6d", day:"Skill (Anyday)"},
  {id:"e19",name:"L-Sit Practice",      unit:"sec",  color:"#ff4d6d", day:"Skill (Anyday)"},
  {id:"e20",name:"Wall Handstand",      unit:"sec",  color:"#ff4d6d", day:"Skill (Anyday)"},
];
const SEED_WORKOUT_LOG = [
  {id:"w1",date:"2025-03-04",exerciseId:"e1",value:40,duration:20,kcal:120,month:"Mar 2025"},
  {id:"w2",date:"2025-03-04",exerciseId:"e2",value:3,duration:25,kcal:280,month:"Mar 2025"},
  {id:"w3",date:"2025-03-06",exerciseId:"e3",value:12,duration:15,kcal:90,month:"Mar 2025"},
];
const SEED_EXPENSES = [
  {id:"x1",desc:"Groceries",amount:1200,cat:"Food",source:"s1",method:"Cash",date:"2025-03-01",month:"Mar 2025"},
  {id:"x2",desc:"Gym",amount:800,cat:"Health",source:"s2",method:"Online",date:"2025-03-01",month:"Mar 2025"},
  {id:"x3",desc:"Uber",amount:250,cat:"Transport",source:"s1",method:"Online",date:"2025-03-03",month:"Mar 2025"},
  {id:"x4",desc:"Netflix",amount:199,cat:"Entertainment",source:"s1",method:"Online",date:"2025-03-05",month:"Mar 2025"},
  {id:"x5",desc:"Books",amount:450,cat:"Education",source:"s2",method:"Online",date:"2025-03-06",month:"Mar 2025"},
];
const SEED_TASKS = [
  {id:"t1",title:"Review project proposal",priority:"high",done:false,due:"Today"},
  {id:"t2",title:"Gym session",priority:"medium",done:true,due:"Today"},
  {id:"t3",title:"Read 30 pages",priority:"low",done:false,due:"Today"},
  {id:"t4",title:"Submit assignment",priority:"high",done:false,due:"Tomorrow"},
];
const SEED_WATER = {};

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
function SC({label,value,sub,color="#00ffd0",icon,delay=0}){
  return(
    <div className="card fu" style={{animationDelay:`${delay}ms`,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",gap:8}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color}33,${color},${color}33)`}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <span style={{fontSize:20}}>{icon}</span>
        <span style={{fontFamily:"var(--ff)",fontSize:24,fontWeight:800,color,lineHeight:1}}>{value}</span>
      </div>
      <div>
        <div style={{fontFamily:"var(--ff)",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--muted)"}}>{label}</div>
        {sub&&<div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{sub}</div>}
      </div>
    </div>
  );
}
function SH({children,action}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:".09em",color:"var(--muted)"}}>{children}</div>
      {action}
    </div>
  );
}
function Modal({show,onClose,title,children}){
  if(!show)return null;
  return(
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:18,marginBottom:18}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HABITS
// ══════════════════════════════════════════════════════════════════════════════
function HabitsTab({habits,setHabits}){
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",icon:"⭐",color:"#00ffd0"});
  const last14=Array.from({length:14},(_,i)=>{const d=new Date(TODAY);d.setDate(d.getDate()-13+i);return d.toISOString().slice(0,10);});
  const toggle=id=>setHabits(hs=>hs.map(h=>{
    if(h.id!==id)return h;
    const log={...h.log};
    log[todayKey]=log[todayKey]?0:1;
    return{...h,log,streak:log[todayKey]?h.streak+1:Math.max(0,h.streak-1)};
  }));
  const del=id=>setHabits(hs=>hs.filter(h=>h.id!==id));
  const add=()=>{
    if(!form.name.trim())return;
    setHabits(hs=>[...hs,{id:uid(),...form,streak:0,log:{}}]);
    setForm({name:"",icon:"⭐",color:"#00ffd0"});
    setShowAdd(false);
  };
  const radarData=habits.map(h=>({habit:h.name.split(" ")[0],score:Math.round((Object.values(h.log).filter(Boolean).length/Math.max(1,Object.keys(h.log).length))*100)||0}));
  const monthlyRate=habits.map(h=>{
    const keys=Object.keys(h.log).filter(k=>k.startsWith(todayKey.slice(0,7)));
    const done=keys.filter(k=>h.log[k]).length;
    return{name:h.name,icon:h.icon,color:h.color,done,total:keys.length||1};
  });
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <SC icon="🔥" label="Best Streak" value={Math.max(0,...habits.map(h=>h.streak))} sub="days" color="#ff4d6d" delay={0}/>
        <SC icon="✅" label="Done Today" value={habits.filter(h=>h.log[todayKey]).length} sub={`of ${habits.length}`} color="#00ffd0" delay={60}/>
        <SC icon="📈" label="Avg Rate" value={`${Math.round(habits.reduce((a,h)=>{const v=Object.values(h.log);return a+(v.filter(Boolean).length/Math.max(1,v.length));},0)/Math.max(1,habits.length)*100)}%`} sub="all time" color="#a78bfa" delay={120}/>
        <SC icon="📋" label="Habits" value={habits.length} sub="active" color="#ffd166" delay={180}/>
      </div>
      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:18}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <SH action={<button className="btn btn-p" onClick={()=>setShowAdd(true)}>+ Add Habit</button>}>Habit Tracker — click last cell to toggle today</SH>
          {habits.length===0&&<div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:30}}>No habits yet. Add one!</div>}
          {habits.map((h,i)=>(
            <div key={h.id} className="card fu" style={{animationDelay:`${i*50}ms`,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22}}>{h.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <span style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:13}}>{h.name}</span>
                  <span className="badge" style={{background:`${h.color}22`,color:h.color,animation:"pulse 1.5s ease infinite"}}>🔥{h.streak}d</span>
                </div>
                <div style={{display:"flex",gap:3}}>
                  {last14.map((dk,di)=>(
                    <div key={dk} onClick={()=>di===13&&toggle(h.id)} title={di===13?"Toggle today":""}
                      style={{width:16,height:16,borderRadius:3,background:h.log[dk]?h.color:"var(--border)",opacity:h.log[dk]?1:.3,cursor:di===13?"pointer":"default",border:di===13?`2px solid ${h.color}88`:"2px solid transparent",transition:"all .15s"}}/>
                  ))}
                </div>
              </div>
              <button className="btn btn-r" style={{padding:"5px 10px",fontSize:10}} onClick={()=>del(h.id)}>✕ Delete</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card">
            <SH>Consistency Radar</SH>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1a2030"/>
                <PolarAngleAxis dataKey="habit" tick={{fill:"#4a566e",fontSize:10,fontFamily:"DM Mono"}}/>
                <Radar dataKey="score" stroke="#00ffd0" fill="#00ffd0" fillOpacity={.15} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <SH>Monthly Completion</SH>
            {monthlyRate.map(({name,icon,color,done,total})=>(
              <div key={name} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                  <span>{icon} {name}</span><span style={{color:"var(--muted)"}}>{done}/{total}</span>
                </div>
                <div style={{height:5,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${Math.round(done/total*100)}%`,height:"100%",background:color,borderRadius:3,transition:"width .6s"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Modal show={showAdd} onClose={()=>setShowAdd(false)} title="New Habit">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input className="inp" placeholder="Habit name (e.g. Morning Run)" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <div style={{display:"flex",gap:10}}>
            <input className="inp" placeholder="Emoji icon" value={form.icon} onChange={e=>setForm(f=>({...f,icon:e.target.value}))} style={{maxWidth:80}}/>
            <div style={{flex:1}}>
              <label style={{fontSize:11,color:"var(--muted)",display:"block",marginBottom:4}}>Pick color</label>
              <input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{width:"100%",height:38,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
            <button className="btn btn-g" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="btn btn-p" onClick={add}>Add Habit</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FITNESS
// ══════════════════════════════════════════════════════════════════════════════
function FitnessTab({exercises,setExercises,workoutLog,setWorkoutLog,water,setWater}){
  const [showAddEx,setShowAddEx]=useState(false);
  const [showLog,setShowLog]=useState(false);
  const [exForm,setExForm]=useState({name:"",unit:"reps",color:"#00ffd0",day:"General"});
  const [logForm,setLogForm]=useState({exerciseId:"",value:"",duration:"",kcal:"",date:todayKey});
  const [selMonth,setSelMonth]=useState("Mar 2025");
  const [customMl,setCustomMl]=useState("");

  // ── Water (ml/L, no goal) ──────────────────────────────────────────────────
  const waterToday = water[todayKey] || 0;
  const addWater = (ml) => setWater(w=>({...w,[todayKey]:(w[todayKey]||0)+ml}));
  const removeWater = () => setWater(w=>({...w,[todayKey]:Math.max(0,(w[todayKey]||0)-100)}));
  const resetWater = () => setWater(w=>({...w,[todayKey]:0}));
  const addCustomWater = () => {
    const v = parseInt(customMl);
    if(!v||v<=0)return;
    addWater(v);
    setCustomMl("");
  };
  const displayWater = waterToday >= 1000
    ? `${(waterToday/1000).toFixed(2)}L`
    : `${waterToday}ml`;

  // ── Workout ────────────────────────────────────────────────────────────────
  const addEx=()=>{
    if(!exForm.name.trim())return;
    setExercises(ex=>[...ex,{id:uid(),...exForm}]);
    setExForm({name:"",unit:"reps",color:"#00ffd0"});
    setShowAddEx(false);
  };
  const delEx=id=>{setExercises(ex=>ex.filter(e=>e.id!==id));setWorkoutLog(l=>l.filter(w=>w.exerciseId!==id));};
  const addLog=()=>{
    if(!logForm.exerciseId||!logForm.value)return;
    const month=`${MONTHS[new Date(logForm.date).getMonth()]} ${new Date(logForm.date).getFullYear()}`;
    setWorkoutLog(l=>[...l,{id:uid(),...logForm,value:+logForm.value,duration:+logForm.duration||0,kcal:+logForm.kcal||0,month}]);
    setLogForm({exerciseId:"",value:"",duration:"",kcal:"",date:todayKey});
    setShowLog(false);
  };
  const months=[...new Set(workoutLog.map(w=>w.month))].filter(Boolean).sort();
  const filtered=workoutLog.filter(w=>w.month===selMonth);
  const totalKcal=filtered.reduce((a,w)=>a+w.kcal,0);
  const totalMin=filtered.reduce((a,w)=>a+w.duration,0);
  const kcalByDay=filtered.reduce((a,w)=>({...a,[w.date]:(a[w.date]||0)+w.kcal}),{});
  const chartData=Object.entries(kcalByDay).sort().map(([date,kcal])=>({date:date.slice(5),kcal}));

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <SC icon="🏋️" label="Sessions" value={filtered.length} sub={selMonth} color="#00ffd0" delay={0}/>
        <SC icon="🔥" label="Calories" value={totalKcal} sub="burned" color="#ff4d6d" delay={60}/>
        <SC icon="⏱️" label="Total Time" value={`${totalMin}m`} sub="active" color="#ffd166" delay={120}/>
        <SC icon="💧" label="Water Today" value={displayWater} sub="tracked today" color="#60c8ff" delay={180}/>
      </div>

      {/* ── Water Tracker ── */}
      <div className="card">
        <SH action={<span style={{fontSize:11,color:"var(--muted)"}}>{todayKey}</span>}>💧 Water Intake Tracker</SH>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {/* Preset buttons */}
          {[100,150,200,250,500].map(ml=>(
            <button key={ml} className="btn btn-g" onClick={()=>addWater(ml)}
              style={{fontSize:12,padding:"8px 12px"}}>+{ml}ml</button>
          ))}
          <button className="btn btn-r" onClick={removeWater} style={{fontSize:12,padding:"8px 10px"}}>−100ml</button>

          {/* Custom amount */}
          <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:4}}>
            <input className="inp" placeholder="Custom ml" value={customMl}
              onChange={e=>setCustomMl(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addCustomWater()}
              style={{maxWidth:100,fontSize:12}}/>
            <button className="btn btn-p" onClick={addCustomWater} style={{whiteSpace:"nowrap"}}>+ Add</button>
          </div>

          {/* Display */}
          <div style={{marginLeft:12,minWidth:100}}>
            <div style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:26,color:"#60c8ff",lineHeight:1}}>
              {displayWater}
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>today's total</div>
          </div>

          <button className="btn btn-g" style={{marginLeft:"auto"}} onClick={resetWater}>Reset</button>
        </div>

        {/* History bar for last 7 days */}
        <div style={{marginTop:16}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:8,fontFamily:"var(--ff)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>Last 7 Days</div>
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:50}}>
            {Array.from({length:7},(_,i)=>{
              const d=new Date(TODAY);d.setDate(d.getDate()-6+i);
              const dk=d.toISOString().slice(0,10);
              const val=water[dk]||0;
              const maxVal=Math.max(1,...Array.from({length:7},(_,j)=>{const dd=new Date(TODAY);dd.setDate(dd.getDate()-6+j);return water[dd.toISOString().slice(0,10)]||0;}));
              const pct=Math.round(val/maxVal*100)||4;
              const label=val>=1000?`${(val/1000).toFixed(1)}L`:`${val}ml`;
              return(
                <div key={dk} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:9,color:"var(--muted)"}}>{val>0?label:""}</div>
                  <div style={{width:"100%",height:`${pct}%`,minHeight:4,background:dk===todayKey?"#60c8ff":"#1a2030",borderRadius:3,transition:"height .4s"}}/>
                  <div style={{fontSize:9,color:"var(--muted)"}}>{["S","M","T","W","T","F","S"][d.getDay()]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        {/* Exercise library */}
        <div className="card">
          <SH action={<button className="btn btn-p" onClick={()=>setShowAddEx(true)}>+ Add Exercise</button>}>Exercise Library</SH>
          <div style={{display:"flex",flexDirection:"column",gap:14,maxHeight:320,overflowY:"auto"}}>
            {exercises.length===0&&<div style={{color:"var(--muted)",fontSize:12}}>No exercises yet</div>}
            {[...new Set(exercises.map(ex=>ex.day||"General"))].map(dayGroup=>{
              const dayColors={"Push (Mon/Thu)":"#00ffd0","Pull (Tue/Fri)":"#a78bfa","Legs+Core (Wed/Sat)":"#ffd166","Skill (Anyday)":"#ff4d6d","General":"#4a566e"};
              const groupColor=dayColors[dayGroup]||"#4a566e";
              return(
                <div key={dayGroup}>
                  <div style={{fontSize:10,fontFamily:"var(--ff)",fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:groupColor,marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${groupColor}33`}}>
                    {dayGroup}
                  </div>
                  {exercises.filter(ex=>(ex.day||"General")===dayGroup).map(ex=>(
                    <div key={ex.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:ex.color,flexShrink:0}}/>
                      <span style={{flex:1,fontFamily:"var(--ff)",fontWeight:600,fontSize:12}}>{ex.name}</span>
                      <span className="badge" style={{background:"var(--surface)",color:"var(--muted)"}}>{ex.unit}</span>
                      <button onClick={()=>delEx(ex.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:14,padding:"0 4px"}}>✕</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        {/* Kcal chart */}
        <div className="card">
          <SH action={
            <select className="inp" style={{maxWidth:120,padding:"4px 8px"}} value={selMonth} onChange={e=>setSelMonth(e.target.value)}>
              {[...new Set([...months,"Mar 2025"])].map(m=><option key={m}>{m}</option>)}
            </select>
          }>Calories Burned / Day</SH>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{fill:"#4a566e",fontSize:9,fontFamily:"DM Mono"}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background:"#111520",border:"1px solid #1a2030",borderRadius:8,fontFamily:"DM Mono",fontSize:11}}/>
              <Bar dataKey="kcal" radius={[4,4,0,0]} fill="#ff4d6d"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workout log */}
      <div className="card">
        <SH action={<button className="btn btn-p" onClick={()=>setShowLog(true)}>+ Log Workout</button>}>Workout Log — {selMonth}</SH>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Date","Exercise","Value","Duration","Kcal",""].map(h=><th key={h} style={{textAlign:"left",color:"var(--muted)",paddingBottom:8,fontWeight:500,paddingRight:14}}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={6} style={{color:"var(--muted)",padding:"20px 0",textAlign:"center"}}>No workouts for {selMonth}</td></tr>}
              {filtered.map(w=>{
                const ex=exercises.find(e=>e.id===w.exerciseId);
                return(
                  <tr key={w.id} style={{borderTop:"1px solid var(--border)"}}>
                    <td style={{padding:"8px 14px 8px 0",color:"var(--muted)"}}>{w.date.slice(5)}</td>
                    <td style={{padding:"8px 14px 8px 0",color:ex?.color||"var(--text)",fontFamily:"var(--ff)",fontWeight:600}}>{ex?.name||"Deleted"}</td>
                    <td style={{padding:"8px 14px 8px 0"}}>{w.value} {ex?.unit}</td>
                    <td style={{padding:"8px 14px 8px 0"}}>{w.duration}m</td>
                    <td style={{padding:"8px 14px 8px 0",color:"#ff4d6d"}}>{w.kcal} kcal</td>
                    <td><button onClick={()=>setWorkoutLog(l=>l.filter(x=>x.id!==w.id))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:15}}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showAddEx} onClose={()=>setShowAddEx(false)} title="Add Exercise">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input className="inp" placeholder="Exercise name" value={exForm.name} onChange={e=>setExForm(f=>({...f,name:e.target.value}))}/>
          <select className="inp" value={exForm.day||"General"} onChange={e=>setExForm(f=>({...f,day:e.target.value}))}>
            <option value="Push (Mon/Thu)">💪 Push (Mon/Thu)</option>
            <option value="Pull (Tue/Fri)">🏋️ Pull (Tue/Fri)</option>
            <option value="Legs+Core (Wed/Sat)">🦵 Legs+Core (Wed/Sat)</option>
            <option value="Skill (Anyday)">⚡ Skill (Anyday)</option>
            <option value="General">📋 General</option>
          </select>
          <div style={{display:"flex",gap:10}}>
            <select className="inp" value={exForm.unit} onChange={e=>setExForm(f=>({...f,unit:e.target.value}))}>
              {["reps","sets","km","min","sec","kg"].map(u=><option key={u}>{u}</option>)}
            </select>
            <div style={{flex:1}}>
              <label style={{fontSize:11,color:"var(--muted)",display:"block",marginBottom:4}}>Color</label>
              <input type="color" value={exForm.color} onChange={e=>setExForm(f=>({...f,color:e.target.value}))} style={{width:"100%",height:38,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button className="btn btn-g" onClick={()=>setShowAddEx(false)}>Cancel</button>
            <button className="btn btn-p" onClick={addEx}>Add</button>
          </div>
        </div>
      </Modal>

      <Modal show={showLog} onClose={()=>setShowLog(false)} title="Log Workout">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <select className="inp" value={logForm.exerciseId} onChange={e=>setLogForm(f=>({...f,exerciseId:e.target.value}))}>
            <option value="">Select Exercise</option>
            {exercises.map(ex=><option key={ex.id} value={ex.id}>{ex.name} ({ex.unit})</option>)}
          </select>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <input className="inp" placeholder="Value" value={logForm.value} onChange={e=>setLogForm(f=>({...f,value:e.target.value}))}/>
            <input className="inp" placeholder="Duration (min)" value={logForm.duration} onChange={e=>setLogForm(f=>({...f,duration:e.target.value}))}/>
            <input className="inp" placeholder="Calories burned" value={logForm.kcal} onChange={e=>setLogForm(f=>({...f,kcal:e.target.value}))}/>
            <input className="inp" type="date" value={logForm.date} onChange={e=>setLogForm(f=>({...f,date:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button className="btn btn-g" onClick={()=>setShowLog(false)}>Cancel</button>
            <button className="btn btn-p" onClick={addLog}>Log It</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════════════════════════════════════════
function ExpensesTab({expenses,setExpenses,sources,setSources}){
  const [showAdd,setShowAdd]=useState(false);
  const [showSrc,setShowSrc]=useState(false);
  const [selMonth,setSelMonth]=useState("Mar 2025");
  const [form,setForm]=useState({desc:"",amount:"",cat:"Food",source:"",method:"Online",date:todayKey});
  const [srcForm,setSrcForm]=useState({name:"",icon:"💰",color:"#00ffd0",income:0});

  const months=[...new Set(expenses.map(e=>e.month))].sort();

  const addExpense=()=>{
    if(!form.desc||!form.amount||!form.source)return;
    const month=`${MONTHS[new Date(form.date).getMonth()]} ${new Date(form.date).getFullYear()}`;
    setExpenses(ex=>[...ex,{id:uid(),...form,amount:+form.amount,month}]);
    setForm({desc:"",amount:"",cat:"Food",source:"",method:"Online",date:todayKey});
    setShowAdd(false);
  };
  const addSrc=()=>{
    if(!srcForm.name.trim())return;
    setSources(s=>[...s,{id:uid(),...srcForm,income:+srcForm.income||0}]);
    setSrcForm({name:"",icon:"💰",color:"#00ffd0",income:0});
  };

  const filtered=expenses.filter(e=>e.month===selMonth);
  const total=filtered.reduce((a,e)=>a+e.amount,0);
  const byCat=Object.entries(filtered.reduce((a,e)=>({...a,[e.cat]:(a[e.cat]||0)+e.amount}),{})).map(([cat,amount])=>({cat,amount})).sort((a,b)=>b.amount-a.amount);

  // ── Source-wise savings calculation ──────────────────────────────────────
  const bySrc=sources.map(s=>{
    const spent=filtered.filter(e=>e.source===s.id).reduce((a,e)=>a+e.amount,0);
    const income=s.income||0;
    const savings=income-spent;
    return{...s,spent,income,savings};
  });

  const cashTotal=filtered.filter(e=>e.method==="Cash").reduce((a,e)=>a+e.amount,0);
  const onlineTotal=filtered.filter(e=>e.method==="Online").reduce((a,e)=>a+e.amount,0);
  const totalIncome=sources.reduce((a,s)=>a+(s.income||0),0);
  const totalSavings=totalIncome-total;

  const exportCSV=()=>{
    const rows=[["Description","Amount","Category","Source","Method","Date"],...filtered.map(e=>[e.desc,e.amount,e.cat,sources.find(s=>s.id===e.source)?.name||"",e.method,e.date])];
    const blob=new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`expenses_${selMonth.replace(" ","_")}.csv`;a.click();
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <select className="inp" style={{maxWidth:140}} value={selMonth} onChange={e=>setSelMonth(e.target.value)}>
          {[...new Set([...months,"Mar 2025"])].map(m=><option key={m}>{m}</option>)}
        </select>
        <button className="btn btn-p" onClick={()=>setShowAdd(true)}>+ Add Expense</button>
        <button className="btn btn-g" onClick={()=>setShowSrc(true)}>⚙ Manage Sources</button>
        <button className="btn btn-g" style={{marginLeft:"auto"}} onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      {/* Top stats */}
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <SC icon="💸" label="Total Spent" value={`₹${total.toLocaleString()}`} sub={selMonth} color="#ff4d6d" delay={0}/>
        <SC icon="💰" label="Total Income" value={`₹${totalIncome.toLocaleString()}`} sub="all sources" color="#00ffd0" delay={60}/>
        <SC icon="🏦" label="Total Savings" value={`₹${Math.abs(totalSavings).toLocaleString()}`} sub={totalSavings>=0?"saved this month":"overspent!"} color={totalSavings>=0?"#00ffd0":"#ff4d6d"} delay={120}/>
        <SC icon="📦" label="Transactions" value={filtered.length} sub="entries" color="#a78bfa" delay={180}/>
      </div>

      {/* ── Source-wise savings cards ── */}
      <div className="card">
        <SH>Income Sources — Savings Breakdown</SH>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {bySrc.map(s=>(
            <div key={s.id} style={{flex:1,minWidth:140,background:"var(--surface)",borderRadius:12,padding:"14px 16px",border:`1px solid ${s.color}44`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:20}}>{s.icon}</span>
                <span style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:13,color:s.color}}>{s.name}</span>
              </div>

              {/* Income row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:11,color:"var(--muted)"}}>Income</span>
                <span style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:14,color:"var(--accent)"}}>₹{s.income.toLocaleString()}</span>
              </div>

              {/* Spent row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:11,color:"var(--muted)"}}>Spent</span>
                <span style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:14,color:"var(--red)"}}>₹{s.spent.toLocaleString()}</span>
              </div>

              {/* Divider */}
              <div style={{height:1,background:"var(--border)",margin:"8px 0"}}/>

              {/* Savings row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"var(--muted)"}}>Savings</span>
                <span style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:16,color:s.savings>=0?"#00ffd0":"#ff4d6d"}}>
                  {s.savings>=0?"✓ ":"↓ "}₹{Math.abs(s.savings).toLocaleString()}
                </span>
              </div>
              <div style={{fontSize:10,color:"var(--muted)",marginTop:3,textAlign:"right"}}>
                {s.income>0?`${Math.round((s.savings/s.income)*100)}% ${s.savings>=0?"saved":"overspent"}`:"Set income above"}
              </div>

              {/* Spending bar vs income */}
              <div style={{marginTop:10,height:5,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                <div style={{
                  width:`${s.income>0?Math.min(100,Math.round(s.spent/s.income*100)):0}%`,
                  height:"100%",
                  background:s.savings>=0?s.color:"var(--red)",
                  borderRadius:3,transition:"width .6s"
                }}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--muted)",marginTop:3}}>
                <span>₹0</span>
                <span>{s.income>0?`${Math.round(s.spent/s.income*100)}% spent`:""}</span>
                <span>₹{s.income.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {sources.length===0&&<div style={{color:"var(--muted)",fontSize:12}}>No income sources yet. Click ⚙ Manage Sources to add one.</div>}
        </div>
      </div>

      {/* Payment method split */}
      <div className="g4" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div className="card" style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:28}}>💳</div>
          <div>
            <div style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:20,color:"#60c8ff"}}>₹{onlineTotal.toLocaleString()}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Online payments · {total?Math.round(onlineTotal/total*100):0}%</div>
          </div>
        </div>
        <div className="card" style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:28}}>💵</div>
          <div>
            <div style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:20,color:"#ffd166"}}>₹{cashTotal.toLocaleString()}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Cash payments · {total?Math.round(cashTotal/total*100):0}%</div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:18}}>
        {/* Transaction list */}
        <div className="card">
          <SH>Transactions</SH>
          <div style={{maxHeight:360,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            {filtered.length===0&&<div style={{color:"var(--muted)",fontSize:12,textAlign:"center",padding:20}}>No expenses for {selMonth}</div>}
            {filtered.map((e,i)=>{
              const src=sources.find(s=>s.id===e.source);
              return(
                <div key={e.id} className="fu" style={{animationDelay:`${i*30}ms`,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                  <div>
                    <div style={{fontFamily:"var(--ff)",fontSize:13,fontWeight:600}}>{e.desc}</div>
                    <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                      <span className="badge" style={{background:`${CAT_COLORS[e.cat]||"#4a566e"}22`,color:CAT_COLORS[e.cat]||"#4a566e"}}>{e.cat}</span>
                      {src&&<span className="badge" style={{background:`${src.color}22`,color:src.color}}>{src.icon} {src.name}</span>}
                      <span className="badge" style={{background:e.method==="Cash"?"#ffd16622":"#60c8ff22",color:e.method==="Cash"?"#ffd166":"#60c8ff"}}>{e.method==="Cash"?"💵 Cash":"💳 Online"}</span>
                      <span style={{fontSize:10,color:"var(--muted)",display:"flex",alignItems:"center"}}>{e.date}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:10}}>
                    <span style={{fontFamily:"var(--ff)",fontWeight:800,color:"var(--red)",whiteSpace:"nowrap"}}>₹{e.amount.toLocaleString()}</span>
                    <button onClick={()=>setExpenses(ex=>ex.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16}}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Category breakdown */}
        <div className="card">
          <SH>By Category</SH>
          {byCat.map(({cat,amount})=>(
            <div key={cat} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                <span style={{color:CAT_COLORS[cat]||"var(--muted)"}}>{cat}</span>
                <span style={{color:"var(--muted)"}}>{total?Math.round(amount/total*100):0}%</span>
              </div>
              <div style={{height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                <div style={{width:`${total?Math.round(amount/total*100):0}%`,height:"100%",background:CAT_COLORS[cat]||"#4a566e",borderRadius:3,transition:"width .6s"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add expense modal */}
      <Modal show={showAdd} onClose={()=>setShowAdd(false)} title="Add Expense">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input className="inp" placeholder="Description" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <input className="inp" placeholder="Amount (₹)" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
            <select className="inp" value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>{Object.keys(CAT_COLORS).map(c=><option key={c}>{c}</option>)}</select>
            <select className="inp" value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}>
              <option value="">Select Income Source *</option>
              {sources.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
            <select className="inp" value={form.method} onChange={e=>setForm(f=>({...f,method:e.target.value}))}><option>Online</option><option>Cash</option></select>
            <input className="inp" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{gridColumn:"span 2"}}/>
          </div>
          {!form.source&&<div style={{fontSize:11,color:"var(--gold)"}}>⚠ Please select an income source</div>}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button className="btn btn-g" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="btn btn-p" onClick={addExpense} disabled={!form.source}>Add Expense</button>
          </div>
        </div>
      </Modal>

      {/* Manage sources modal */}
      <Modal show={showSrc} onClose={()=>setShowSrc(false)} title="⚙ Income Sources">
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
          {sources.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--surface)",borderRadius:10,border:`1px solid ${s.color}44`}}>
              <span style={{fontSize:18}}>{s.icon}</span>
              <span style={{fontFamily:"var(--ff)",fontWeight:700,color:s.color,minWidth:70}}>{s.name}</span>
              <input className="inp" style={{maxWidth:130,fontSize:11,padding:"5px 8px"}}
                placeholder="₹ monthly income"
                value={s.income||""}
                onChange={e=>setSources(sx=>sx.map(x=>x.id===s.id?{...x,income:+e.target.value||0}:x))}/>
              <button onClick={()=>setSources(sx=>sx.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16}}>✕</button>
            </div>
          ))}
          {sources.length===0&&<div style={{color:"var(--muted)",fontSize:12}}>No sources yet</div>}
        </div>
        <div style={{borderTop:"1px solid var(--border)",paddingTop:16}}>
          <div style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:11,textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>Add New Source</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8}}>
              <input className="inp" placeholder="Source name" value={srcForm.name} onChange={e=>setSrcForm(f=>({...f,name:e.target.value}))} style={{flex:2}}/>
              <input className="inp" placeholder="Icon" value={srcForm.icon} onChange={e=>setSrcForm(f=>({...f,icon:e.target.value}))} style={{maxWidth:60}}/>
              <input type="color" value={srcForm.color} onChange={e=>setSrcForm(f=>({...f,color:e.target.value}))} style={{width:38,height:38,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",flexShrink:0}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <input className="inp" placeholder="Monthly income (₹)" value={srcForm.income||""} onChange={e=>setSrcForm(f=>({...f,income:e.target.value}))} style={{flex:1}}/>
              <button className="btn btn-p" onClick={addSrc}>Add Source</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════════════════════
function TasksTab({tasks,setTasks}){
  const [form,setForm]=useState({title:"",priority:"medium",due:"Today"});
  const done=tasks.filter(t=>t.done).length;
  const progress=tasks.length?Math.round(done/tasks.length*100):0;
  const add=()=>{
    if(!form.title.trim())return;
    setTasks(ts=>[...ts,{id:uid(),...form,done:false}]);
    setForm({title:"",priority:"medium",due:"Today"});
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <SC icon="📋" label="Total" value={tasks.length} color="#00ffd0" delay={0}/>
        <SC icon="✅" label="Done" value={done} sub="completed" color="#a78bfa" delay={60}/>
        <SC icon="⏳" label="Pending" value={tasks.length-done} sub="remaining" color="#ffd166" delay={120}/>
        <SC icon="🎯" label="Progress" value={`${progress}%`} color="#ff4d6d" delay={180}/>
      </div>
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:".08em",color:"var(--muted)"}}>Daily Progress</span>
          <span style={{color:"var(--accent)",fontFamily:"var(--ff)",fontWeight:700}}>{done}/{tasks.length}</span>
        </div>
        <div style={{height:10,background:"var(--border)",borderRadius:5,overflow:"hidden"}}>
          <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#00ffd0,#a78bfa)",borderRadius:5,transition:"width .6s"}}/>
        </div>
      </div>
      {["Today","Tomorrow","Later"].map(group=>{
        const grouped=tasks.filter(t=>t.due===group);
        if(!grouped.length)return null;
        return(
          <div key={group}>
            <div style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:".09em",color:"var(--muted)",margin:"2px 0 8px"}}>{group}</div>
            {grouped.map((t,i)=>(
              <div key={t.id} className="card fu" style={{animationDelay:`${i*40}ms`,display:"flex",alignItems:"center",gap:12,marginBottom:8,opacity:t.done?.5:1,transition:"opacity .2s"}}>
                <div onClick={()=>setTasks(ts=>ts.map(x=>x.id===t.id?{...x,done:!x.done}:x))}
                  style={{width:20,height:20,borderRadius:5,border:`2px solid ${PRIO[t.priority]}`,background:t.done?PRIO[t.priority]:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                  {t.done&&<span style={{color:"#07090e",fontSize:11,fontWeight:900}}>✓</span>}
                </div>
                <span style={{flex:1,fontFamily:"var(--ff)",fontSize:13,textDecoration:t.done?"line-through":"none"}}>{t.title}</span>
                <span className="badge" style={{background:`${PRIO[t.priority]}22`,color:PRIO[t.priority]}}>{t.priority}</span>
                <button onClick={()=>setTasks(ts=>ts.filter(x=>x.id!==t.id))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16}}>×</button>
              </div>
            ))}
          </div>
        );
      })}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <input className="inp" placeholder="Add task..." value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} style={{flex:1,minWidth:160}}/>
        <select className="inp" style={{maxWidth:100}} value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select className="inp" style={{maxWidth:110}} value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))}>
          <option>Today</option><option>Tomorrow</option><option>Later</option>
        </select>
        <button className="btn btn-p" onClick={add}>Add</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MONTHLY SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
function MonthlySummary({habits,workoutLog,expenses,tasks,sources,exercises,water}){
  const [selMonth,setSelMonth]=useState("Mar 2025");
  const [aiSummary,setAiSummary]=useState("");
  const [loading,setLoading]=useState(false);

  const allMonths=[...new Set([...workoutLog.map(w=>w.month),...expenses.map(e=>e.month),"Mar 2025"])].sort();
  const filtEx=expenses.filter(e=>e.month===selMonth);
  const filtWk=workoutLog.filter(w=>w.month===selMonth);
  const totalSpent=filtEx.reduce((a,e)=>a+e.amount,0);
  const totalKcal=filtWk.reduce((a,w)=>a+w.kcal,0);
  const totalMin=filtWk.reduce((a,w)=>a+w.duration,0);
  const tasksDone=tasks.filter(t=>t.done).length;
  const totalIncome=sources.reduce((a,s)=>a+(s.income||0),0);
  const totalSavings=totalIncome-totalSpent;

  const [mon,yr]=selMonth.split(" ");
  const monthNum=MONTHS.indexOf(mon);

  // Water total for the month
  const waterMonthTotal=Object.entries(water).filter(([k])=>{
    const d=new Date(k);return d.getMonth()===monthNum&&d.getFullYear()===+yr;
  }).reduce((a,[,v])=>a+v,0);
  const displayMonthWater=waterMonthTotal>=1000?`${(waterMonthTotal/1000).toFixed(1)}L`:`${waterMonthTotal}ml`;

  const habitPerf=habits.map(h=>{
    const keys=Object.keys(h.log).filter(k=>{const d=new Date(k);return d.getMonth()===monthNum&&d.getFullYear()===+yr;});
    return{name:h.name,icon:h.icon,color:h.color,done:keys.filter(k=>h.log[k]).length,total:keys.length||1,streak:h.streak};
  });
  const catData=Object.entries(filtEx.reduce((a,e)=>({...a,[e.cat]:(a[e.cat]||0)+e.amount}),{})).map(([name,value])=>({name,value}));

  // Source savings for the month
  const srcSavings=sources.map(s=>{
    const spent=filtEx.filter(e=>e.source===s.id).reduce((a,e)=>a+e.amount,0);
    return{...s,spent,savings:(s.income||0)-spent};
  });

  const exData=exercises.map(ex=>({...ex,sessions:filtWk.filter(w=>w.exerciseId===ex.id).length,kcal:filtWk.filter(w=>w.exerciseId===ex.id).reduce((a,w)=>a+w.kcal,0)})).filter(e=>e.sessions>0);

  const getAI=async()=>{
    setLoading(true);setAiSummary("");
    const ctx=`Monthly data for ${selMonth}:\nExpenses: ₹${totalSpent} spent, ₹${totalIncome} income, ₹${totalSavings} savings. Sources: ${srcSavings.map(s=>`${s.name}: spent ₹${s.spent}, saved ₹${s.savings}`).join("; ")}\nFitness: ${filtWk.length} workouts, ${totalKcal} kcal, ${totalMin} min\nHabits: ${habitPerf.map(h=>`${h.name}:${h.done}/${h.total}`).join(", ")}\nWater: ${displayMonthWater} total\nTasks: ${tasksDone}/${tasks.length} done`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:`Give a concise monthly review for ${selMonth} with: 1) What went well 2) What to improve 3) Top 3 goals for next month. Be specific and direct.\n\n${ctx}`}]})});
      const data=await res.json();
      setAiSummary(data.content?.map(c=>c.text||"").join("")||"No response.");
    }catch{setAiSummary("⚠️ Add your Anthropic API key to the fetch headers to enable AI reviews.");}
    setLoading(false);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:24}}>Monthly Summary <span style={{color:"var(--accent)"}}>◎</span></div>
        <select className="inp" style={{maxWidth:140}} value={selMonth} onChange={e=>setSelMonth(e.target.value)}>
          {allMonths.map(m=><option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Top stats */}
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <SC icon="💸" label="Total Spent" value={`₹${totalSpent.toLocaleString()}`} sub={selMonth} color="#ff4d6d" delay={0}/>
        <SC icon="🏦" label="Total Savings" value={`₹${Math.abs(totalSavings).toLocaleString()}`} sub={totalSavings>=0?"saved":"overspent"} color={totalSavings>=0?"#00ffd0":"#ff4d6d"} delay={60}/>
        <SC icon="🔥" label="Kcal Burned" value={totalKcal} sub={`${filtWk.length} sessions`} color="#ffd166" delay={120}/>
        <SC icon="💧" label="Water Total" value={displayMonthWater} sub="this month" color="#60c8ff" delay={180}/>
      </div>

      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        {/* Habit performance */}
        <div className="card">
          <SH>Habit Performance</SH>
          {habitPerf.map(h=>(
            <div key={h.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span style={{fontSize:18}}>{h.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                  <span style={{fontFamily:"var(--ff)",fontWeight:600}}>{h.name}</span>
                  <span style={{color:"var(--muted)"}}>{h.done}/{h.total} days ({Math.round(h.done/h.total*100)}%)</span>
                </div>
                <div style={{height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${Math.round(h.done/h.total*100)}%`,height:"100%",background:h.color,borderRadius:3,transition:"width .6s"}}/>
                </div>
              </div>
              <span className="badge" style={{background:`${h.color}22`,color:h.color}}>🔥{h.streak}</span>
            </div>
          ))}
          {habitPerf.length===0&&<div style={{color:"var(--muted)",fontSize:12}}>No habit data yet</div>}
        </div>

        {/* Expense pie */}
        <div className="card">
          <SH>Spending by Category</SH>
          {catData.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={3} dataKey="value">
                  {catData.map((entry,i)=><Cell key={i} fill={CAT_COLORS[entry.name]||"#4a566e"}/>)}
                </Pie>
                <Tooltip contentStyle={{background:"#111520",border:"1px solid #1a2030",borderRadius:8,fontFamily:"DM Mono",fontSize:11}} formatter={v=>`₹${v.toLocaleString()}`}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:10,fontFamily:"DM Mono"}}/>
              </PieChart>
            </ResponsiveContainer>
          ):<div style={{color:"var(--muted)",fontSize:12}}>No expense data</div>}
        </div>

        {/* Source savings summary */}
        <div className="card">
          <SH>Savings by Income Source</SH>
          {srcSavings.map(s=>(
            <div key={s.id} style={{padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontFamily:"var(--ff)",fontWeight:700,color:s.color,fontSize:13}}>{s.icon} {s.name}</span>
                <span style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:15,color:s.savings>=0?"#00ffd0":"#ff4d6d"}}>
                  {s.savings>=0?"✓":"↓"} ₹{Math.abs(s.savings).toLocaleString()}
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--muted)",marginBottom:6}}>
                <span>Income: ₹{s.income.toLocaleString()}</span>
                <span>Spent: ₹{s.spent.toLocaleString()}</span>
                <span>{s.income>0?`${Math.round(s.savings/s.income*100)}% saved`:""}</span>
              </div>
              <div style={{height:5,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                <div style={{width:`${s.income>0?Math.min(100,Math.round(s.spent/s.income*100)):0}%`,height:"100%",background:s.savings>=0?s.color:"var(--red)",borderRadius:3,transition:"width .6s"}}/>
              </div>
            </div>
          ))}
          {srcSavings.length===0&&<div style={{color:"var(--muted)",fontSize:12}}>No income sources</div>}
        </div>

        {/* Workout breakdown */}
        <div className="card">
          <SH>Workout Breakdown</SH>
          {exData.length>0?exData.map(ex=>(
            <div key={ex.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:ex.color,flexShrink:0}}/>
              <span style={{flex:1,fontFamily:"var(--ff)",fontWeight:600,fontSize:13,color:ex.color}}>{ex.name}</span>
              <span style={{fontSize:12,color:"var(--muted)"}}>{ex.sessions} sessions</span>
              <span style={{fontSize:12,color:"#ff4d6d",marginLeft:8}}>{ex.kcal} kcal</span>
            </div>
          )):<div style={{color:"var(--muted)",fontSize:12}}>No workout data</div>}
        </div>
      </div>

      {/* AI Monthly Review */}
      <div className="card" style={{border:"1px solid #00ffd033",background:"linear-gradient(135deg,var(--card),#0c1a16)"}}>
        <SH action={<button className="btn btn-p" onClick={getAI} disabled={loading}>{loading?"Analyzing...":"✦ Generate AI Review"}</button>}>✦ AI Monthly Review</SH>
        {loading&&(
          <div style={{display:"flex",alignItems:"center",gap:12,color:"var(--muted)",padding:"10px 0"}}>
            <div style={{width:16,height:16,border:"2px solid var(--accent)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            Analyzing your {selMonth} data...
          </div>
        )}
        {aiSummary&&!loading&&<div style={{lineHeight:1.8,fontSize:13,whiteSpace:"pre-wrap",marginTop:4}}>{aiSummary}</div>}
        {!aiSummary&&!loading&&<div style={{color:"var(--muted)",fontSize:12}}>Click "Generate AI Review" for a personalized analysis of your {selMonth} performance.</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════
function Overview({habits,workoutLog,expenses,tasks,sources,water}){
  const monthEx=expenses.filter(e=>e.month===thisMonth);
  const waterToday=water[todayKey]||0;
  const displayWaterToday=waterToday>=1000?`${(waterToday/1000).toFixed(1)}L`:`${waterToday}ml`;
  const totalIncome=sources.reduce((a,s)=>a+(s.income||0),0);
  const totalSpent=monthEx.reduce((a,e)=>a+e.amount,0);
  const savings=totalIncome-totalSpent;

  const weekData=Array.from({length:7},(_,i)=>{
    const d=new Date(TODAY);d.setDate(d.getDate()-6+i);
    const dk=d.toISOString().slice(0,10);
    return{day:["S","M","T","W","T","F","S"][d.getDay()],habits:habits.filter(h=>h.log[dk]).length,kcal:workoutLog.filter(w=>w.date===dk).reduce((a,w)=>a+w.kcal,0)};
  });

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:26,letterSpacing:"-.02em"}}>
        Good {TODAY.getHours()<12?"Morning":TODAY.getHours()<17?"Afternoon":"Evening"} <span style={{color:"var(--accent)"}}>◎</span>
        <div style={{fontFamily:"var(--fm)",fontWeight:400,fontSize:12,color:"var(--muted)",marginTop:4}}>{(() => {
  try {
    return TODAY.toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
  } catch {
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${days[TODAY.getDay()]}, ${TODAY.getDate()} ${months[TODAY.getMonth()]} ${TODAY.getFullYear()}`;
  }
})()}</div>
      </div>
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <SC icon="🔥" label="Best Streak" value={Math.max(0,...habits.map(h=>h.streak))} sub="days" color="#ff4d6d" delay={0}/>
        <SC icon="💧" label="Water Today" value={displayWaterToday} sub="tracked" color="#60c8ff" delay={60}/>
        <SC icon="🏦" label="Month Savings" value={`₹${Math.abs(savings).toLocaleString()}`} sub={savings>=0?"saved":"overspent"} color={savings>=0?"#00ffd0":"#ff4d6d"} delay={120}/>
        <SC icon="✅" label="Tasks Today" value={`${tasks.filter(t=>t.done).length}/${tasks.filter(t=>t.due==="Today").length}`} color="#a78bfa" delay={180}/>
      </div>
      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <div className="card">
          <SH>7-Day Activity</SH>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={weekData}>
              <XAxis dataKey="day" tick={{fill:"#4a566e",fontSize:10,fontFamily:"DM Mono"}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background:"#111520",border:"1px solid #1a2030",borderRadius:8,fontFamily:"DM Mono",fontSize:11}}/>
              <Line type="monotone" dataKey="habits" stroke="#00ffd0" strokeWidth={2} dot={false} name="Habits Done"/>
              <Line type="monotone" dataKey="kcal" stroke="#ff4d6d" strokeWidth={2} dot={false} name="Kcal" yAxisId="r"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <SH>Today's Habits</SH>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {habits.map(h=>(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:6,background:h.log[todayKey]?`${h.color}22`:"var(--surface)",border:`1px solid ${h.log[todayKey]?h.color:"var(--border)"}`,borderRadius:8,padding:"6px 10px"}}>
                <span>{h.icon}</span>
                <span style={{fontFamily:"var(--ff)",fontSize:12,fontWeight:600}}>{h.name}</span>
                <span>{h.log[todayKey]?"✓":"○"}</span>
              </div>
            ))}
            {habits.length===0&&<div style={{color:"var(--muted)",fontSize:12}}>No habits added yet</div>}
          </div>
        </div>
        <div className="card">
          <SH>This Month — Savings by Source</SH>
          {sources.map(s=>{
            const spent=monthEx.filter(e=>e.source===s.id).reduce((a,e)=>a+e.amount,0);
            const sav=(s.income||0)-spent;
            return(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:16}}>{s.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                    <span style={{color:s.color,fontFamily:"var(--ff)",fontWeight:600}}>{s.name}</span>
                    <span style={{color:sav>=0?"#00ffd0":"#ff4d6d",fontWeight:700}}>₹{Math.abs(sav).toLocaleString()} {sav>=0?"saved":"over"}</span>
                  </div>
                  <div style={{height:5,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${s.income>0?Math.min(100,Math.round(spent/s.income*100)):0}%`,height:"100%",background:sav>=0?s.color:"var(--red)"}}/>
                  </div>
                </div>
              </div>
            );
          })}
          {sources.length===0&&<div style={{color:"var(--muted)",fontSize:12}}>No income sources yet</div>}
        </div>
        <div className="card">
          <SH>Pending Tasks</SH>
          {tasks.filter(t=>!t.done&&t.due==="Today").slice(0,5).map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--border)"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:PRIO[t.priority],flexShrink:0}}/>
              <span style={{fontFamily:"var(--ff)",fontSize:12,fontWeight:600,flex:1}}>{t.title}</span>
              <span className="badge" style={{background:`${PRIO[t.priority]}22`,color:PRIO[t.priority]}}>{t.priority}</span>
            </div>
          ))}
          {tasks.filter(t=>!t.done&&t.due==="Today").length===0&&<div style={{color:"var(--muted)",fontSize:12}}>All done for today! 🎉</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI COACH
// ══════════════════════════════════════════════════════════════════════════════
function AICoach({habits,workoutLog,expenses,tasks,sources,water}){
  const [insight,setInsight]=useState("");
  const [loading,setLoading]=useState(false);
  const [question,setQuestion]=useState("");
  const [asked,setAsked]=useState(false);
  const waterToday=water[todayKey]||0;
  const totalIncome=sources.reduce((a,s)=>a+(s.income||0),0);
  const totalSpent=expenses.reduce((a,e)=>a+e.amount,0);

  const ctx=`Habits: ${habits.map(h=>`${h.name}(streak:${h.streak}d)`).join(", ")}\nFitness: ${workoutLog.length} workouts, ${workoutLog.reduce((a,w)=>a+w.kcal,0)} kcal\nExpenses: ₹${totalSpent.toLocaleString()} total. Income: ₹${totalIncome.toLocaleString()}. Savings: ₹${(totalIncome-totalSpent).toLocaleString()}\nSources: ${sources.map(s=>`${s.name}=spent ₹${expenses.filter(e=>e.source===s.id).reduce((a,e)=>a+e.amount,0)}`).join(", ")}\nWater today: ${waterToday>=1000?(waterToday/1000).toFixed(1)+"L":waterToday+"ml"}\nTasks: ${tasks.filter(t=>t.done).length}/${tasks.length} done`;

  const ask=async(q)=>{
    setLoading(true);setAsked(true);setInsight("");
    const prompt=q?`Answer this about my tracking data: "${q}"\n\n${ctx}`:`Give 4 sharp actionable insights from my data.\n\n${ctx}`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      setInsight(data.content?.map(c=>c.text||"").join("")||"No response.");
    }catch{setInsight("⚠️ Add your Anthropic API key to the fetch headers in the source code.");}
    setLoading(false);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="card" style={{border:"1px solid #00ffd044",background:"linear-gradient(135deg,var(--card),#0c1a16)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-30,right:-30,width:110,height:110,background:"radial-gradient(circle,#00ffd011,transparent)",borderRadius:"50%"}}/>
        <div style={{fontFamily:"var(--ff)",fontWeight:800,fontSize:22,marginBottom:6}}>AI Coach <span style={{color:"var(--accent)"}}>✦</span></div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:16,lineHeight:1.7}}>Powered by Claude. Analyzes your habits, fitness, expenses, water & tasks.</div>
        <button className="btn btn-p" onClick={()=>ask("")} disabled={loading}>{loading?"Thinking...":"✦ Generate Insights"}</button>
      </div>
      <div className="card">
        <SH>Ask Anything About Your Data</SH>
        <div style={{display:"flex",gap:8}}>
          <input className="inp" placeholder="e.g. How are my savings looking?" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask(question)}/>
          <button className="btn btn-p" onClick={()=>ask(question)} disabled={loading}>Ask</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
          {["How's my fitness?","Which source overspends?","Weakest habit?","Am I saving enough?","Water intake ok?"].map(q=>(
            <button key={q} onClick={()=>{setQuestion(q);ask(q);}} style={{fontFamily:"var(--fm)",fontSize:11,background:"var(--surface)",border:"1px solid var(--border)",color:"var(--muted)",padding:"5px 10px",borderRadius:6,cursor:"pointer",transition:"all .15s"}} onMouseOver={e=>{e.target.style.borderColor="var(--accent)";e.target.style.color="var(--accent)"}} onMouseOut={e=>{e.target.style.borderColor="var(--border)";e.target.style.color="var(--muted)"}}>{q}</button>
          ))}
        </div>
      </div>
      {loading&&<div className="card" style={{display:"flex",alignItems:"center",gap:12,color:"var(--muted)"}}>
        <div style={{width:16,height:16,border:"2px solid var(--accent)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>Analyzing your data...
      </div>}
      {asked&&!loading&&insight&&(
        <div className="card fu" style={{border:"1px solid #00ffd033",lineHeight:1.8,fontSize:13,whiteSpace:"pre-wrap"}}>
          <div style={{fontFamily:"var(--ff)",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:".09em",color:"var(--accent)",marginBottom:12}}>✦ AI Insight</div>
          {insight}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
const TABS=[
  {id:"overview",label:"Overview",icon:"◎"},
  {id:"habits",label:"Habits",icon:"🔥"},
  {id:"fitness",label:"Fitness",icon:"💪"},
  {id:"expenses",label:"Expenses",icon:"💸"},
  {id:"tasks",label:"Tasks",icon:"✅"},
  {id:"summary",label:"Monthly",icon:"📊"},
  {id:"profile",label:"Profile",icon:"👤"}
];

function ProfileSettings({ profile, setProfile, saveProfile, user, habits, expenses, workoutLog, tasks, sources, water }) {
  const [saved, setSaved]               = useState(false);
  const [changingPw, setChangingPw]     = useState(false);
  const [pwForm, setPwForm]             = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg]               = useState({ text: "", ok: false });
  const [pwLoading, setPwLoading]       = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [deleteInput, setDeleteInput]   = useState("");

  // ── Derived stats ──────────────────────────────────────────────────────────
  const bestStreak    = Math.max(0, ...habits.map(h => h.streak));
  const totalWorkouts = workoutLog.length;
  const totalKcal     = workoutLog.reduce((a, w) => a + w.kcal, 0);
  const totalSpent    = expenses.reduce((a, e) => a + e.amount, 0);
  const totalIncome   = sources.reduce((a, s) => a + (s.income || 0), 0);
  const totalSavings  = totalIncome - totalSpent;
  const tasksDone     = tasks.filter(t => t.done).length;
  const waterToday    = water[todayKey] || 0;
  const displayWater  = waterToday >= 1000 ? `${(waterToday / 1000).toFixed(1)}L` : `${waterToday}ml`;
  const habitsToday   = habits.filter(h => h.log[todayKey]).length;

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "—";

  const initial = (profile.name || user?.email || "?")[0].toUpperCase();

  // ── Save name ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    await saveProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePw = async () => {
    setPwMsg({ text: "", ok: false });
    if (!pwForm.current)            return setPwMsg({ text: "Enter your current password.", ok: false });
    if (pwForm.next.length < 6)     return setPwMsg({ text: "New password must be at least 6 characters.", ok: false });
    if (pwForm.next !== pwForm.confirm) return setPwMsg({ text: "Passwords do not match.", ok: false });
    setPwLoading(true);
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
      const cred = EmailAuthProvider.credential(user.email, pwForm.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, pwForm.next);
      setPwMsg({ text: "✓ Password updated successfully!", ok: true });
      setPwForm({ current: "", next: "", confirm: "" });
      setChangingPw(false);
    } catch (e) {
      const msgs = {
        "auth/wrong-password":    "Current password is incorrect.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/requires-recent-login": "Please sign out and sign in again before changing your password.",
      };
      setPwMsg({ text: msgs[e.code] || "Failed to update password.", ok: false });
    }
    setPwLoading(false);
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteInput !== user.email) return;
    try {
      const { deleteDoc } = await import("firebase/firestore");
      const { signOut }   = await import("firebase/auth");
      await deleteDoc(doc(db, "users", user.uid));
      await user.delete();
      await signOut(auth);
    } catch (e) {
      alert("Could not delete account. Please sign out and sign in again first, then try again.");
    }
  };

  // ── Shared label style ─────────────────────────────────────────────────────
  const lbl = {
    fontSize: 11, color: "var(--muted)", fontFamily: "var(--ff)",
    fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em",
    display: "block", marginBottom: 6,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 700 }}>

      {/* ── HERO CARD ── */}
      <div className="card fu" style={{
        background: "linear-gradient(135deg,#111520,#0c1a16)",
        border: "1px solid #00ffd033", position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, background: "radial-gradient(circle,#00ffd00d,transparent)", borderRadius: "50%", pointerEvents: "none" }}/>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          {/* Big avatar */}
          <div style={{
            width: 78, height: 78, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#00ffd0,#0080aa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--ff)", fontWeight: 900, fontSize: 32, color: "#07090e",
            border: "3px solid #00ffd044", boxShadow: "0 0 28px #00ffd022"
          }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontFamily: "var(--ff)", fontWeight: 800, fontSize: 24, lineHeight: 1.2 }}>
              {profile.name || <span style={{ color: "var(--muted)", fontSize: 16 }}>No name set</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{user?.email}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "#00ffd022", color: "#00ffd0" }}>✦ TRACKR Pro</span>
              <span className="badge" style={{ background: "#1a2030", color: "var(--muted)" }}>📅 Member since {memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIFETIME STATS ── */}
      <div>
        <div style={{ fontFamily: "var(--ff)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--muted)", marginBottom: 12 }}>Your Lifetime Stats</div>
        <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          <SC icon="🔥" label="Best Streak"   value={`${bestStreak}d`}                             color="#ff4d6d"  delay={0}/>
          <SC icon="🏋️" label="Workouts"      value={totalWorkouts} sub={`${totalKcal.toLocaleString()} kcal`} color="#ffd166" delay={60}/>
          <SC icon="🏦" label="Net Savings"   value={`₹${Math.abs(totalSavings).toLocaleString()}`} sub={totalSavings >= 0 ? "saved total" : "overspent"} color={totalSavings >= 0 ? "#00ffd0" : "#ff4d6d"} delay={120}/>
          <SC icon="✅" label="Tasks Done"    value={tasksDone}     sub={`of ${tasks.length}`}     color="#a78bfa"  delay={180}/>
        </div>
      </div>

      {/* ── TODAY SNAPSHOT ── */}
      <div className="card fu">
        <SH>Today's Snapshot</SH>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { icon: "🔥", label: "Habits done",    value: `${habitsToday}/${habits.length}`,   color: "#ff4d6d" },
            { icon: "💧", label: "Water intake",   value: displayWater,                         color: "#60c8ff" },
            { icon: "💸", label: "Expenses (all)", value: `₹${totalSpent.toLocaleString()}`,    color: "#ffd166" },
            { icon: "📋", label: "Active habits",  value: habits.length,                        color: "#a78bfa" },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, minWidth: 110, background: "var(--surface)", borderRadius: 10,
              padding: "12px 14px", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", gap: 4
            }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div style={{ fontFamily: "var(--ff)", fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACCOUNT DETAILS ── */}
      <div className="card fu">
        <SH>Account Details</SH>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Display Name</label>
            <input
              className="inp"
              placeholder="Your full name"
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
          </div>
          <div>
            <label style={lbl}>Email Address</label>
            <input className="inp" value={user?.email || ""} disabled style={{ opacity: .5, cursor: "not-allowed" }}/>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 5 }}>Email cannot be changed. It is tied to your account.</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn-p" onClick={handleSave} style={{ minWidth: 120 }}>
              {saved ? "✓ Saved!" : "Save Changes"}
            </button>
            {saved && <span style={{ fontSize: 12, color: "#00ffd0" }}>Profile updated successfully</span>}
          </div>
        </div>
      </div>

      {/* ── CHANGE PASSWORD ── */}
      <div className="card fu">
        <SH action={
          <button className="btn btn-g" onClick={() => { setChangingPw(!changingPw); setPwMsg({ text: "", ok: false }); }}>
            {changingPw ? "Cancel" : "Change Password"}
          </button>
        }>Security</SH>

        {!changingPw && (
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
            Your account is protected with a password.<br/>
            Click "Change Password" to update it.
          </div>
        )}

        {changingPw && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
            <div>
              <label style={lbl}>Current Password</label>
              <input className="inp" type="password" placeholder="Enter current password"
                value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}/>
            </div>
            <div>
              <label style={lbl}>New Password</label>
              <input className="inp" type="password" placeholder="Min 6 characters"
                value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}/>
            </div>
            <div>
              <label style={lbl}>Confirm New Password</label>
              <input className="inp" type="password" placeholder="Repeat new password"
                value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleChangePw()}/>
            </div>
            {pwMsg.text && (
              <div style={{
                fontSize: 11, padding: "8px 12px", borderRadius: 7,
                background: pwMsg.ok ? "#00ffd018" : "#ff4d6d18",
                color: pwMsg.ok ? "#00ffd0" : "#ff4d6d"
              }}>{pwMsg.text}</div>
            )}
            <div>
              <button className="btn btn-p" onClick={handleChangePw} disabled={pwLoading}>
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DATA & PRIVACY ── */}
      <div className="card fu">
        <SH>Data & Privacy</SH>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--ff)", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>What we store</div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
              Your habits, fitness logs, expenses, tasks, and water data are stored privately in Firestore under your unique user ID. No one else can access your data.
            </div>
          </div>
          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--ff)", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Your data breakdown</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
              {[
                ["📋", "Habits",   habits.length],
                ["🏋️", "Workouts", workoutLog.length],
                ["💸", "Expenses", expenses.length],
                ["✅", "Tasks",    tasks.length],
                ["💰", "Sources",  sources.length],
              ].map(([icon, label, count]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
                  <span>{icon}</span>
                  <span>{count} {label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DANGER ZONE ── */}
      <div className="card fu" style={{ border: "1px solid #ff4d6d33" }}>
        <SH>Danger Zone</SH>
        {!showDelete ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--ff)", fontWeight: 700, fontSize: 12, color: "#ff4d6d", marginBottom: 3 }}>Delete Account</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Permanently deletes your account and all your data. This cannot be undone.</div>
            </div>
            <button className="btn btn-r" onClick={() => setShowDelete(true)}>Delete Account</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, color: "#ff4d6d", lineHeight: 1.7 }}>
              ⚠️ This will permanently delete your account and <strong>all your data</strong> — habits, workouts, expenses, tasks, everything. This action <strong>cannot be undone</strong>.
            </div>
            <div>
              <label style={{ ...lbl, color: "#ff4d6d" }}>Type your email to confirm: <span style={{ color: "var(--text)" }}>{user?.email}</span></label>
              <input className="inp" placeholder={user?.email} value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                style={{ borderColor: "#ff4d6d44" }}/>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-g" onClick={() => { setShowDelete(false); setDeleteInput(""); }}>Cancel</button>
              <button className="btn btn-r" onClick={handleDeleteAccount} disabled={deleteInput !== user?.email}>
                Yes, Delete Everything
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}


export default function App(){

  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("overview");

  const [habits,setHabits]=useState([]);
  const [exercises,setExercises]=useState([]);
  const [workoutLog,setWorkoutLog]=useState([]);
  const [expenses,setExpenses]=useState([]);
  const [sources,setSources]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [water,setWater]=useState({});
  const [profile,setProfile]=useState({
    name:"",
    email:"",
    photo:""
  });

  const shared={
    habits,setHabits,
    exercises,setExercises,
    workoutLog,setWorkoutLog,
    expenses,setExpenses,
    sources,setSources,
    tasks,setTasks,
    water,setWater
  };

  // AUTH STATE
  useEffect(()=>{

    const unsub = onAuthStateChanged(auth,(u)=>{
      setUser(u);
      setLoading(false);
    });

    return ()=>unsub();

  },[]);


  // LOAD USER DATA (REALTIME)
  useEffect(()=>{

    if(!user) return;

    const ref = doc(db,"users",user.uid);

    const unsub = onSnapshot(ref,(snap)=>{

      if(snap.exists()){

        const data = snap.data();

        setHabits(data.habits || []);
        setExercises(data.exercises || []);
        setWorkoutLog(data.workoutLog || []);
        setExpenses(data.expenses || []);
        setSources(data.sources || []);
        setTasks(data.tasks || []);
        setWater(data.water || {});

        setProfile({
          name:data.profile?.name || "",
          email:user.email,
          photo:user.photoURL || ""
        });
        dataLoaded.current = true;
      }else{

        setDoc(ref,{
          habits:[],
          exercises:[],
          workoutLog:[],
          expenses:[],
          sources:[],
          tasks:[],
          water:{},
          profile:{
            name:"",
            email:user.email,
            photo:user.photoURL || ""
          }
        });

      }

    });

    return ()=>unsub();

  },[user]);


  // AUTO SAVE DATA — debounced, only after first load
const dataLoaded = useRef(false);
useEffect(()=>{
  if(!user || !dataLoaded.current) return;
  const ref = doc(db,"users",user.uid);
  const t = setTimeout(()=>{
    setDoc(ref,{habits,exercises,workoutLog,expenses,sources,tasks,water},{merge:true});
  }, 1500);
  return ()=>clearTimeout(t);
},[habits,exercises,workoutLog,expenses,sources,tasks,water]);


  // SAVE PROFILE
  const saveProfile = async () => {

    if(!user) return;

    const ref = doc(db,"users",user.uid);

    await setDoc(ref,{
      profile:{
        name:profile.name,
        email:user.email,
        photo:user.photoURL || ""
      }
    },{merge:true});

  };


  if(loading){
    return <div style={{color:"white",padding:40}}>Loading...</div>
  }


  if(!user){
    return <LoginScreen onLogin={setUser}/>
  }


  return(
    <>
      <GS/>

      <div style={{
        minHeight:"100vh",
        background:"var(--bg)",
        display:"flex",
        flexDirection:"column"
      }}>

        {/* HEADER */}
        <header style={{
          borderBottom:"1px solid var(--border)",
          padding:"0 18px",
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
          height:54,
          position:"sticky",
          top:0,
          background:"#07090ef2",
          zIndex:100,
          backdropFilter:"blur(14px)"
        }}>

          <div style={{
            fontFamily:"var(--ff)",
            fontWeight:800,
            fontSize:17
          }}>
            TRACKR<span style={{color:"var(--accent)"}}>.</span>
            <span style={{
              color:"var(--muted)",
              fontSize:10,
              marginLeft:5
            }}>pro</span>
          </div>

          <div className="top-tabs" style={{
            display:"flex",
            gap:2,
            overflowX:"auto",
            padding:"3px 0"
          }}>
            {TABS.map(t=>(
              <button
                key={t.id}
                className={`tab-btn${tab===t.id?" on":""}`}
                onClick={()=>setTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:12}}>

            <div style={{
              fontSize:11,
              color:"var(--muted)"
            }} className="hide-m">
              {(()=>{
  try{
    return TODAY.toLocaleDateString("en-IN",{weekday:"short",month:"short",day:"numeric"});
  }catch{
    const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${days[TODAY.getDay()]}, ${TODAY.getDate()} ${months[TODAY.getMonth()]}`;
  }
})()}
            </div>

            <LogoutButton
              user={user}
              onLogout={()=>setUser(null)}
            />

          </div>

        </header>


        {/* MAIN */}
        <main style={{
  flex:1,
  padding:"20px 16px 80px",
  maxWidth:980,
  margin:"0 auto",
  width:"100%"
}}>

  <div className="fu" key={tab}>

    {tab==="overview" && <Overview {...shared}/>}

    {tab==="habits" &&
      <HabitsTab habits={habits} setHabits={setHabits}/>
    }

    {tab==="fitness" &&
      <FitnessTab
        exercises={exercises}
        setExercises={setExercises}
        workoutLog={workoutLog}
        setWorkoutLog={setWorkoutLog}
        water={water}
        setWater={setWater}
      />
    }

    {tab==="expenses" &&
      <ExpensesTab
        expenses={expenses}
        setExpenses={setExpenses}
        sources={sources}
        setSources={setSources}
      />
    }

    {tab==="tasks" &&
      <TasksTab tasks={tasks} setTasks={setTasks}/>
    }

    {tab==="summary" &&
      <MonthlySummary {...shared}/>
    }


    {tab==="profile" &&
    <ProfileSettings
      profile={profile}
      setProfile={setProfile}
      saveProfile={saveProfile}
      user={user}
      habits={habits}
      expenses={expenses}
      workoutLog={workoutLog}
      tasks={tasks}
      sources={sources}
      water={water}
    />
  }

  </div>

</main>

      </div>
    </>
  );
}