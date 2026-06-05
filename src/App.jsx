import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(()=>{
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  },[]);
  return isMobile;
}

/* ─────────────────────────────────────────────────────
   DESIGN TOKENS
   Base: warm cream (#F7F4EF)
   Category colors: each has a hue-consistent family
   Logic: warm tones for personal/life, cool for work/data,
          neutral for archive, vivid accent for events
───────────────────────────────────────────────────── */
const T = {
  bg:        "#F7F4EF",   // main background — warm cream
  bgCard:    "#FFFFFF",   // card surface
  bgSub:     "#F0EDE7",   // secondary bg, sidebar
  border:    "#E4DDD3",   // subtle borders
  borderMid: "#CEC5B8",   // medium borders
  text:      "#2C2825",   // primary text
  textSub:   "#8C8077",   // secondary text
  textMute:  "#B8AFA5",   // muted
  accent:    "#6B7C3A",   // primary accent — olive
};

// 새 카테고리 구조
// 최상위: 일정(빨강) / 이벤트(노랑) / 아카이브(초록)
// 아카이브 서브: 건강(파랑) / 경제(남색) / 리뷰(보라)
const CATS = [
  { id:"schedule", label:"일정",    icon:"o", color:"#C0443A", bg:"#FDECEA", text:"#9B2E25" },  // 빨강
  { id:"event",    label:"이벤트",  icon:"o", color:"#B09520", bg:"#FBF8E3", text:"#7A6A10" },  // 노랑
  { id:"archive",  label:"아카이브", icon:"o", color:"#4A8A5A", bg:"#EBF5EE", text:"#2E6640" },  // 초록
];

// 아카이브 서브카테고리
const ARCHIVE_SUBS = [
  { id:"health",  label:"건강", color:"#2E6FA5", bg:"#E8F2FA", text:"#1A4E7A" },  // 파랑
  { id:"economy", label:"경제", color:"#3A52A0", bg:"#EAECF8", text:"#243580" },  // 남색
  { id:"review",  label:"리뷰", color:"#7E4FA0", bg:"#F3EBF8", text:"#5A2E80" },  // 보라
];

// 건강 서브카테고리
const HEALTH_SUBS = [
  { id:"weight",   label:"체중" },
  { id:"diet",     label:"식단" },
  { id:"weight_training", label:"웨이트" },
  { id:"cardio",   label:"카디오" },
];

// 리뷰 서브카테고리
const REVIEW_SUBS = [
  { id:"book",   label:"책" },
  { id:"wine",   label:"와인" },
  { id:"coffee", label:"커피" },
];

// 전체 카테고리 조회용 헬퍼
const allCatOf = (category, sub_category) => {
  if(category === "archive" && sub_category) {
    return ARCHIVE_SUBS.find(s=>s.id===sub_category) || CATS.find(c=>c.id==="archive") || CATS[0];
  }
  return CATS.find(c=>c.id===category) || CATS[0];
};

const VIEWS = ["주","월","년"];
const WEEKDAYS = ["일","월","화","수","목","금","토"];
const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const HOURS = Array.from({length:24},(_,i)=>i);

const today = new Date();

/* ─────────────────────────────────────────────────────
   SAMPLE DATA
───────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────
   SUPABASE DATA HOOKS
───────────────────────────────────────────────────── */

// 이벤트 목록 불러오기
function useEvents(filterCat, filterSub) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from("events").select("*").order("date", {ascending:false}).order("hour");
      if(filterCat && filterCat !== "all") q = q.eq("category", filterCat);
      if(filterSub) q = q.eq("sub_category", filterSub);
      const { data, error } = await q;
      if(error) throw error;
      setEvents(data || []);
    } catch(e) {
      console.error("events 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [filterCat, filterSub]);

  useEffect(() => { fetch(); }, [fetch]);
  return { events, loading, refetch: fetch };
}

// 체중 기록 불러오기 (30일)
function useWeightLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const from = new Date(); from.setDate(from.getDate()-89);
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .gte("date", from.toISOString().slice(0,10))
        .order("date");
      if(error) throw error;
      setLogs(data || []);
    } catch(e) {
      console.error("weight 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { logs, loading, refetch: fetch };
}

// 이벤트 추가
async function addEvent(data) {
  const { error } = await supabase.from("events").insert([data]);
  if(error) throw error;
}

// 체중 추가/수정
async function upsertWeight(date, weight, memo="") {
  const { error } = await supabase.from("weight_logs")
    .upsert([{date, weight, memo}], {onConflict:"date"});
  if(error) throw error;
}

/* ─────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────── */
const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const catOf = (category, sub) => allCatOf(category, sub);
// legacy compat for old calls with single arg


function getWeekDays(date) {
  const d = new Date(date), day = d.getDay();
  return Array.from({length:7},(_,i)=>{ const x=new Date(d); x.setDate(x.getDate()-day+i); return x; });
}
function getMonthCells(date) {
  const year=date.getFullYear(), month=date.getMonth();
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  const cells=[];
  for(let i=0;i<first.getDay();i++) cells.push(null);
  for(let d=1;d<=last.getDate();d++) cells.push(new Date(year,month,d));
  return cells;
}

/* ─────────────────────────────────────────────────────
   DETAIL MODAL
───────────────────────────────────────────────────── */
function DetailModal({ ev, onClose, onRefetch }) {
  const cat = catOf(ev.category||ev.cat, ev.sub_category||ev.sub);
  const [done, setDone] = useState(ev.done);
  const [ev2, setEv2] = useState(ev);

  const handleToggleDone = async () => {
    const newDone = !done;
    setDone(newDone);  // optimistic update
    await supabase.from("events").update({ done: newDone }).eq("id", ev.id);
    onRefetch?.();
  };
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(44,40,37,0.45)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,
      backdropFilter:"blur(3px)",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.bgCard, borderRadius:18,
        width:440, maxWidth:"92vw", maxHeight:"80vh",
        boxShadow:"0 16px 60px rgba(44,40,37,0.18)",
        display:"flex", flexDirection:"column",
        border:`1px solid ${T.border}`,
        overflow:"hidden",
      }}>
        {/* Header stripe */}
        <div style={{
          background:cat.bg, borderBottom:`1px solid ${T.border}`,
          padding:"18px 22px 14px",
        }}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{
              width:36,height:36,borderRadius:10,flexShrink:0,
              background:cat.color+"22",border:`1.5px solid ${cat.color}55`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,color:cat.color,fontWeight:700,marginTop:1,
            }}>
              {cat.label.slice(0,2)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{
                fontSize:17,color:T.text,fontWeight:600,lineHeight:1.3,
                fontFamily:"'Libre Baskerville',Georgia,serif",
              }}>{ev.title}</div>
              <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{
                  fontSize:11,padding:"2px 9px",borderRadius:20,
                  background:cat.color+"18",color:cat.color,
                  border:`1px solid ${cat.color}33`,fontWeight:500,
                }}>{cat.label}{ev.sub ? ` — ${ev.sub}` : ""}</span>
                <span style={{fontSize:11,color:T.textMute}}>
                  {ev.date} &nbsp;{String(ev.hour).padStart(2,"0")}:00
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{
              background:"transparent",border:"none",
              color:T.textMute,cursor:"pointer",fontSize:20,
              padding:"0 4px",lineHeight:1,flexShrink:0,
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {ev.detail ? (
            <pre style={{
              fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,
              color:T.text,lineHeight:1.85,whiteSpace:"pre-wrap",
              margin:0,
            }}>{ev.detail}</pre>
          ) : (
            <div style={{color:T.textMute,fontSize:13,fontStyle:"italic"}}>
              상세 내용이 없습니다.
            </div>
          )}
          {ev.images&&ev.images.length>0&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
              {ev.images.map((img,i)=>(
                <img key={i} src={img.src} alt={img.name}
                  style={{width:120,height:90,objectFit:"cover",borderRadius:8,border:`1px solid ${T.border}`,cursor:"pointer"}}
                  onClick={()=>window.open(img.src,"_blank")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop:`1px solid ${T.border}`,
          padding:"12px 22px",display:"flex",
          justifyContent:"space-between",alignItems:"center",
          background:T.bgSub,
        }}>
          <button onClick={handleToggleDone} style={{
            display:"flex",alignItems:"center",gap:7,cursor:"pointer",
            background:"transparent",border:`1.5px solid ${done?cat.color:T.borderMid}`,
            borderRadius:9,padding:"7px 14px",
            color:done?cat.color:T.textSub,fontSize:12,fontWeight:500,
            transition:"all .15s",
          }}>
            <div style={{
              width:14,height:14,borderRadius:"50%",
              background:done?cat.color:"transparent",
              border:`1.5px solid ${done?cat.color:T.borderMid}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:8,color:"white",
            }}>{done&&"✓"}</div>
            {done ? "완료됨" : "미완료"}
          </button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>alert('수정 기능 준비 중')} style={{
              padding:"7px 16px",borderRadius:9,cursor:"pointer",fontSize:12,
              background:"transparent",border:`1px solid ${T.border}`,color:T.textSub,
            }}>수정</button>
            <button onClick={onClose} style={{
              padding:"7px 18px",borderRadius:9,cursor:"pointer",fontSize:12,
              background:cat.color,border:"none",color:"white",fontWeight:600,
              boxShadow:`0 2px 10px ${cat.color}44`,
            }}>닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   TASK CHIP — light, clean, MyRoutine-style
───────────────────────────────────────────────────── */
function TaskChip({ ev, compact=false, onOpen }) {
  const cat = catOf(ev.category||ev.cat, ev.sub_category||ev.sub);
  return (
    <div onClick={()=>onOpen(ev)} style={{
      display:"flex", alignItems:"center", gap:10,
      padding: compact?"6px 10px":"10px 13px",
      borderRadius:10,
      background: ev.done ? T.bgSub : T.bgCard,
      border:`1px solid ${ev.done ? T.border : cat.color+"44"}`,
      borderLeft:`3px solid ${ev.done ? T.borderMid : cat.color}`,
      cursor:"pointer", transition:"box-shadow .12s, border-color .12s",
      opacity: ev.done ? 0.6 : 1,
      marginBottom: compact?3:5,
      boxShadow:"0 1px 4px rgba(44,40,37,0.05)",
    }}
    onMouseEnter={e=>{ if(!ev.done) e.currentTarget.style.boxShadow=`0 3px 14px ${cat.color}22`; }}
    onMouseLeave={e=>{ e.currentTarget.style.boxShadow="0 1px 4px rgba(44,40,37,0.05)"; }}>

      {/* Status dot */}
      <div style={{
        width:18,height:18,borderRadius:"50%",flexShrink:0,
        border:`1.5px solid ${ev.done ? T.borderMid : cat.color}`,
        background: ev.done ? T.borderMid : "transparent",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:9,color:"white",
      }}>{ev.done && "v"}</div>

      {/* Content */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{
          fontSize:compact?11:13, color:ev.done?T.textMute:T.text,
          textDecoration:"none",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          fontWeight:ev.done?400:500,
        }}>{ev.title}</div>
        {!compact && ev.detail && (
          <div style={{
            fontSize:11,color:T.textMute,marginTop:2,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          }}>{ev.detail.split("\n")[0]}</div>
        )}
      </div>

      {/* Category tag */}
      {!compact && (
        <div style={{
          fontSize:10,padding:"2px 8px",borderRadius:20,flexShrink:0,
          background:cat.bg,color:cat.text,
          border:`1px solid ${cat.color}33`,
        }}>{cat.label}{ev.sub?` · ${ev.sub}`:""}</div>
      )}

      {/* Time */}
      {!compact && (
        <div style={{fontSize:10,color:T.textMute,flexShrink:0,minWidth:30,textAlign:"right"}}>
          {String(ev.hour).padStart(2,"0")}:00
        </div>
      )}

      {/* Arrow indicator */}
      <div style={{fontSize:10,color:T.textMute,flexShrink:0}}>›</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   DAY VIEW
───────────────────────────────────────────────────── */
function DayView({ date, filterCat, onOpen, events=[] }) {
  const ds = dateStr(date);
  const [showEarly, setShowEarly] = useState(false);
  const earlyHours = [0,1,2,3,4,5,6,7];
  const mainHours  = HOURS.filter(h=>!earlyHours.includes(h));
  const nowH = today.getHours ? today.getHours() : -1;

  const renderRow = (h) => {
    const evs = events.filter(e=>e.date===ds&&e.hour===h&&(filterCat==="all"||e.category===filterCat));
    const isNow = ds===dateStr(today)&&h===nowH;
    return (
      <div key={h} style={{display:"flex",gap:12,minHeight:52,borderBottom:`1px solid ${T.border}`,padding:"5px 0"}}>
        <div style={{width:44,flexShrink:0,fontSize:11,paddingTop:6,textAlign:"right",letterSpacing:.3,fontWeight:isNow?600:400,color:isNow?CATS[2].color:T.textMute}}>
          {String(h).padStart(2,"0")}:00
        </div>
        <div style={{flex:1,paddingTop:2}}>
          {isNow&&<div style={{height:1.5,background:`linear-gradient(90deg,${CATS[2].color},transparent)`,marginBottom:5,borderRadius:1}}/>}
          {evs.map(ev=><TaskChip key={ev.id} ev={ev} onOpen={onOpen}/>)}
        </div>
      </div>
    );
  };

  const earlyEvCount = earlyHours.reduce((acc,h)=>
    acc+events.filter(e=>e.date===ds&&e.hour===h&&(filterCat==="all"||e.category===filterCat)).length,0);

  return (
    <div style={{overflowY:"auto",maxHeight:"calc(100vh - 155px)",paddingRight:4}}>
      <div onClick={()=>setShowEarly(s=>!s)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 4px",cursor:"pointer",borderBottom:`1px solid ${T.border}`,marginBottom:2}}>
        <div style={{width:44,textAlign:"right",fontSize:10,color:T.textMute,letterSpacing:.3}}>00–07</div>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:T.textMute,borderBottom:`1px dashed ${T.borderMid}`}}>
            {showEarly?"접기":"펼치기"}
          </span>
          {earlyEvCount>0&&(
            <span style={{fontSize:9,background:CATS[2].bg,color:CATS[2].text,padding:"1px 6px",borderRadius:10}}>{earlyEvCount}개</span>
          )}
        </div>
      </div>
      {showEarly&&earlyHours.map(renderRow)}
      {mainHours.map(renderRow)}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   WEEK VIEW — fixed equal grid, early collapse, done opacity
───────────────────────────────────────────────────── */
function WeekView({ date, filterCat, onOpen, events=[], onCellClick }) {
  const days = getWeekDays(date);
  const todayStr = dateStr(today);
  const [showEarly, setShowEarly] = useState(false);
  const earlyHours = [0,1,2,3,4,5,6,7];
  const mainHours  = HOURS.filter(h=>!earlyHours.includes(h));
  const COL = "44px repeat(7,1fr)";
  const ROW_H = 56; // fixed row height px

  const earlyEvCount = earlyHours.reduce((acc,h)=>
    acc+days.reduce((a2,d)=>
      a2+events.filter(e=>e.date===dateStr(d)&&e.hour===h&&(filterCat==="all"||e.category===filterCat)).length,0),0);

  const nowH = today.getHours();

  const renderRow = (h) => {
    const isCurrentHour = h===nowH;
    return (
      <div key={h} style={{
        display:"grid", gridTemplateColumns:COL,
        height:ROW_H, flexShrink:0,
        borderBottom:"0.5px solid rgba(228,221,211,0.22)",
      }}>
        {/* time label */}
        <div style={{
          fontSize:9,
          color:isCurrentHour?"#4a5828":T.textMute,
          textAlign:"right",
          paddingRight:6,paddingTop:5,letterSpacing:.2,
          borderRight:"0.5px solid rgba(228,221,211,0.2)",
          fontWeight:isCurrentHour?700:400,
        }}>
          {String(h).padStart(2,"0")}
        </div>
        {/* day columns */}
        {days.map((d,i)=>{
          const ds = dateStr(d);
          const evs=events.filter(e=>e.date===ds&&e.hour===h&&(filterCat==="all"||e.category===filterCat));
          const isCurrentCell = ds===todayStr&&isCurrentHour;
          return (
            <div key={i}
              onClick={()=>onCellClick&&onCellClick(d,h)}
              style={{
                padding:"2px 3px",overflow:"hidden",cursor:"pointer",
                background:isCurrentCell?"rgba(107,124,58,0.1)":"transparent",
                borderRight:"none",
              }}>
              {isCurrentCell&&<div style={{height:1.5,background:"linear-gradient(90deg,#6B7C3A,transparent)",marginBottom:2,borderRadius:1}}/>}
              {evs.map(ev=>{
                const cat=catOf(ev.category||ev.cat, ev.sub_category||ev.sub);
                return (
                  <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} title={ev.title} style={{
                    fontSize:11,padding:"3px 7px",borderRadius:5,marginBottom:2,
                    background:cat.bg, color:ev.done?T.textMute:cat.text,
                    border:`1px solid ${ev.done?T.border:cat.color+"55"}`,
                    borderLeft:`2px solid ${ev.done?T.borderMid:cat.color}`,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                    cursor:"pointer", opacity:ev.done?0.4:1,
                  }}>{ev.title}</div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 155px)"}}>
      {/* Sticky day header */}
      <div style={{
        display:"grid",gridTemplateColumns:COL,
        flexShrink:0,
        borderBottom:`1px solid ${T.border}`,
        background:T.bg,
        position:"sticky",top:0,zIndex:3,
      }}>
        <div style={{borderRight:`1px solid ${T.border}`}}/>
        {days.map((d,i)=>{
          const isToday=dateStr(d)===todayStr;
          return (
            <div key={i} style={{
              textAlign:"center",padding:"8px 4px",
              borderRight:"none",
              background: isToday?`${T.accent}0f`:"transparent",
            }}>
              {(() => {
                const dow = d.getDay();
                const isSat = dow===6, isSun = dow===0;
                const dayLabelColor = isToday?"#4a5828" : isSat?"#2E6FA5" : isSun?"#C0443A" : T.textMute;
                const numColor = isToday?"white" : isSat?"#2E6FA5" : isSun?"#C0443A" : T.text;
                return (
                  <>
                    <div style={{fontSize:9,color:dayLabelColor,marginBottom:3,letterSpacing:.3,fontWeight:isSat||isSun?600:400}}>{WEEKDAYS[dow]}</div>
                    <div style={{
                      width:26,height:26,borderRadius:"50%",margin:"0 auto",
                      background:isToday?"#6B7C3A":"transparent",
                      border:isToday?"none":`1px solid ${T.border}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,color:numColor,fontWeight:isToday?700:isSat||isSun?600:400,
                    }}>{d.getDate()}</div>
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div style={{flex:1,overflowY:"auto"}}>
        {/* Early hours toggle row */}
        <div onClick={()=>setShowEarly(s=>!s)} style={{
          display:"grid",gridTemplateColumns:COL,
          height:28,flexShrink:0,cursor:"pointer",
          borderBottom:"0.5px solid rgba(228,221,211,0.22)",
          background:T.bgSub,
        }}>
          <div style={{
            fontSize:9,color:T.textMute,textAlign:"right",
            paddingRight:6,paddingTop:8,
            borderRight:`1px solid ${T.border}`,
          }}>00–07</div>
          <div style={{
            gridColumn:"2 / 9",display:"flex",alignItems:"center",paddingLeft:8,gap:6,
          }}>
            <span style={{fontSize:9,color:T.textMute,borderBottom:`1px dashed ${T.borderMid}`}}>
              {showEarly?"접기":"펼치기"}
            </span>
            {earlyEvCount>0&&(
              <span style={{fontSize:8,background:CATS[2].bg,color:CATS[2].text,padding:"1px 5px",borderRadius:8}}>
                {earlyEvCount}개
              </span>
            )}
          </div>
        </div>
        {showEarly&&earlyHours.map(renderRow)}
        {mainHours.map(renderRow)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MONTH VIEW — equal cells, todo first / done bottom, opacity
───────────────────────────────────────────────────── */
function MonthView({ date, filterCat, onDayClick, onOpen, events=[] }) {
  const cells = getMonthCells(date);
  const todayStr = dateStr(today);
  while (cells.length < 42) cells.push(null);
  return (
    <div style={{height:"calc(100vh - 155px)",display:"flex",flexDirection:"column"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2,flexShrink:0}}>
        {WEEKDAYS.map(w=>(
          <div key={w} style={{textAlign:"center",fontSize:11,color:T.textMute,padding:"4px 0"}}>{w}</div>
        ))}
      </div>
      <div style={{
        display:"grid",gridTemplateColumns:"repeat(7,1fr)",
        gridTemplateRows:"repeat(6,1fr)",gap:2,flex:1,
      }}>
        {cells.map((d,i)=>{
          if(!d) return (
            <div key={i} style={{borderRadius:10,background:T.bgSub,border:`1px solid ${T.border}`,opacity:.3}}/>
          );
          const ds=dateStr(d);
          const isToday=ds===todayStr;
          const allEvs=events.filter(e=>e.date===ds);
          // Split: todo first, done at bottom
          const todoEvs=allEvs.filter(e=>!e.done);
          const doneEvs=allEvs.filter(e=>e.done);
          const uniqueCats=[...new Set(todoEvs.map(e=>e.category))];
          return (
            <div key={i} onClick={()=>onDayClick(d)} style={{
              padding:"6px 7px 4px",borderRadius:10,cursor:"pointer",
              background:isToday?"#EEF2E8":T.bgCard,
              border:`1px solid ${isToday?"#6B7C3A66":T.border}`,
              transition:"box-shadow .12s",overflow:"hidden",minWidth:0,
              boxShadow:"0 1px 3px rgba(44,40,37,0.04)",
              display:"flex",flexDirection:"column",
            }}
            onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 14px rgba(44,40,37,0.1)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.boxShadow="0 1px 3px rgba(44,40,37,0.04)"; }}>
              {/* Date + dots */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                <div style={{
                  fontSize:12,
                  fontWeight:isToday?700:d.getDay()===0||d.getDay()===6?600:500,
                  color:isToday?"#4a5828":d.getDay()===6?"#2E6FA5":d.getDay()===0?"#C0443A":T.text,
                }}>{d.getDate()}</div>
                <div style={{display:"flex",gap:2}}>
                  {uniqueCats.slice(0,3).map(cid=>(
                    <div key={cid} style={{width:5,height:5,borderRadius:"50%",background:catOf(cid, null).color}}/>
                  ))}
                </div>
              </div>
              {/* Todo items — normal */}
              <div style={{flex:1,overflow:"hidden"}}>
                {todoEvs.slice(0,2).map(ev=>{
                  const cat=catOf(ev.category||ev.cat, ev.sub_category||ev.sub);
                  return (
                    <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} style={{
                      fontSize:9,color:cat.text,marginBottom:2,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                      padding:"1px 4px",borderRadius:3,background:cat.bg,cursor:"pointer",
                    }}>· {ev.title}</div>
                  );
                })}
                {todoEvs.length>2&&<div style={{fontSize:8,color:T.textMute}}>+{todoEvs.length-2}개</div>}
              </div>
              {/* Done items — faded, bottom */}
              {doneEvs.length>0&&(
                <div style={{
                  marginTop:2,paddingTop:2,
                  opacity:.4,
                }}>
                  {doneEvs.slice(0,1).map(ev=>(
                    <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} style={{
                      fontSize:9,color:T.textMute,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                      cursor:"pointer",padding:"1px 2px",
                    }}>· {ev.title}</div>
                  ))}
                  {doneEvs.length>1&&<div style={{fontSize:8,color:T.textMute}}>+{doneEvs.length-1}완료</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   YEAR VIEW
───────────────────────────────────────────────────── */
function YearView({ date, filterCat, onOpen, events=[] }) {
  const year = date.getFullYear();
  const [tooltip, setTooltip] = useState(null);
  const todayStr = dateStr(today);

  const eventsByDate = useMemo(()=>{
    const map={};
    events.filter(e=>e.date.startsWith(`${year}`)&&e.category==="event")
      .forEach(e=>{ if(!map[e.date])map[e.date]=[]; map[e.date].push(e); });
    return map;
  },[year,events]);

  return (
    <div style={{overflowY:"auto",maxHeight:"calc(100vh - 155px)"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {Array.from({length:12},(_,mi)=>{
          const cells=getMonthCells(new Date(year,mi,1));
          return (
            <div key={mi} style={{
              background:T.bgCard,borderRadius:12,padding:"12px 10px",
              border:`1px solid ${T.border}`,
              boxShadow:"0 1px 4px rgba(44,40,37,0.05)",
            }}>
              <div style={{
                fontSize:12,color:T.text,marginBottom:7,fontWeight:600,
                fontFamily:"'Libre Baskerville',Georgia,serif",
              }}>{MONTHS_KR[mi]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:3}}>
                {["일","월","화","수","목","금","토"].map(w=>(
                  <div key={w} style={{textAlign:"center",fontSize:7,color:T.textMute}}>{w}</div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
                {cells.map((d,i)=>{
                  if(!d) return <div key={i} style={{height:18}}/>;
                  const ds=dateStr(d);
                  const evs=eventsByDate[ds]||[];
                  const isToday=ds===todayStr;
                  const cats=[...new Set(evs.map(e=>e.category))];
                  const hasEvs=evs.length>0;

                  let bg="transparent";
                  if(hasEvs){
                    if(cats.length===1) bg=catOf(cats[0], null).color;
                    else bg=`conic-gradient(${cats.map((c,ci)=>`${catOf(c, null).color} ${ci/cats.length*360}deg ${(ci+1)/cats.length*360}deg`).join(",")})`;
                  }

                  return (
                    <div key={i}
                      onMouseEnter={(e)=>{
                        if(hasEvs){
                          const rect=e.currentTarget.getBoundingClientRect();
                          setTooltip({x:rect.left+14,y:rect.top,evs,d});
                        }
                      }}
                      onMouseLeave={()=>setTooltip(null)}
                      style={{height:18,width:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:hasEvs?"pointer":"default"}}>
                      <div style={{
                        width:isToday?16:hasEvs?14:11,
                        height:isToday?16:hasEvs?14:11,
                        borderRadius:"50%",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        background:bg,
                        border:isToday?`2px solid ${T.accent}`:"none",
                        boxShadow:hasEvs?`0 0 4px ${catOf(cats[0], null).color}55`:"none",
                      }}>
                        <span style={{
                          fontSize:7,fontWeight:600,pointerEvents:"none",
                          color:hasEvs?"rgba(255,255,255,0.9)":isToday?T.accent:T.textMute,
                        }}>{d.getDate()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip&&(
        <div style={{
          position:"fixed",
          left:Math.min(tooltip.x+12, (typeof window!=="undefined"?window.innerWidth:800)-250),
          top:Math.max(tooltip.y-10,10),
          background:T.bgCard,
          border:`1px solid ${T.border}`,
          borderRadius:12,padding:"12px 15px",zIndex:500,
          minWidth:210,maxWidth:280,
          boxShadow:"0 10px 36px rgba(44,40,37,0.15)",
          pointerEvents:"none",
        }}>
          <div style={{fontSize:12,color:T.text,marginBottom:9,fontWeight:600,fontFamily:"'Libre Baskerville',Georgia,serif"}}>
            {tooltip.d.getMonth()+1}월 {tooltip.d.getDate()}일
          </div>
          {tooltip.evs.map(ev=>{
            const cat=catOf(ev.category||ev.cat, ev.sub_category||ev.sub);
            return (
              <div key={ev.id} style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:7}}>
                <div style={{
                  width:8,height:8,borderRadius:"50%",background:cat.color,
                  flexShrink:0,marginTop:3,
                }}/>
                <div>
                  <div style={{fontSize:12,color:T.text,lineHeight:1.4}}>{ev.title}</div>
                  <div style={{fontSize:10,color:cat.text,marginTop:1,
                    background:cat.bg,display:"inline-block",padding:"1px 6px",borderRadius:4,
                  }}>{cat.label}{ev.sub?` · ${ev.sub}`:""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   LIVE CLOCK  (sidebar today card)
───────────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(()=>{
    const n=new Date();
    return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
  });
  useEffect(()=>{
    const id=setInterval(()=>{
      const n=new Date();
      setTime(`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`);
    },30000);
    return ()=>clearInterval(id);
  },[]);
  return (
    <span style={{fontSize:12,color:"#9E9E9E",fontFamily:"'Noto Sans KR',sans-serif",fontWeight:300,letterSpacing:.5}}>
      {time}
    </span>
  );
}

/* ─────────────────────────────────────────────────────
   RANDOM REVIEW CARD  (sidebar bottom)
───────────────────────────────────────────────────── */
function RandomReview({ events, onOpen }) {
  const pool = events.filter(e=>e.category==="archive"&&e.sub_category==="review");
  const [idx, setIdx] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (pool.length > 0 && !initialized.current) {
      initialized.current = true;
      setIdx(Math.floor(Math.random() * pool.length));
    }
  }, [pool.length]);

  if(!pool.length) return null;
  const ev = pool[idx % pool.length];
  const cat = catOf(ev.category||ev.cat, ev.sub_category||ev.sub);
  const snippet = ev.detail ? ev.detail.split("\n").slice(0,2).join(" · ") : ev.title;
  return (
    <div style={{background:cat.bg,borderRadius:10,padding:"11px 12px",border:`1px solid ${cat.color}22`,marginTop:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:9,color:cat.text,fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>리뷰</span>
        <button onClick={()=>setIdx(i=>(i+1)%pool.length)} style={{
          background:"transparent",border:`1px solid ${cat.color}44`,
          borderRadius:6,padding:"2px 7px",cursor:"pointer",
          fontSize:9,color:T.textSub,
        }}>다음</button>
      </div>
      <div
        onClick={()=>onOpen&&onOpen(ev)}
        style={{
          fontSize:12,color:T.text,fontWeight:500,marginBottom:4,lineHeight:1.4,
          cursor:"pointer",
          textDecoration:"underline",textDecorationColor:cat.color+"66",
          textUnderlineOffset:2,
        }}
      >{ev.title}</div>
      {snippet&&snippet!==ev.title&&(
        <div style={{fontSize:10,color:T.textSub,lineHeight:1.5,
          display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"
        }}>{snippet}</div>
      )}
      <div style={{fontSize:9,color:T.textMute,marginTop:5}}>{cat.label} · {ev.date}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   TOEIC WORD BANK — 100개
───────────────────────────────────────────────────── */
const TOEIC_WORDS = [
  {word:"abandon",meaning:"포기하다, 버리다"},
  {word:"accelerate",meaning:"가속하다, 촉진하다"},
  {word:"accommodate",meaning:"수용하다, 편의를 제공하다"},
  {word:"accomplish",meaning:"성취하다, 완수하다"},
  {word:"acquire",meaning:"획득하다, 습득하다"},
  {word:"adjacent",meaning:"인접한, 근접한"},
  {word:"allocate",meaning:"할당하다, 배분하다"},
  {word:"anticipate",meaning:"예상하다, 기대하다"},
  {word:"apparent",meaning:"명백한, 외견상의"},
  {word:"appreciate",meaning:"감사하다, 가치를 인정하다"},
  {word:"appropriate",meaning:"적절한, 알맞은"},
  {word:"approximately",meaning:"대략, 약"},
  {word:"authorize",meaning:"승인하다, 권한을 부여하다"},
  {word:"available",meaning:"이용 가능한, 구할 수 있는"},
  {word:"beneficial",meaning:"유익한, 이로운"},
  {word:"brief",meaning:"간단한, 짧은; 요약하다"},
  {word:"budget",meaning:"예산; 예산을 세우다"},
  {word:"calculate",meaning:"계산하다, 추정하다"},
  {word:"candidate",meaning:"후보자, 지원자"},
  {word:"capacity",meaning:"수용력, 능력, 용량"},
  {word:"category",meaning:"범주, 분류"},
  {word:"circumstances",meaning:"상황, 환경"},
  {word:"collaborate",meaning:"협력하다, 공동 작업하다"},
  {word:"communicate",meaning:"의사소통하다, 전달하다"},
  {word:"compensation",meaning:"보상, 급여, 보수"},
  {word:"competitive",meaning:"경쟁적인, 경쟁력 있는"},
  {word:"complete",meaning:"완료하다, 완성하다; 완전한"},
  {word:"comply",meaning:"따르다, 준수하다"},
  {word:"concentrate",meaning:"집중하다, 농축하다"},
  {word:"confirm",meaning:"확인하다, 확정하다"},
  {word:"considerable",meaning:"상당한, 중요한"},
  {word:"consistently",meaning:"일관되게, 꾸준히"},
  {word:"contract",meaning:"계약(서); 계약을 맺다"},
  {word:"contribute",meaning:"기여하다, 공헌하다"},
  {word:"convenient",meaning:"편리한, 간편한"},
  {word:"coordinate",meaning:"조율하다, 조정하다"},
  {word:"corporate",meaning:"기업의, 법인의"},
  {word:"currently",meaning:"현재, 지금"},
  {word:"deadline",meaning:"마감일, 기한"},
  {word:"decrease",meaning:"감소하다, 줄다; 감소"},
  {word:"delegate",meaning:"위임하다; 대표, 대리인"},
  {word:"demonstrate",meaning:"증명하다, 시연하다"},
  {word:"determine",meaning:"결정하다, 판단하다"},
  {word:"develop",meaning:"개발하다, 발전시키다"},
  {word:"diverse",meaning:"다양한, 여러 종류의"},
  {word:"document",meaning:"문서; 기록하다"},
  {word:"efficient",meaning:"효율적인, 능률적인"},
  {word:"eligible",meaning:"자격이 있는, 적합한"},
  {word:"emphasize",meaning:"강조하다, 역설하다"},
  {word:"enable",meaning:"가능하게 하다, 허용하다"},
  {word:"enhance",meaning:"향상시키다, 높이다"},
  {word:"ensure",meaning:"보장하다, 확실히 하다"},
  {word:"establish",meaning:"설립하다, 확립하다"},
  {word:"evaluate",meaning:"평가하다, 검토하다"},
  {word:"exceed",meaning:"초과하다, 능가하다"},
  {word:"expand",meaning:"확장하다, 늘리다"},
  {word:"expertise",meaning:"전문 지식, 전문성"},
  {word:"facilitate",meaning:"용이하게 하다, 촉진하다"},
  {word:"flexible",meaning:"유연한, 융통성 있는"},
  {word:"forecast",meaning:"예측하다; 예보, 전망"},
  {word:"generate",meaning:"생성하다, 일으키다"},
  {word:"genuine",meaning:"진짜의, 진정한"},
  {word:"guarantee",meaning:"보장하다; 보증"},
  {word:"identify",meaning:"확인하다, 파악하다"},
  {word:"implement",meaning:"실행하다, 이행하다"},
  {word:"improve",meaning:"개선하다, 향상시키다"},
  {word:"indicate",meaning:"나타내다, 표시하다"},
  {word:"initiative",meaning:"주도권, 계획, 솔선수범"},
  {word:"integrate",meaning:"통합하다, 합치다"},
  {word:"inventory",meaning:"재고, 목록"},
  {word:"investigate",meaning:"조사하다, 수사하다"},
  {word:"maintain",meaning:"유지하다, 관리하다"},
  {word:"mandatory",meaning:"의무적인, 필수의"},
  {word:"manufacture",meaning:"제조하다; 제조업"},
  {word:"maximize",meaning:"극대화하다, 최대화하다"},
  {word:"negotiate",meaning:"협상하다, 교섭하다"},
  {word:"objective",meaning:"목표, 목적; 객관적인"},
  {word:"obtain",meaning:"얻다, 획득하다"},
  {word:"operate",meaning:"운영하다, 작동하다"},
  {word:"organize",meaning:"조직하다, 정리하다"},
  {word:"participate",meaning:"참가하다, 참여하다"},
  {word:"perform",meaning:"수행하다, 공연하다"},
  {word:"potential",meaning:"잠재적인; 가능성, 잠재력"},
  {word:"priority",meaning:"우선순위, 최우선 사항"},
  {word:"procedure",meaning:"절차, 과정"},
  {word:"productivity",meaning:"생산성, 생산력"},
  {word:"promote",meaning:"촉진하다, 승진시키다"},
  {word:"proposal",meaning:"제안, 제의"},
  {word:"qualify",meaning:"자격을 갖추다, 적합하다"},
  {word:"recommend",meaning:"추천하다, 권장하다"},
  {word:"recruit",meaning:"채용하다; 신입, 신병"},
  {word:"relevant",meaning:"관련된, 적절한"},
  {word:"require",meaning:"필요로 하다, 요구하다"},
  {word:"revenue",meaning:"수익, 수입"},
  {word:"schedule",meaning:"일정; 계획하다, 예정하다"},
  {word:"significant",meaning:"중요한, 상당한"},
  {word:"strategy",meaning:"전략, 방략"},
  {word:"sufficient",meaning:"충분한, 족한"},
  {word:"sustainable",meaning:"지속 가능한"},
  {word:"thoroughly",meaning:"철저히, 완전히"},
  {word:"transfer",meaning:"이전하다, 옮기다; 이전"},
];

function WordSection() {
  const [idx, setIdx] = useState(()=>Math.floor(Math.random()*TOEIC_WORDS.length));
  const word = TOEIC_WORDS[idx];
  const [show, setShow] = useState(false);

  const next = () => {
    setIdx(i=>(i+1)%TOEIC_WORDS.length);
    setShow(false);
  };
  const prev = () => {
    setIdx(i=>(i-1+TOEIC_WORDS.length)%TOEIC_WORDS.length);
    setShow(false);
  };

  return (
    <div style={{
      background:T.bgCard, borderRadius:10, padding:"11px 12px",
      border:`1px solid ${T.border}`, marginTop:8,
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:9,color:T.textMute,fontWeight:500,letterSpacing:.5,textTransform:"uppercase"}}>토익 단어</span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={prev} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:5,padding:"1px 7px",cursor:"pointer",fontSize:11,color:T.textMute}}>‹</button>
          <button onClick={next} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:5,padding:"1px 7px",cursor:"pointer",fontSize:11,color:T.textMute}}>›</button>
        </div>
      </div>
      <div style={{fontFamily:"'Libre Baskerville',Georgia,serif",fontSize:16,color:T.text,fontWeight:600,marginBottom:4}}>
        {word.word}
      </div>
      {show ? (
        <div style={{fontSize:12,color:T.textSub,lineHeight:1.5}}>{word.meaning}</div>
      ) : (
        <button onClick={()=>setShow(true)} style={{
          fontSize:11,color:T.textMute,background:"transparent",
          border:`1px dashed ${T.borderMid}`,borderRadius:6,
          padding:"3px 10px",cursor:"pointer",width:"100%",
        }}>뜻 보기</button>
      )}
      <div style={{fontSize:9,color:T.textMute,marginTop:6,textAlign:"right"}}>{idx+1}/100</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   WEIGHT CHART — Supabase 연동
───────────────────────────────────────────────────── */
function WeightSection() {
  const { logs } = useWeightLogs();
  const catHealth = { color:"#D4867E", bg:"#FEF5F4", text:"#9B3D33" };

  if(!logs.length) return (
    <div style={{background:catHealth.bg,borderRadius:10,padding:"12px 10px",border:`1px solid ${catHealth.color}22`,marginBottom:8}}>
      <div style={{fontSize:9,color:catHealth.text,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>체중</div>
      <div style={{fontSize:11,color:T.textMute}}>기록 없음</div>
    </div>
  );

  const latest = logs[logs.length-1];
  const chartData = logs.map(l=>({
    label:`${new Date(l.date).getMonth()+1}/${new Date(l.date).getDate()}`,
    weight:l.weight,
    actual:true,
  }));
  const weights = logs.map(l=>l.weight);
  const min = Math.min(...weights) - .8;
  const max = Math.max(...weights) + .5;
  const avg = +(weights.reduce((a,w)=>a+w,0)/weights.length).toFixed(1);

  const CustomDot=(props)=>{
    const{cx,cy}=props;
    return <circle cx={cx} cy={cy} r={4} fill={catHealth.color} stroke={T.bgCard} strokeWidth={2}/>;
  };
  const CustomTip=({active,payload})=>{
    if(!active||!payload?.length)return null;
    const d=payload[0].payload;
    return(
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:11}}>
        <div style={{color:T.textMute}}>{d.label}</div>
        <div style={{color:catHealth.color,fontWeight:700}}>{d.weight}kg</div>
      </div>
    );
  };

  return(
    <div style={{background:catHealth.bg,borderRadius:10,padding:"12px 10px",border:`1px solid ${catHealth.color}22`,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,alignItems:"center"}}>
        <span style={{fontSize:9,color:catHealth.text,fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>체중</span>
        <span style={{fontSize:9,color:catHealth.text,fontWeight:400,opacity:.7}}>{latest.weight}kg</span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={chartData} margin={{top:2,right:4,left:-28,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="label" tick={{fontSize:8,fill:T.textMute}} interval={Math.max(0,Math.floor(logs.length/4))}/>
          <YAxis domain={[min,max]} tick={{fontSize:8,fill:T.textMute}}/>
          <Tooltip content={<CustomTip/>}/>
          <ReferenceLine y={avg} stroke={catHealth.color+"55"} strokeDasharray="3 3"/>
          <Line type="monotone" dataKey="weight" stroke={catHealth.color} strokeWidth={1.5} dot={<CustomDot/>} activeDot={{r:4}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


/* ─────────────────────────────────────────────────────
   IMAGE UPLOAD
───────────────────────────────────────────────────── */
const IMAGE_CATS = new Set(["event","archive"]);

function ImageUpload({ images, onChange, catColor }) {
  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file=>{
      const reader = new FileReader();
      reader.onload = (ev) => {
        onChange(prev=>[...prev, {src:ev.target.result, name:file.name}]);
      };
      reader.readAsDataURL(file);
    });
  };
  const remove = (i) => onChange(prev=>prev.filter((_,idx)=>idx!==i));
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11,color:T.textSub,fontWeight:500,marginBottom:6}}>이미지 첨부</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {images.map((img,i)=>(
          <div key={i} style={{position:"relative",width:64,height:64,borderRadius:8,overflow:"hidden",border:`1px solid ${T.border}`}}>
            <img src={img.src} alt={img.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <button onClick={()=>remove(i)} style={{
              position:"absolute",top:2,right:2,
              width:16,height:16,borderRadius:"50%",
              background:"rgba(44,40,37,0.7)",border:"none",
              color:"white",fontSize:9,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>✕</button>
          </div>
        ))}
        <label style={{
          width:64,height:64,borderRadius:8,cursor:"pointer",
          border:`1.5px dashed ${catColor||T.borderMid}`,
          background:T.bgSub,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:3,color:T.textMute,fontSize:10,flexShrink:0,
        }}>
          <span style={{fontSize:18,lineHeight:1,color:catColor||T.borderMid}}>+</span>
          <span>사진</span>
          <input type="file" accept="image/*" multiple onChange={handleFiles} style={{display:"none"}}/>
        </label>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ADD MODAL — 새 카테고리 구조
───────────────────────────────────────────────────── */
function AddModal({ onClose, onSaved, presetDate, presetHour }) {
  const [cat, setCat] = useState("schedule");
  const [archiveSub, setArchiveSub] = useState("health");
  const [healthSub, setHealthSub] = useState("weight");
  const [reviewSub, setReviewSub] = useState("book");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [fields, setFields] = useState({});
  const [images, setImages] = useState([]);
  const [date, setDate] = useState(presetDate||new Date().toISOString().slice(0,10));
  const [hour, setHour] = useState(presetHour||"09");
  const [saving, setSaving] = useState(false);

  const setField = (k,v) => setFields(f=>({...f,[k]:v}));

  // 현재 선택된 색상 계산
  const currentColor = () => {
    if(cat==="archive") return ARCHIVE_SUBS.find(s=>s.id===archiveSub)||ARCHIVE_SUBS[0];
    return CATS.find(c=>c.id===cat)||CATS[0];
  };
  const c = currentColor();

  // 저장
  const handleSave = async () => {
    // 제목 입력이 없는 섹션은 날짜 기반으로 자동 생성
    let finalTitle = title.trim();
    if (!finalTitle) {
      if (cat === "archive") {
        if (archiveSub === "health") {
          if (healthSub === "weight")          finalTitle = `체중 ${date}`;
          else if (healthSub === "diet")       finalTitle = `식단 ${date}`;
          else if (healthSub === "weight_training") finalTitle = `웨이트 ${date}`;
          else if (healthSub === "cardio")     finalTitle = `카디오 ${date}`;
        } else if (archiveSub === "economy") {
          finalTitle = `경제 ${date}`;
        } else if (archiveSub === "review") {
          if (reviewSub === "book")        finalTitle = fields.bookTitle || `책 리뷰 ${date}`;
          else if (reviewSub === "wine")   finalTitle = fields.wineName  || `와인 리뷰 ${date}`;
          else if (reviewSub === "coffee") finalTitle = fields.cafe      || `커피 ${date}`;
        }
      }
    }
    if (!finalTitle) return;

    setSaving(true);
    try {
      const sub = cat==="archive"
        ? (archiveSub==="health" ? healthSub : archiveSub==="review" ? reviewSub : "economy")
        : null;

      // 체중인 경우 weight_logs에도 저장
      if(cat==="archive" && archiveSub==="health" && healthSub==="weight" && fields.weight) {
        await upsertWeight(date, parseFloat(fields.weight), detail);
      }

      // parseInt("00")||9 = 9 이 되는 버그 방지 — NaN 체크로 교체
      const parsedHour = parseInt(hour, 10);

      await addEvent({
        category: cat,
        sub_category: sub,
        title: finalTitle,
        date,
        hour: isNaN(parsedHour) ? 9 : parsedHour,
        done: false,
        detail: detail||null,
        fields,
        images,
      });

      onSaved?.();
      onClose();
    } catch(e) {
      console.error("저장 실패:", e);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width:"100%", background:T.bgSub,
    border:`1px solid ${T.border}`, borderRadius:8,
    padding:"10px 12px", color:T.text, fontSize:13,
    outline:"none", boxSizing:"border-box",
    fontFamily:"'Noto Sans KR',sans-serif",
  };

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(44,40,37,0.4)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,
      backdropFilter:"blur(3px)",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.bgCard, borderRadius:18,
        width:400, maxWidth:"94vw", maxHeight:"90vh",
        boxShadow:"0 20px 60px rgba(44,40,37,0.18)",
        border:`1px solid ${T.border}`,
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* 헤더 */}
        <div style={{padding:"18px 20px 12px", borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:600,color:T.text,marginBottom:14,fontFamily:"'Libre Baskerville',serif"}}>
            새 기록
          </div>
          {/* 최상위 카테고리 */}
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {CATS.map(ct=>(
              <button key={ct.id} onClick={()=>setCat(ct.id)} style={{
                flex:1, padding:"7px 4px", borderRadius:9, cursor:"pointer", fontSize:12,
                background:cat===ct.id?ct.bg:T.bgSub,
                border:`1px solid ${cat===ct.id?ct.color+"88":T.border}`,
                color:cat===ct.id?ct.text:T.textSub, fontWeight:cat===ct.id?600:400,
              }}>{ct.label}</button>
            ))}
          </div>
          {/* 아카이브 서브 */}
          {cat==="archive" && (
            <div style={{display:"flex",gap:5}}>
              {ARCHIVE_SUBS.map(s=>(
                <button key={s.id} onClick={()=>setArchiveSub(s.id)} style={{
                  flex:1, padding:"5px 4px", borderRadius:7, cursor:"pointer", fontSize:11,
                  background:archiveSub===s.id?s.bg:T.bgSub,
                  border:`1px solid ${archiveSub===s.id?s.color+"88":T.border}`,
                  color:archiveSub===s.id?s.text:T.textSub, fontWeight:archiveSub===s.id?600:400,
                }}>{s.label}</button>
              ))}
            </div>
          )}
          {/* 건강 서브 */}
          {cat==="archive" && archiveSub==="health" && (
            <div style={{display:"flex",gap:4,marginTop:5}}>
              {HEALTH_SUBS.map(s=>(
                <button key={s.id} onClick={()=>setHealthSub(s.id)} style={{
                  flex:1, padding:"4px 2px", borderRadius:6, cursor:"pointer", fontSize:10,
                  background:healthSub===s.id?(ARCHIVE_SUBS.find(s2=>s2.id==="health")?.bg||"#E8F2FA"):T.bgSub,
                  border:`1px solid ${healthSub===s.id?(ARCHIVE_SUBS.find(s2=>s2.id==="health")?.color||"#2E6FA5")+"88":T.border}`,
                  color:healthSub===s.id?(ARCHIVE_SUBS.find(s2=>s2.id==="health")?.text||"#1A4E7A"):T.textSub, fontWeight:healthSub===s.id?600:400,
                }}>{s.label}</button>
              ))}
            </div>
          )}
          {/* 리뷰 서브 */}
          {cat==="archive" && archiveSub==="review" && (
            <div style={{display:"flex",gap:5,marginTop:5}}>
              {REVIEW_SUBS.map(s=>(
                <button key={s.id} onClick={()=>setReviewSub(s.id)} style={{
                  flex:1, padding:"4px 2px", borderRadius:6, cursor:"pointer", fontSize:10,
                  background:reviewSub===s.id?"#F3EBF8":T.bgSub,
                  border:`1px solid ${reviewSub===s.id?"#7E4FA088":T.border}`,
                  color:reviewSub===s.id?"#5A2E80":T.textSub, fontWeight:reviewSub===s.id?600:400,
                }}>{s.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* 폼 */}
        <div style={{flex:1, overflowY:"auto", padding:"14px 20px"}}>

          {/* ── 체중 ── */}
          {cat==="archive" && archiveSub==="health" && healthSub==="weight" && (
            <>
              <div style={{fontSize:11,color:T.textSub,marginBottom:6,fontWeight:500}}>체중 (kg)</div>
              <input type="number" step="0.1" placeholder="예) 71.2"
                style={{...inputStyle,marginBottom:10,fontSize:20,fontWeight:700,textAlign:"center"}}
                value={fields.weight||""} onChange={e=>setField("weight",e.target.value)}/>
              <textarea placeholder="메모 (선택)" rows={2}
                style={{...inputStyle,resize:"none",marginBottom:10}}
                value={detail} onChange={e=>setDetail(e.target.value)}/>
            </>
          )}

          {/* ── 식단 ── */}
          {cat==="archive" && archiveSub==="health" && healthSub==="diet" && (
            <>
              {[["breakfast","아침"],["lunch","점심"],["dinner","저녁"],["snack","간식"]].map(([k,label])=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4,fontWeight:500}}>{label}</div>
                  <input placeholder="메뉴 입력" style={{...inputStyle}}
                    value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
              <div style={{display:"flex",gap:7,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>총 칼로리</div>
                  <input placeholder="예) 2100kcal" style={{...inputStyle}} value={fields.calories||""} onChange={e=>setField("calories",e.target.value)}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>총 단백질</div>
                  <input placeholder="예) 170g" style={{...inputStyle}} value={fields.protein||""} onChange={e=>setField("protein",e.target.value)}/>
                </div>
              </div>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>특이사항</div>
              <input placeholder="과식, 음주, 생리 등" style={{...inputStyle,marginBottom:8}} value={fields.note||""} onChange={e=>setField("note",e.target.value)}/>
            </>
          )}

          {/* ── 웨이트 ── */}
          {cat==="archive" && archiveSub==="health" && healthSub==="weight_training" && (
            <>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:5,fontWeight:500}}>부위</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {["가슴","등","어깨","팔","하체","전신"].map(p=>(
                    <button key={p} onClick={()=>setField("part",p)} style={{
                      padding:"5px 12px",borderRadius:16,fontSize:11,cursor:"pointer",
                      background:fields.part===p?"#E8F2FA":T.bgSub,
                      border:`1px solid ${fields.part===p?"#2E6FA588":T.border}`,
                      color:fields.part===p?"#1A4E7A":T.textSub,
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:7,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>운동 시간</div>
                  <input placeholder="예) 60분" style={{...inputStyle}} value={fields.duration||""} onChange={e=>setField("duration",e.target.value)}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>컨디션</div>
                  <div style={{display:"flex",gap:4}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>setField("condition",n)} style={{
                        flex:1,padding:"8px 0",borderRadius:7,cursor:"pointer",fontSize:12,
                        background:fields.condition===n?"#E8F2FA":T.bgSub,
                        border:`1px solid ${fields.condition===n?"#2E6FA588":T.border}`,
                        color:fields.condition===n?"#1A4E7A":T.textSub,fontWeight:fields.condition===n?700:400,
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4,fontWeight:500}}>운동 기록</div>
              <textarea placeholder={`예)
스쿼트 (80kg, 8회, 4세트)
데드리프트 (100kg, 5회, 3세트)`} rows={4}
                style={{...inputStyle,resize:"vertical",marginBottom:8}}
                value={detail} onChange={e=>setDetail(e.target.value)}/>
            </>
          )}

          {/* ── 카디오 ── */}
          {cat==="archive" && archiveSub==="health" && healthSub==="cardio" && (
            <>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4,fontWeight:500}}>운동 종류</div>
              <div style={{display:"flex",gap:5,marginBottom:8}}>
                {["러닝","자전거","수영","기타"].map(t=>(
                  <button key={t} onClick={()=>setField("type",t)} style={{
                    flex:1,padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:11,
                    background:fields.type===t?"#E8F2FA":T.bgSub,
                    border:`1px solid ${fields.type===t?"#2E6FA588":T.border}`,
                    color:fields.type===t?"#1A4E7A":T.textSub,
                  }}>{t}</button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
                {[["distance","거리","예) 5km"],["avgSpeed","평균 속도","예) 5'36"/km"],["avgHr","평균 심박수","예) 158bpm"],["calories","칼로리","예) 320kcal"]].map(([k,label,ph])=>(
                  <div key={k}>
                    <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                    <input placeholder={ph} style={{...inputStyle}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                  </div>
                ))}
              </div>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>메모</div>
              <textarea placeholder="경로, 컨디션 등" rows={2} style={{...inputStyle,resize:"none",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
            </>
          )}

          {/* ── 경제 리뷰 ── */}
          {cat==="archive" && archiveSub==="economy" && (
            <>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4,fontWeight:500}}>주요 지수</div>
              <input placeholder="예) 코스피 2730 S&P 5300" style={{...inputStyle,marginBottom:8}} value={fields.index||""} onChange={e=>setField("index",e.target.value)}/>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>오늘의 키워드</div>
              <input placeholder="예) 금리 동결 실적 시즌" style={{...inputStyle,marginBottom:8}} value={fields.keyword||""} onChange={e=>setField("keyword",e.target.value)}/>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>오늘 요약</div>
              <textarea placeholder="오늘 시장 요약" rows={3} style={{...inputStyle,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>내일 주목할 것</div>
              <input placeholder="내일 주목 포인트" style={{...inputStyle,marginBottom:8}} value={fields.watchlist||""} onChange={e=>setField("watchlist",e.target.value)}/>
            </>
          )}

          {/* ── 책 리뷰 ── */}
          {cat==="archive" && archiveSub==="review" && reviewSub==="book" && (
            <>
              {[["bookTitle","책 제목",""],["author","작가",""],["genre","장르","예) 소설 경제 자기계발"]].map(([k,label,ph])=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                  <input placeholder={ph} style={{...inputStyle}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
              <div style={{display:"flex",gap:7,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>날짜</div>
                  <input placeholder="예) 5.1 ~ 5.20" style={{...inputStyle}} value={fields.period||""} onChange={e=>setField("period",e.target.value)}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>총점</div>
                  <div style={{display:"flex",gap:3}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>setField("score",n)} style={{
                        flex:1,padding:"8px 0",borderRadius:7,cursor:"pointer",fontSize:12,
                        background:fields.score===n?"#F3EBF8":T.bgSub,
                        border:`1px solid ${fields.score===n?"#7E4FA088":T.border}`,
                        color:fields.score===n?"#5A2E80":T.textSub,fontWeight:fields.score===n?700:400,
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>기록 (인상깊은 문장 등)</div>
              <textarea placeholder="인상 깊은 문장, 내용 메모" rows={3} style={{...inputStyle,resize:"vertical",marginBottom:8}} value={fields.record||""} onChange={e=>setField("record",e.target.value)}/>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>생각</div>
              <textarea placeholder="감상, 적용하고 싶은 점" rows={3} style={{...inputStyle,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
            </>
          )}

          {/* ── 와인 리뷰 ── */}
          {cat==="archive" && archiveSub==="review" && reviewSub==="wine" && (
            <>
              {[["wineName","와인명"],["vintage","빈티지"],["origin","생산지"],["grape","포도 품종"],["alcohol","알코올 도수"],["price","가격"]].map(([k,label])=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                  <input style={{...inputStyle}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>향</div>
              <input style={{...inputStyle,marginBottom:8}} value={fields.aroma||""} onChange={e=>setField("aroma",e.target.value)}/>
              {[["sweetness","당도"],["acidity","산도"],["tannin","타닌"],["body","바디감"],["score","총점"]].map(([k,label])=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label} /5</div>
                  <div style={{display:"flex",gap:4}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>setField(k,n)} style={{
                        flex:1,padding:"7px 0",borderRadius:7,cursor:"pointer",fontSize:12,
                        background:fields[k]===n?"#F3EBF8":T.bgSub,
                        border:`1px solid ${fields[k]===n?"#7E4FA088":T.border}`,
                        color:fields[k]===n?"#5A2E80":T.textSub,fontWeight:fields[k]===n?700:400,
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>푸드 페어링</div>
              <input style={{...inputStyle,marginBottom:8}} value={fields.pairing||""} onChange={e=>setField("pairing",e.target.value)}/>
              <div style={{display:"flex",gap:7,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>재구매 의향</div>
                  <div style={{display:"flex",gap:5}}>
                    {["Y","N"].map(v=>(
                      <button key={v} onClick={()=>setField("rebuy",v)} style={{
                        flex:1,padding:"8px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,
                        background:fields.rebuy===v?"#F3EBF8":T.bgSub,
                        border:`1px solid ${fields.rebuy===v?"#7E4FA088":T.border}`,
                        color:fields.rebuy===v?"#5A2E80":T.textSub,
                      }}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>메모</div>
              <textarea rows={2} style={{...inputStyle,resize:"none",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
              <ImageUpload images={images} onChange={setImages} catColor={c.color}/>
            </>
          )}

          {/* ── 커피 리뷰 ── */}
          {cat==="archive" && archiveSub==="review" && reviewSub==="coffee" && (
            <>
              {[["cafe","카페명"],["menu","메뉴"],["price","가격"]].map(([k,label])=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                  <input style={{...inputStyle}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
              <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>메모</div>
              <textarea rows={3} style={{...inputStyle,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
            </>
          )}

          {/* ── 일정/이벤트/기본 ── */}
          {(cat==="schedule" || cat==="event" || (cat==="archive" && archiveSub==="health" && !["weight","diet","weight_training","cardio"].includes(healthSub))) && (
            <>
              <input placeholder="제목 입력..." style={{...inputStyle,marginBottom:8}}
                value={title} onChange={e=>setTitle(e.target.value)}/>
              <textarea placeholder="상세 내용" rows={4}
                style={{...inputStyle,resize:"vertical",marginBottom:8}}
                value={detail} onChange={e=>setDetail(e.target.value)}/>
              {(cat==="event"||cat==="archive") && (
                <ImageUpload images={images} onChange={setImages} catColor={c.color}/>
              )}
            </>
          )}

          {/* 날짜/시간 — 항상 표시 */}
          <div style={{display:"flex",gap:7,marginTop:8}}>
            <input type="date" style={{flex:2,...inputStyle}}
              value={date} onChange={e=>setDate(e.target.value)}/>
            {!(cat==="archive" && archiveSub==="health" && healthSub==="weight") && (
              <input type="time" style={{flex:1,...inputStyle}}
                value={`${hour}:00`}
                onChange={e=>setHour(e.target.value.split(":")[0])}/>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div style={{
          padding:"12px 20px", borderTop:`1px solid ${T.border}`,
          display:"flex", gap:8, flexShrink:0, background:T.bgSub,
        }}>
          <button onClick={onClose} style={{
            flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
            background:"transparent", border:`1px solid ${T.borderMid}`,
            color:T.textSub, fontSize:13,
          }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
            background:c.color, border:"none", color:"white",
            fontSize:13, fontWeight:600,
            boxShadow:`0 3px 14px ${c.color}44`,
            opacity:saving?0.6:1,
          }}>{saving?"저장 중...":"저장"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   BRIEFING VIEW — 경제 브리핑 (하드코딩 예시)
───────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────
   BRIEFING — 폴백용 상수 (Supabase 데이터 없을 때만 사용)
───────────────────────────────────────────────────── */
const BRIEFING_FALLBACK = {
  headline: "브리핑을 불러오는 중입니다. 잠시 후 다시 확인해주세요.",
  sections: [
    { title:"세계정세",       summary:"데이터 없음", lines:["브리핑 준비 중"] },
    { title:"한국 증시",      summary:"데이터 없음", lines:["브리핑 준비 중"] },
    { title:"미장 지수",      summary:"데이터 없음", lines:["브리핑 준비 중"] },
    { title:"선물 파생",      summary:"데이터 없음", lines:["브리핑 준비 중"] },
    { title:"금리 환율 유가", summary:"데이터 없음", lines:["브리핑 준비 중"] },
    { title:"포트폴리오",     summary:"데이터 없음", lines:["브리핑 준비 중"] },
  ],
};



function BriefingSection({ section }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background:section.bg, borderRadius:12,
      border:`1px solid ${section.color}22`,
      marginBottom:8, overflow:"hidden",
    }}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 14px", cursor:"pointer",
      }}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <div style={{width:3,height:13,borderRadius:2,background:section.color,flexShrink:0}}/>
          <span style={{fontSize:12,fontWeight:700,color:section.color}}>{section.title}</span>
        </div>
        <span style={{fontSize:9,color:section.color,opacity:.6}}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{padding:"0 14px 12px",borderTop:`1px solid ${section.color}18`}}>
          {(() => {
            // DB 형식: { summary, lines } / 폴백 형식: { content: [...] }
            const items = Array.isArray(section.content) && section.content.length > 0
              ? section.content
              : [section.summary, ...(section.lines||[])].filter(Boolean);
            return items.filter(Boolean).map((line,i)=>(
              <div key={i} style={{
                marginTop: i===0?10:7,
                paddingLeft: i===0?0:10,
                borderLeft: i===0?"none":`2px solid ${section.color}55`,
              }}>
                <span style={{
                  fontSize:12,
                  color: i===0?section.color:T.text,
                  lineHeight:1.7,
                  fontWeight: i===0?700:400,
                  fontFamily:"'Noto Sans KR',sans-serif",
                }}>{line}</span>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function BriefingView() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(()=>{
    async function fetchBriefing() {
      try {
        // 오늘 KST 날짜
        const todayKST = new Date().toLocaleDateString("sv-SE", {timeZone:"Asia/Seoul"});

        // 1순위: 오늘 날짜 브리핑
        const { data: todayData } = await supabase
          .from("briefings")
          .select("*")
          .eq("date", todayKST)
          .single();

        if(todayData) {
          setBriefing({ ...todayData, isToday: true });
          return;
        }

        // 2순위: 가장 최근 브리핑 (휴일/주말 대비)
        const { data: latestData, error } = await supabase
          .from("briefings")
          .select("*")
          .order("date", { ascending: false })
          .limit(1)
          .single();

        if(error) throw error;

        // 며칠 전 데이터인지 계산 — KST 기준으로 통일
        const latestDate = new Date(latestData.date + "T00:00:00+09:00");
        const today = new Date(new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"}));
        const diffDays = Math.round((today - latestDate) / (1000*60*60*24));

        setBriefing({ ...latestData, isToday: false, diffDays });
      } catch(e) {
        console.error("브리핑 로드 실패:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBriefing();
  },[]);

  // 로딩 중
  if(loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200}}>
      <div style={{fontSize:13,color:T.textMute}}>브리핑 불러오는 중...</div>
    </div>
  );

  // 오류 or 데이터 없음 → 하드코딩 폴백
  const useFallback = error || !briefing;
  const headline  = useFallback ? BRIEFING_FALLBACK.headline : briefing.headline;
  const sections  = useFallback ? BRIEFING_FALLBACK.sections : briefing.sections;
  const dateLabel = useFallback ? "브리핑 대기 중" :
    new Date(briefing.date).toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Seoul"});
  const isStale   = !useFallback && !briefing.isToday;
  const diffDays  = (!useFallback && briefing?.diffDays) || 0;

  return (
    <div style={{overflowY:"auto",maxHeight:"calc(100vh - 155px)",paddingRight:4}}>
      {/* 날짜 + 배지 */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontFamily:"'Libre Baskerville',serif",fontSize:17,color:T.text,fontWeight:700}}>
          {dateLabel}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {useFallback&&(
            <span style={{fontSize:9,color:T.textMute}}>샘플 데이터</span>
          )}
          {isStale&&(
            <span style={{
              fontSize:9,padding:"2px 8px",borderRadius:10,
              background:"#B07D2E22",color:"#B07D2E",border:"1px solid #B07D2E44",
            }}>{diffDays}일 전</span>
          )}
          {!useFallback&&briefing.isToday&&(
            <span style={{
              fontSize:9,padding:"2px 8px",borderRadius:10,
              background:"#6B7C3A22",color:"#6B7C3A",border:"1px solid #6B7C3A44",
            }}>오늘</span>
          )}
          <div style={{
            fontSize:10,padding:"3px 11px",borderRadius:20,
            background:"#6B7C3A22",color:"#6B7C3A",border:"1px solid #6B7C3A44",fontWeight:600,
          }}>AI 브리핑</div>
        </div>
      </div>



      {/* 핵심 한 줄 */}
      <div style={{
        background:"#3A3228",borderRadius:12,padding:"13px 16px",
        marginBottom:14,border:"1px solid #5a4e44",
      }}>
        <div style={{
          fontSize:10,color:"#6B7C3A",fontWeight:700,
          letterSpacing:.8,textTransform:"uppercase",marginBottom:7,
        }}>핵심 한 줄</div>
        <div style={{
          fontSize:13,color:"#EDE6DC",lineHeight:1.75,
          fontFamily:"'Noto Sans KR',sans-serif",fontStyle:"italic",
        }}>{headline}</div>
      </div>

      {/* 섹션별 브리핑 */}
      {sections.map((s,i)=>{
        const COLORS = {
          "세계정세":       {color:"#C0443A",bg:"#FDECEA"},  // 빨
          "한국증시":       {color:"#C96A2A",bg:"#FDF1E8"},  // 주황
          "한국 증시":      {color:"#C96A2A",bg:"#FDF1E8"},  // 주황
          "미장지수":       {color:"#B09520",bg:"#FBF8E3"},  // 노랑
          "미장 지수":      {color:"#B09520",bg:"#FBF8E3"},  // 노랑
          "선물파생":       {color:"#4A8A5A",bg:"#EBF5EE"},  // 초록
          "선물 파생":      {color:"#4A8A5A",bg:"#EBF5EE"},  // 초록
          "금리환율유가":   {color:"#2E6FA5",bg:"#E8F2FA"},  // 파랑
          "금리 환율 유가": {color:"#2E6FA5",bg:"#E8F2FA"},  // 파랑
          "포트폴리오":     {color:"#3A52A0",bg:"#EAECF8"},  // 남색
          "포트폴리오 영향":{color:"#3A52A0",bg:"#EAECF8"},  // 남색
        };
        const c = COLORS[s.title] || {color:"#6B7B8D",bg:"#EFF1F4"};
        return <BriefingSection key={i} section={{...s, ...c}}/>;
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   BOTTOM TAB BAR (모바일 전용)
───────────────────────────────────────────────────── */
const TAB_ITEMS = [
  { id:"all",      label:"전체",    icon:"○", color:T.textSub },
  { id:"briefing", label:"브리핑",  icon:"◈", color:"#6B7C3A" },
  { id:"schedule", label:"일정",    icon:"○", color:"#C0443A" },
  { id:"event",    label:"이벤트",  icon:"○", color:"#B09520" },
  { id:"archive",  label:"아카이브", icon:"○", color:"#4A8A5A" },
  { id:"more",     label:"더보기",  icon:"≡", color:T.textSub },
];

function BottomTabBar({ filterCat, showBriefing, setFilterCat, setShowBriefing, setShowMoreSheet }) {
  const tabs = TAB_ITEMS;
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:200,
      background:T.bgCard,
      borderTop:`1px solid ${T.border}`,
      display:"flex",
      paddingBottom:"env(safe-area-inset-bottom)",
      boxShadow:"0 -2px 12px rgba(44,40,37,0.08)",
    }}>
      {tabs.map(tab=>{
        const isActive = tab.id==="briefing"
          ? showBriefing
          : tab.id==="more"
          ? false
          : filterCat===tab.id&&!showBriefing;
        const cat = CATS.find(c=>c.id===tab.id);
        const activeColor = cat?.color || T.accent;
        return (
          <button key={tab.id} onClick={()=>{
            if(tab.id==="more") { setShowMoreSheet(s=>!s); return; }
            if(tab.id==="briefing") { setShowBriefing(true); setFilterCat("all"); return; }
            setShowBriefing(false); setFilterCat(tab.id);
          }} style={{
            flex:1, padding:"10px 4px 8px", border:"none", cursor:"pointer",
            background:"transparent",
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          }}>
            <div style={{
              width:28, height:28, borderRadius:8,
              background: isActive ? activeColor+"22" : "transparent",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16, color: isActive ? activeColor : T.textMute,
              transition:"all .12s",
            }}>{tab.icon}</div>
            <span style={{
              fontSize:9, color: isActive ? activeColor : T.textMute,
              fontWeight: isActive ? 600 : 400,
              fontFamily:"'Noto Sans KR',sans-serif",
            }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* 더보기 시트 (나머지 카테고리) */
function MoreSheet({ filterCat, showBriefing, setFilterCat, setShowBriefing, onClose }) {
  const moreCats = ARCHIVE_SUBS;
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(44,40,37,0.3)",
      zIndex:300, display:"flex", alignItems:"flex-end",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", background:T.bgCard,
        borderRadius:"16px 16px 0 0",
        padding:"16px 20px 32px",
        boxShadow:"0 -4px 24px rgba(44,40,37,0.12)",
      }}>
        <div style={{
          width:36, height:4, borderRadius:2,
          background:T.borderMid, margin:"0 auto 16px",
        }}/>
        <div style={{fontSize:12, color:T.textMute, marginBottom:12}}>카테고리</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8}}>
          {moreCats.map(cat=>{
            const active=filterCat===cat.id&&!showBriefing;
            return (
              <button key={cat.id} onClick={()=>{
                setFilterCat(cat.id); setShowBriefing(false); onClose();
              }} style={{
                padding:"12px 8px", borderRadius:12, cursor:"pointer",
                background:active?cat.bg:T.bgSub,
                border:`1px solid ${active?cat.color+"66":T.border}`,
                color:active?cat.text:T.textSub,
                fontSize:12, fontWeight:active?600:400,
                fontFamily:"'Noto Sans KR',sans-serif",
              }}>{cat.label}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────── */
export default function Yamlog() {
  const [view, setView] = useState("주");
  const [showBriefing, setShowBriefing] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [curDate, setCurDate] = useState(new Date(today));
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [presetDate, setPresetDate] = useState(null);
  const [presetHour, setPresetHour] = useState(null);
  const [archiveSub, setArchiveSub] = useState(null);

  // Supabase 데이터
  const { events, loading: eventsLoading, refetch: refetchEvents } = useEvents(
    showBriefing ? null : (filterCat === "all" ? null : filterCat),
    archiveSub
  );
  const isMobile = useIsMobile();

  const navigate = (dir) => {
    const d = new Date(curDate);
    if(view==="주") d.setDate(d.getDate()+dir*7);
    if(view==="월") d.setMonth(d.getMonth()+dir);
    if(view==="년") d.setFullYear(d.getFullYear()+dir);
    setCurDate(d);
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const headerLabel = () => {
    if(view==="주"){
      const days=getWeekDays(curDate);
      const wn=getWeekNumber(days[0]);
      return `${wn}W`;
    }
    if(view==="월") return `${curDate.getFullYear()}년 ${curDate.getMonth()+1}월`;
    if(view==="년") return `${curDate.getFullYear()}년`;
  };

  const todayEvs = events.filter(e=>e.date===dateStr(today));
  const doneCount = todayEvs.filter(e=>e.done).length;

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",fontFamily:"'Noto Sans KR',sans-serif",color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${T.bgSub};}
        ::-webkit-scrollbar-thumb{background:${T.borderMid};border-radius:2px;}
        input,textarea,button{font-family:'Noto Sans KR',sans-serif;}
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer;}
        button:focus{outline:none;}
      `}</style>

      {/* SIDEBAR */}
      {sideOpen && !isMobile && (
        <aside style={{
          width:220,flexShrink:0,
          background:T.bgSub,
          borderRight:`1px solid ${T.border}`,
          display:"flex",flexDirection:"column",
          position:"sticky",top:0,height:"100vh",overflowY:"auto",
        }}>
          {/* Logo C — frame corner, Y+L */}
          <div style={{padding:"18px 16px 16px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div style={{
                width:40,height:40,borderRadius:10,flexShrink:0,
                background:T.bgCard,border:`1px solid ${T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,lineHeight:1,
              }}>🌼</div>
              <div>
                <div style={{fontFamily:"'Libre Baskerville',Georgia,serif",fontSize:19,color:T.text,fontWeight:700,letterSpacing:1,lineHeight:1}}>Yamlog</div>
                <div style={{fontFamily:"'Noto Sans KR',sans-serif",fontSize:10,color:T.accent,letterSpacing:3,marginTop:3,lineHeight:1}}>얌로그</div>
              </div>
            </div>
            {/* 좋아하는 문장 */}
            <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${T.border}`}}>
              <div style={{fontSize:11,color:T.textSub,lineHeight:1.8,fontFamily:"'Noto Sans KR',sans-serif"}}>
                탁월함은 일시적 행위가 아니라<br/>우리를 정의하는 습관이다.
              </div>
              <div style={{fontSize:9.5,color:T.textMute,lineHeight:1.75,fontFamily:"'Libre Baskerville',Georgia,serif",fontStyle:"italic",marginTop:5}}>
                Arete is no fleeting act,<br/>but our defining habit.<br/>
                <span style={{fontSize:8.5}}>It is the stance of Mesotes,<br/>and the state of Eudaimonia.</span>
              </div>
            </div>
          </div>

          {/* Today card */}
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{
              background:T.bgCard,border:`1px solid ${T.border}`,
              borderRadius:12,padding:"12px 14px",
              boxShadow:"0 2px 8px rgba(44,40,37,0.05)",
            }}>
              <div style={{fontSize:9,color:T.textMute,marginBottom:3,letterSpacing:1,textTransform:"uppercase"}}>Today</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <div style={{fontFamily:"'Libre Baskerville',Georgia,serif",fontSize:30,color:T.text,lineHeight:1,fontWeight:600}}>
                  {today.getDate()}
                </div>
                <LiveClock/>
              </div>
              <div style={{fontSize:10,color:T.textMute,marginTop:5}}>
                {today.getFullYear()}. {today.getMonth()+1}&nbsp;&nbsp;
                <span style={{
                  color:"#4a5828",background:"#EEF2E8",
                  padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:600,
                }}>{doneCount}/{todayEvs.length}</span>
                <span style={{color:T.textMute}}> 완료</span>
              </div>
            </div>
          </div>

          {/* 빠른 링크 (데스크탑 전용) */}
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:9,color:T.textMute,letterSpacing:.5,textTransform:"uppercase",marginBottom:7}}>Quick Links</div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {[
                {label:"TickTick",  url:"https://ticktick.com/webapp#q/all/tasks", icon:"✓"},
                {label:"Naver Mail",url:"https://mail.naver.com",                  icon:"N"},
                {label:"Gmail",     url:"https://mail.google.com/mail/u/0/",       icon:"G"},
                {label:"Claude",    url:"https://claude.ai",                        icon:"◎"},
                {label:"Gemini",    url:"https://gemini.google.com",               icon:"✦"},
              ].map(link=>(
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display:"flex",alignItems:"center",gap:8,padding:"5px 8px",
                    borderRadius:7,textDecoration:"none",
                    color:T.textSub,fontSize:11,transition:"background .1s",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bgSub}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  <span style={{width:16,height:16,borderRadius:4,background:T.bgSub,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:9,color:T.accent,flexShrink:0,border:`1px solid ${T.border}`}}>
                    {link.icon}
                  </span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Nav */}
          <nav style={{padding:"10px 10px",flex:1}}>
            {/* 전체 보기 */}
            {[{id:"all",label:"전체 보기",color:T.textSub}].concat(
              [{id:"briefing",label:"브리핑",color:"#6B7C3A",bg:"#F2F5EA",text:"#4a5828"}],
              CATS,
            ).map(item=>{
              const isBriefing = item.id==="briefing";
              const active = isBriefing ? showBriefing : (filterCat===item.id&&!showBriefing&&archiveSub===null);
              const color = item.color||T.textSub;
              return (
                <button key={item.id} onClick={()=>{
                  if(isBriefing){setShowBriefing(true);setFilterCat("all");setArchiveSub(null);}
                  else{setFilterCat(item.id);setShowBriefing(false);setArchiveSub(null);}
                }} style={{
                  width:"100%",textAlign:"left",padding:"8px 12px",
                  borderRadius:9,marginBottom:2,cursor:"pointer",
                  background:active?(item.bg||T.bgCard):"transparent",
                  border:`1px solid ${active?(color+"44"):T.bgSub}`,
                  color:active?(item.text||color):T.textSub,
                  fontSize:13,display:"flex",alignItems:"center",gap:8,transition:"all .12s",
                  fontWeight:active?600:400,
                }}>
                  <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:active?color:T.borderMid}}/>
                  {item.label}
                </button>
              );
            })}
            {/* 아카이브 서브카테고리 */}
            {filterCat==="archive"&&!showBriefing&&(
              <div style={{paddingLeft:20,marginTop:2}}>
                {ARCHIVE_SUBS.map(sub=>{
                  const active=archiveSub===sub.id;
                  return(
                    <button key={sub.id} onClick={()=>setArchiveSub(active?null:sub.id)} style={{
                      width:"100%",textAlign:"left",padding:"6px 10px",
                      borderRadius:8,marginBottom:1,cursor:"pointer",
                      background:active?sub.bg:"transparent",
                      border:`1px solid ${active?sub.color+"44":T.bgSub}`,
                      color:active?sub.text:T.textSub,
                      fontSize:12,display:"flex",alignItems:"center",gap:7,
                      fontWeight:active?600:400,
                    }}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:active?sub.color:T.borderMid}}/>
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Weight chart + Word + Random review */}
          <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`}}>
            <WeightSection/>
            <WordSection/>
            <RandomReview events={events} onOpen={setShowDetail}/>
          </div>
        </aside>
      )}

      {/* MAIN */}
      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden",paddingBottom:isMobile?"68px":0}}>

        {/* Top bar */}
        <header style={{
          flexShrink:0,
          borderBottom:`1px solid ${T.border}`,
          background:T.bg, zIndex:10,
        }}>
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            padding:isMobile?"10px 12px":"12px 20px",
          }}>
            {!isMobile && (
              <button onClick={()=>setSideOpen(s=>!s)} style={{
                background:"transparent",border:"none",color:T.textMute,
                cursor:"pointer",fontSize:16,padding:"5px 7px",borderRadius:7,flexShrink:0,
              }}>
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                  <rect width="16" height="1.5" rx=".75" fill={T.textMute}/>
                  <rect y="5.25" width="16" height="1.5" rx=".75" fill={T.textMute}/>
                  <rect y="10.5" width="16" height="1.5" rx=".75" fill={T.textMute}/>
                </svg>
              </button>
            )}
            {/* 뷰 탭 */}
            <div style={{display:"flex",background:T.bgCard,borderRadius:8,padding:2,gap:1,border:`1px solid ${T.border}`,flexShrink:0}}>
              {VIEWS.map(v=>(
                <button key={v} onClick={()=>setView(v)} style={{
                  padding:isMobile?"6px 12px":"5px 12px",
                  borderRadius:6,fontSize:isMobile?13:12,cursor:"pointer",
                  background:view===v?T.accent:"transparent",
                  border:"none",color:view===v?"white":T.textSub,
                  fontWeight:view===v?600:400,
                }}>{v}</button>
              ))}
            </div>
            {/* 날짜 네비 */}
            <button onClick={()=>navigate(-1)} style={{
              background:T.bgCard,border:`1px solid ${T.border}`,
              color:T.textSub,cursor:"pointer",borderRadius:7,
              padding:"5px 10px",fontSize:14,flexShrink:0,
            }}>&#8249;</button>
            <div style={{
              fontFamily:"'Libre Baskerville',Georgia,serif",
              fontSize:isMobile?13:15,color:T.text,
              flex:1,textAlign:"center",fontWeight:600,letterSpacing:.2,
            }}>{headerLabel()}</div>
            <button onClick={()=>navigate(1)} style={{
              background:T.bgCard,border:`1px solid ${T.border}`,
              color:T.textSub,cursor:"pointer",borderRadius:7,
              padding:"5px 10px",fontSize:14,flexShrink:0,
            }}>&#8250;</button>
            <button onClick={()=>setCurDate(new Date(today))} style={{
              background:"#6B7C3A22",border:"1px solid #6B7C3A66",
              color:"#4a5828",cursor:"pointer",borderRadius:7,
              padding:"5px 10px",fontSize:11,fontWeight:600,flexShrink:0,
            }}>오늘</button>
            {/* 추가 버튼 */}
            <button onClick={()=>setShowModal(true)} style={{
              padding:isMobile?"7px 14px":"8px 16px",
              borderRadius:9,cursor:"pointer",flexShrink:0,
              background:T.accent,border:"none",color:"white",
              fontSize:isMobile?13:13,fontWeight:600,
              boxShadow:`0 2px 12px ${T.accent}44`,
            }}>+ 추가</button>
          </div>
        </header>

        {/* Category filter chips — 데스크탑만 */}
        {!isMobile && <div style={{
          display:"flex",gap:5,padding:"9px 20px",flexShrink:0,
          overflowX:"auto",borderBottom:`1px solid ${T.border}`,
          background:T.bg,
        }}>
          <button onClick={()=>{setFilterCat("all");setShowBriefing(false);setArchiveSub(null);}} style={{
            padding:"4px 14px",borderRadius:20,fontSize:11,cursor:"pointer",flexShrink:0,
            background:filterCat==="all"&&!showBriefing?T.text:T.bgCard,
            border:`1px solid ${filterCat==="all"&&!showBriefing?T.text:T.border}`,
            color:filterCat==="all"&&!showBriefing?"white":T.textSub,
            fontWeight:filterCat==="all"&&!showBriefing?600:400,
          }}>전체</button>
          {CATS.map(c=>{
            const active=filterCat===c.id&&!showBriefing&&archiveSub===null;
            return (
              <button key={c.id} onClick={()=>{setFilterCat(c.id);setShowBriefing(false);setArchiveSub(null);}} style={{
                padding:"4px 13px",borderRadius:20,fontSize:11,cursor:"pointer",flexShrink:0,
                background:active?c.bg:T.bgCard,
                border:`1px solid ${active?c.color+"88":T.border}`,
                color:active?c.text:T.textSub,
                fontWeight:active?600:400,transition:"all .12s",
              }}>{c.label}</button>
            );
          })}
          {/* 아카이브 서브 칩 */}
          {filterCat==="archive"&&!showBriefing&&ARCHIVE_SUBS.map(s=>{
            const active=archiveSub===s.id;
            return(
              <button key={s.id} onClick={()=>setArchiveSub(active?null:s.id)} style={{
                padding:"4px 11px",borderRadius:20,fontSize:10,cursor:"pointer",flexShrink:0,
                background:active?s.bg:T.bgSub,
                border:`1px solid ${active?s.color+"88":T.border}`,
                color:active?s.text:T.textMute,
                fontWeight:active?600:400,
              }}>{s.label}</button>
            );
          })}
        </div>}

        {/* View content */}
        <div style={{flex:1,padding:"16px 20px",overflow:"hidden"}}>
          {showBriefing ? (
            <BriefingView/>
          ) : (
            <>
              {view==="주" && <WeekView date={curDate} filterCat={filterCat} onOpen={setShowDetail} events={events}
              onCellClick={(d,h)=>{setPresetDate(dateStr(d));setPresetHour(String(h).padStart(2,"0"));setShowModal(true);}}
            />}
              {view==="월" && <MonthView date={curDate} filterCat={filterCat} onDayClick={d=>{setCurDate(d);setView("주");}} onOpen={setShowDetail} events={events}/>}
              {view==="년" && <YearView date={curDate} filterCat={filterCat} onOpen={setShowDetail} events={events}/>}
            </>
          )}
        </div>
      </main>

      {showModal && <AddModal onClose={()=>{setShowModal(false);setPresetDate(null);setPresetHour(null);}} onSaved={refetchEvents} presetDate={presetDate} presetHour={presetHour}/>}
      {showDetail && <DetailModal ev={showDetail} onClose={()=>setShowDetail(null)} onRefetch={refetchEvents}/>}
      {isMobile && (
        <BottomTabBar
          filterCat={filterCat}
          showBriefing={showBriefing}
          setFilterCat={setFilterCat}
          setShowBriefing={setShowBriefing}
          setShowMoreSheet={setShowMoreSheet}
        />
      )}
      {isMobile && showMoreSheet && (
        <MoreSheet
          filterCat={filterCat}
          showBriefing={showBriefing}
          setFilterCat={setFilterCat}
          setShowBriefing={setShowBriefing}
          onClose={()=>setShowMoreSheet(false)}
        />
      )}
    </div>
  );
}
