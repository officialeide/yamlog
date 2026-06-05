/* ─────────────────────────────────────────────────────
   APP.JSX — 캘린더 뷰, 아카이브 뷰, 메인 Yamlog 컴포넌트
───────────────────────────────────────────────────── */
import { useState, useMemo } from "react";
import {
  T, CATS, VIEWS, WEEKDAYS, MONTHS_KR, HOURS,
  today, catOf, dateStr, getWeekDays, getMonthCells,
} from "./constants.js";
import { useEvents, useIsMobile, addEvent } from "./api.js";
import {
  LiveClock, TaskChip, DetailModal, AddModal,
  WeightSection, WordSection, RandomReview,
  BriefingView, BottomTabBar,
} from "./components.jsx";

const todayStr = dateStr(today);

// ─── ISO 주차 계산 ──────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ─────────────────────────────────────────────────────
// WEEK VIEW — 단일 스크롤 시간 그리드
// ─────────────────────────────────────────────────────
function WeekView({ curDate, events, filterCat, onOpen, onAdd }) {
  const days = useMemo(() => getWeekDays(curDate), [curDate]);

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      {/* 요일/날짜 헤더 */}
      <div style={{
        display:"flex",flexShrink:0,
        borderBottom:`1px solid ${T.borderMid}`,
        paddingBottom:6,marginBottom:0,background:T.bg,
      }}>
        <div style={{width:28,flexShrink:0}}/>
        {days.map((d,i)=>{
          const ds=dateStr(d), isToday=ds===todayStr;
          const isWknd=d.getDay()===0||d.getDay()===6;
          return (
            <div key={i} style={{flex:1,textAlign:"center",padding:"4px 2px"}}>
              <div style={{
                display:"inline-flex",flexDirection:"column",alignItems:"center",
                background:isToday?T.accent:"transparent",
                borderRadius:8,padding:"4px 5px",minWidth:30,
              }}>
                <div style={{fontSize:9,color:isToday?"#fff":isWknd?d.getDay()===0?"#C0443A":"#2E6FA5":T.textMute}}>
                  {WEEKDAYS[d.getDay()]}
                </div>
                <div style={{fontSize:13,fontWeight:isToday?700:400,color:isToday?"#fff":T.text}}>
                  {d.getDate()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 시간 그리드 — 전체가 하나로 스크롤 */}
      <div style={{flex:1,overflowY:"auto"}}>
        {HOURS.map(h=>(
          <div key={h} style={{display:"flex",minHeight:44,borderBottom:`1px solid ${T.border}`}}>
            {/* 시간 레이블 */}
            <div style={{
              width:28,flexShrink:0,paddingTop:3,paddingRight:4,
              textAlign:"right",fontSize:8,color:T.textMute,
            }}>
              {h%3===0?String(h).padStart(2,"0"):""}
            </div>
            {/* 날짜별 셀 */}
            {days.map((d,i)=>{
              const ds=dateStr(d), isToday=ds===todayStr;
              const evs=events.filter(e=>
                e.date===ds&&e.hour===h&&(filterCat==="all"||e.category===filterCat)
              );
              return (
                <div key={i}
                  onClick={()=>onAdd(ds,h)}
                  style={{
                    flex:1,minWidth:0,borderLeft:`1px solid ${T.border}`,
                    padding:"2px 2px",cursor:"pointer",
                    background:isToday?T.accent+"08":"transparent",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background=isToday?T.accent+"14":T.bgSub}
                  onMouseLeave={e=>e.currentTarget.style.background=isToday?T.accent+"08":"transparent"}
                >
                  {evs.map(ev=>{
                    const cat=catOf(ev.category,ev.sub_category);
                    return (
                      <div key={ev.id}
                        onClick={e=>{e.stopPropagation();onOpen(ev);}}
                        style={{
                          fontSize:9,padding:"1px 4px",borderRadius:3,marginBottom:1,
                          background:ev.done?T.bgSub:cat.bg,
                          color:ev.done?T.textMute:cat.text,
                          borderLeft:`2px solid ${ev.done?T.borderMid:cat.color}`,
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                          opacity:ev.done?0.55:1,cursor:"pointer",
                        }}
                        title={ev.title}
                      >{ev.title}</div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────────────────────
function MonthView({ curDate, events, filterCat, onOpen, onAdd }) {
  const cells = useMemo(()=>getMonthCells(curDate),[curDate]);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {WEEKDAYS.map((d,i)=>(
          <div key={d} style={{textAlign:"center",fontSize:11,padding:"4px 0",fontWeight:500,
            color:i===0?"#C0443A":i===6?"#2E6FA5":T.textSub}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const ds=dateStr(d), isToday=ds===todayStr;
          const allEvs=events.filter(e=>e.date===ds&&(filterCat==="all"||e.category===filterCat));
          const todoEvs=allEvs.filter(e=>!e.done), doneEvs=allEvs.filter(e=>e.done);
          const isWknd=d.getDay()===0||d.getDay()===6;
          return (
            <div key={i} onClick={()=>onAdd(ds,9)} style={{
              minHeight:80,borderRadius:8,padding:"4px 5px",cursor:"pointer",
              background:isToday?T.accent+"18":T.bgCard,
              border:`1px solid ${isToday?T.accent+"55":T.border}`,transition:"border-color .12s",
            }}
            onMouseEnter={e=>{if(!isToday)e.currentTarget.style.borderColor=T.accent+"55";}}
            onMouseLeave={e=>{if(!isToday)e.currentTarget.style.borderColor=T.border;}}>
              <div style={{fontSize:11,fontWeight:isToday?700:400,marginBottom:3,
                color:isToday?T.accent:isWknd?d.getDay()===0?"#C0443A":"#2E6FA5":T.text}}>
                {d.getDate()}
              </div>
              {todoEvs.map(ev=>{
                const cat=catOf(ev.category,ev.sub_category);
                return (
                  <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} style={{
                    fontSize:9,marginBottom:2,padding:"2px 5px",borderRadius:4,cursor:"pointer",
                    background:cat.bg,color:cat.text,border:`1px solid ${cat.color}33`,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                  }}>{ev.title}</div>
                );
              })}
              {doneEvs.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:2}}>
                  {doneEvs.map(ev=>{
                    const cat=catOf(ev.category,ev.sub_category);
                    return <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} style={{
                      width:7,height:7,borderRadius:"50%",background:cat.color+"88",cursor:"pointer",
                    }} title={ev.title}/>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// YEAR VIEW — 이벤트만 표시, 클릭 시 상세 표시
// ─────────────────────────────────────────────────────
function YearView({ curDate, events, onOpen }) {
  const year = curDate.getFullYear();
  const [clickedDay, setClickedDay] = useState(null);

  // 이벤트 카테고리만 필터
  const eventEvs = events.filter(e => e.category === "event");
  const dayDetail = clickedDay ? eventEvs.filter(e => e.date === clickedDay) : [];
  const eventCat  = CATS.find(c => c.id === "event") || CATS[0];

  return (
    <div>
      {/* 클릭된 날짜의 이벤트 상세 */}
      {clickedDay && dayDetail.length > 0 && (
        <div style={{
          background:eventCat.bg,borderRadius:10,padding:"12px 16px",
          border:`1px solid ${eventCat.color}33`,marginBottom:16,
        }}>
          <div style={{fontSize:11,color:eventCat.text,fontWeight:600,marginBottom:8}}>
            {clickedDay} 이벤트
          </div>
          {dayDetail.map(ev=>(
            <div key={ev.id} onClick={()=>onOpen(ev)} style={{
              display:"flex",gap:10,alignItems:"flex-start",
              padding:"7px 0",borderBottom:`1px solid ${eventCat.color}22`,
              cursor:"pointer",
            }}>
              <div style={{
                width:7,height:7,borderRadius:"50%",flexShrink:0,marginTop:4,
                background:eventCat.color,
              }}/>
              <div>
                <div style={{fontSize:13,color:T.text,fontWeight:500}}>{ev.title}</div>
                {ev.detail&&<div style={{fontSize:11,color:T.textSub,marginTop:2}}>{ev.detail.split("\n")[0]}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {clickedDay && dayDetail.length === 0 && (
        <div style={{padding:"8px 14px",borderRadius:10,background:T.bgCard,border:`1px solid ${T.border}`,
          marginBottom:14,fontSize:12,color:T.textMute}}>
          {clickedDay} — 이벤트 없음
        </div>
      )}

      {/* 12개월 미니 달력 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {Array.from({length:12},(_,m)=>m).map(m=>{
          const cells=getMonthCells(new Date(year,m,1));
          return (
            <div key={m} style={{background:T.bgCard,borderRadius:10,padding:"10px 8px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:11,fontWeight:600,color:T.textSub,marginBottom:6}}>{MONTHS_KR[m]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
                {cells.map((d,i)=>{
                  if(!d) return <div key={i}/>;
                  const ds=dateStr(d);
                  const hasEv=eventEvs.some(e=>e.date===ds);
                  const isSelected=clickedDay===ds;
                  const isTod=ds===todayStr;
                  return (
                    <div key={i}
                      onClick={()=>hasEv&&setClickedDay(isSelected?null:ds)}
                      style={{
                        fontSize:7,textAlign:"center",borderRadius:2,padding:"1px 0",
                        color:isTod?T.accent:hasEv?eventCat.color:T.textMute,
                        fontWeight:isTod||hasEv?700:400,
                        background:isSelected?eventCat.color+"22":isTod?T.accent+"22":"transparent",
                        cursor:hasEv?"pointer":"default",
                      }}
                    >{d.getDate()}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// ARCHIVE ENTRY CARD
// ─────────────────────────────────────────────────────
function ArchiveEntryCard({ ev, accentColor, onOpen }) {
  const f = ev.fields || {};
  const renderContent = () => {
    switch(ev.sub_category) {
      case "weight":
        return (
          <div>
            {f.weight&&<span style={{fontSize:22,fontWeight:700,color:accentColor,fontFamily:"'Libre Baskerville',serif"}}>{f.weight}<span style={{fontSize:13,fontWeight:400,marginLeft:3}}>kg</span></span>}
            {ev.detail&&<div style={{fontSize:12,color:T.textSub,marginTop:4}}>{ev.detail}</div>}
          </div>
        );
      case "diet": {
        const meals=[["breakfast","아침"],["lunch","점심"],["dinner","저녁"],["snack","간식"]];
        return (
          <div>
            {meals.filter(([k])=>f[k]).map(([k,label])=>(
              <div key={k} style={{fontSize:12,color:T.text,marginBottom:3,display:"flex",gap:8}}>
                <span style={{color:T.textMute,fontSize:10,minWidth:22}}>{label}</span><span>{f[k]}</span>
              </div>
            ))}
            {(f.calories||f.protein||f.sugar)&&<div style={{fontSize:10,color:T.textMute,marginTop:5,display:"flex",gap:10,flexWrap:"wrap"}}>
              {f.calories&&<span>🔥 {f.calories}</span>}
              {f.protein&&<span>💪 단백질 {f.protein}</span>}
              {f.sugar&&<span>🍬 당류 {f.sugar}</span>}
            </div>}
          </div>
        );
      }
      case "weight_training":
        return (
          <div>
            <div style={{display:"flex",gap:12,fontSize:12,color:T.text,marginBottom:5,flexWrap:"wrap"}}>
              {f.part&&<span><span style={{color:T.textMute,fontSize:10}}>부위 </span><span style={{fontWeight:600}}>{f.part}</span></span>}
              {f.duration&&<span><span style={{color:T.textMute,fontSize:10}}>시간 </span>{f.duration}</span>}
              {f.condition&&<span><span style={{color:T.textMute,fontSize:10}}>컨디션 </span>{"★".repeat(f.condition)}{"☆".repeat(5-f.condition)}</span>}
            </div>
            {ev.detail&&<pre style={{fontSize:11,color:T.textSub,whiteSpace:"pre-wrap",margin:0,lineHeight:1.7,fontFamily:"'Noto Sans KR',sans-serif"}}>{ev.detail}</pre>}
          </div>
        );
      case "cardio":
        return (
          <div>
            <div style={{display:"flex",gap:10,fontSize:12,color:T.text,flexWrap:"wrap",marginBottom:4}}>
              {f.type&&<span style={{fontWeight:600}}>{f.type}</span>}
              {f.distance&&<span><span style={{color:T.textMute,fontSize:10}}>거리 </span>{f.distance}</span>}
              {f.avgSpeed&&<span><span style={{color:T.textMute,fontSize:10}}>속도 </span>{f.avgSpeed}</span>}
              {f.avgHr&&<span><span style={{color:T.textMute,fontSize:10}}>심박 </span>{f.avgHr}</span>}
              {f.calories&&<span><span style={{color:T.textMute,fontSize:10}}>칼로리 </span>{f.calories}</span>}
            </div>
            {ev.detail&&<div style={{fontSize:11,color:T.textSub}}>{ev.detail}</div>}
          </div>
        );
      case "economy":
        return (
          <div>
            {f.index&&<div style={{fontSize:12,color:T.text,fontWeight:600,marginBottom:4}}>{f.index}</div>}
            {f.keyword&&<div style={{marginBottom:6}}>
              {f.keyword.split(/\s+/).filter(Boolean).map((kw,i)=>(
                <span key={i} style={{display:"inline-block",marginRight:4,padding:"2px 7px",borderRadius:10,fontSize:10,background:accentColor+"18",color:accentColor,border:`1px solid ${accentColor}33`}}>{kw}</span>
              ))}
            </div>}
            {ev.detail&&<div style={{fontSize:12,color:T.text,lineHeight:1.75}}>{ev.detail}</div>}
            {f.watchlist&&<div style={{fontSize:11,color:T.textMute,marginTop:6}}>내일 주목: {f.watchlist}</div>}
          </div>
        );
      case "book":
        return (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2,fontFamily:"'Libre Baskerville',serif"}}>
              {f.bookTitle||ev.title}{f.author&&<span style={{fontSize:11,fontWeight:400,color:T.textSub,fontFamily:"'Noto Sans KR',sans-serif"}}> · {f.author}</span>}
            </div>
            {(f.genre||f.period)&&<div style={{fontSize:10,color:T.textMute,marginBottom:5}}>{f.genre}{f.genre&&f.period&&" · "}{f.period}</div>}
            {f.score&&<div style={{fontSize:13,color:accentColor,marginBottom:4}}>{"★".repeat(f.score)}{"☆".repeat(5-f.score)}</div>}
            {ev.detail&&<div style={{fontSize:12,color:T.textSub,lineHeight:1.7}}>{ev.detail}</div>}
          </div>
        );
      case "wine":
        return (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2,fontFamily:"'Libre Baskerville',serif"}}>
              {f.wineName||ev.title}{f.vintage&&<span style={{fontSize:11,fontWeight:400,color:T.textSub,fontFamily:"'Noto Sans KR',sans-serif"}}> {f.vintage}</span>}
            </div>
            {(f.origin||f.grape)&&<div style={{fontSize:10,color:T.textMute,marginBottom:5}}>{f.origin}{f.origin&&f.grape&&" · "}{f.grape}</div>}
            {f.score&&<div style={{fontSize:13,color:accentColor,marginBottom:4}}>{"★".repeat(f.score)}{"☆".repeat(5-f.score)}</div>}
            {ev.detail&&<div style={{fontSize:12,color:T.textSub}}>{ev.detail}</div>}
          </div>
        );
      case "coffee":
        return (
          <div>
            {f.cafe&&<div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:2}}>{f.cafe}</div>}
            {(f.menu||f.price)&&<div style={{fontSize:12,color:T.textSub,marginBottom:3}}>{f.menu}{f.menu&&f.price&&" · "}{f.price}</div>}
            {ev.detail&&<div style={{fontSize:12,color:T.textSub}}>{ev.detail}</div>}
          </div>
        );
      default:
        return ev.detail?<div style={{fontSize:12,color:T.textSub,lineHeight:1.75}}>{ev.detail}</div>:null;
    }
  };

  return (
    <div onClick={()=>onOpen&&onOpen(ev)} style={{
      background:T.bgCard,borderRadius:10,padding:"12px 14px",
      border:`1px solid ${T.border}`,borderLeft:`3px solid ${accentColor}`,
      cursor:"pointer",transition:"box-shadow .12s",boxShadow:"0 1px 4px rgba(44,40,37,0.05)",
    }}
    onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 18px ${accentColor}22`}
    onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(44,40,37,0.05)"}>
      <div style={{fontSize:10,color:T.textMute,marginBottom:7}}>{ev.date}</div>
      {renderContent()}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// ARCHIVE VIEW — 초/파/남/보 색상, 4섹션 탭
// ─────────────────────────────────────────────────────
const ARCHIVE_SECTS = [
  { id:"health",  label:"건강", color:"#4A8A5A", bg:"#EBF5EE", text:"#2E6640",  subs:["weight","diet","weight_training","cardio"] },
  { id:"economy", label:"경제", color:"#2E6FA5", bg:"#E8F2FA", text:"#1A4E7A",  subs:["economy"] },
  { id:"review",  label:"리뷰", color:"#1A4080", bg:"#E5EAF5", text:"#0F2A60",  subs:["book","wine","coffee"] },
  { id:"etc",     label:"기타", color:"#7E4FA0", bg:"#F3EBF8", text:"#5A2E80",  subs:null },
];
const KNOWN_SUBS = ["weight","diet","weight_training","cardio","economy","book","wine","coffee"];

function ArchiveView({ events, onOpen, onAddFromArchive }) {
  const [activeSec, setActiveSec] = useState("health");
  const archiveEvs = events.filter(e => e.category === "archive");

  const filtered = archiveEvs.filter(e=>{
    const sec=ARCHIVE_SECTS.find(s=>s.id===activeSec);
    if(!sec) return false;
    if(sec.subs===null) return !KNOWN_SUBS.includes(e.sub_category);
    return sec.subs.includes(e.sub_category);
  }).sort((a,b)=>b.date.localeCompare(a.date));

  const activeDef = ARCHIVE_SECTS.find(s=>s.id===activeSec);

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      {/* 헤더: 섹션 탭 + 추가 버튼 */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexShrink:0,alignItems:"stretch"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,flex:1}}>
        {ARCHIVE_SECTS.map(sec=>{
          const count=archiveEvs.filter(e=>sec.subs===null?!KNOWN_SUBS.includes(e.sub_category):sec.subs.includes(e.sub_category)).length;
          const active=activeSec===sec.id;
          return (
            <button key={sec.id} onClick={()=>setActiveSec(sec.id)} style={{
              padding:"14px 6px",borderRadius:12,cursor:"pointer",
              background:active?sec.color:T.bgCard,
              border:`1px solid ${active?sec.color:T.border}`,
              color:active?"white":T.textSub,fontWeight:active?700:400,
              fontSize:14,fontFamily:"'Noto Sans KR',sans-serif",
              display:"flex",flexDirection:"column",alignItems:"center",gap:4,
              boxShadow:active?`0 4px 18px ${sec.color}44`:"none",transition:"all .15s",
            }}>
              {sec.label}
              {count>0&&<span style={{fontSize:9,opacity:.75}}>{count}개</span>}
            </button>
          );
        })}
      </div>
      {/* + 추가 버튼 */}
      <button onClick={()=>onAddFromArchive&&onAddFromArchive(activeSec)} style={{
        padding:"0 14px",borderRadius:12,cursor:"pointer",
        background:activeDef?.color||T.accent,border:"none",color:"white",
        fontWeight:700,fontSize:20,flexShrink:0,
        boxShadow:`0 4px 14px ${activeDef?.color||T.accent}44`,
      }}>+</button>
      </div>

      {/* 메모 목록 */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.length===0?(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10}}>
            <div style={{fontSize:26,opacity:.2}}>○</div>
            <div style={{fontSize:13,color:T.textMute}}>기록이 없습니다</div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(e=>(
              <ArchiveEntryCard key={e.id} ev={e} accentColor={activeDef?.color||T.accent} onOpen={onOpen}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// MAIN YAMLOG
// ─────────────────────────────────────────────────────
export default function Yamlog() {
  const isMobile = useIsMobile();

  const [filterCat,    setFilterCat]    = useState("all");
  const [view,         setView]         = useState("주");
  const [curDate,      setCurDate]      = useState(today);
  const [showBriefing, setShowBriefing] = useState(false);

  const [showDetail,    setShowDetail]    = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [addPresetDate, setAddPresetDate] = useState(null);
  const [addPresetHour, setAddPresetHour] = useState(null);
  const [addPresetCat,  setAddPresetCat]  = useState(null);
  const [addPresetSub,  setAddPresetSub]  = useState(null);

  const isArchiveView = filterCat === "archive" && !showBriefing;
  const isSpecialView = showBriefing || isArchiveView;

  const { events, loading, refetch } = useEvents(
    showBriefing ? null : filterCat === "all" ? null : filterCat
  );

  const nav = (dir) => {
    const d = new Date(curDate);
    if      (view==="주") d.setDate(d.getDate()+dir*7);
    else if (view==="월") d.setMonth(d.getMonth()+dir);
    else                  d.setFullYear(d.getFullYear()+dir);
    setCurDate(d);
  };

  // ISO 주차 표기 (주 뷰), 월/년은 기존
  const dateLabel = () => {
    if (view==="주") return `${getISOWeek(curDate)}W`;
    if (view==="월") return `${curDate.getFullYear()}년 ${MONTHS_KR[curDate.getMonth()]}`;
    return `${curDate.getFullYear()}년`;
  };

  const handleAdd = (ds, h) => {
    setAddPresetDate(ds||null);
    setAddPresetHour(h!=null?String(h).padStart(2,"0"):null);
    setAddPresetCat(null);
    setAddPresetSub(null);
    setShowAdd(true);
  };

  const handleAddFromArchive = (archiveSec) => {
    setAddPresetDate(null);
    setAddPresetHour(null);
    setAddPresetCat("archive");
    setAddPresetSub(archiveSec);
    setShowAdd(true);
  };

  // ─── 사이드바 ───────────────────────────────────────
  const sidebar = (
    <div style={{
      width:220,flexShrink:0,height:"100vh",
      background:T.bgCard,borderRight:`1px solid ${T.border}`,
      display:"flex",flexDirection:"column",overflow:"hidden",
    }}>
      {/* 로고 */}
      <div style={{padding:"22px 18px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontFamily:"'Libre Baskerville',Georgia,serif",fontSize:18,fontWeight:700,color:T.text,letterSpacing:-.3,lineHeight:1,marginBottom:3}}>얌로그</div>
        <LiveClock/>
        <div style={{fontSize:10,color:T.textMute,marginTop:3,fontFamily:"'Noto Sans KR',sans-serif"}}>
          {today.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}
        </div>
      </div>

      {/* 인용문 — 각 문장 끝 줄바꿈, 문단 사이 빈줄 없음 */}
      <div style={{padding:"16px 18px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:13,color:T.text,lineHeight:2,fontFamily:"'Noto Sans KR',sans-serif",fontWeight:500}}>
          탁월함은 일시적 행위가 아니라<br/>
          우리를 정의하는 습관이다.<br/>
          이는 곧 중용의 태도이자<br/>
          행복이다.
        </div>
        <div style={{fontSize:9.5,color:T.textMute,lineHeight:1.85,fontFamily:"'Libre Baskerville',Georgia,serif",fontStyle:"italic",marginTop:10,opacity:.8}}>
          Arete is no fleeting act,<br/>
          but our defining habit.<br/>
          It is the stance of Mesotes,<br/>
          and the state of Eudaimonia.
        </div>
      </div>

      {/* 네비게이션 — "카테고리" 라벨 없음 */}
      <div style={{padding:"14px 12px 0"}}>
        {/* 전체 */}
        <button onClick={()=>{setFilterCat("all");setShowBriefing(false);}} style={{
          width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
          background:filterCat==="all"&&!showBriefing?T.bgSub:"transparent",border:"none",
          display:"flex",alignItems:"center",gap:8,
          color:filterCat==="all"&&!showBriefing?T.text:T.textSub,
          fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,fontWeight:filterCat==="all"&&!showBriefing?600:400,
        }}>
          <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:filterCat==="all"&&!showBriefing?T.accent:T.borderMid}}/>
          홈
        </button>
        {/* 브리핑 */}
        <button onClick={()=>{setShowBriefing(true);setFilterCat("all");}} style={{
          width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
          background:showBriefing?"#6B7C3A22":"transparent",border:"none",
          display:"flex",alignItems:"center",gap:8,
          color:showBriefing?"#6B7C3A":T.textSub,
          fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,fontWeight:showBriefing?600:400,
        }}>
          <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:showBriefing?"#6B7C3A":T.borderMid}}/>
          브리핑
        </button>
        {/* 카테고리들 (라벨 없이, 간격 동일) */}
        {CATS.map(cat=>(
          <button key={cat.id} onClick={()=>{setFilterCat(cat.id);setShowBriefing(false);}} style={{
            width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
            background:filterCat===cat.id&&!showBriefing?cat.bg:"transparent",border:"none",
            display:"flex",alignItems:"center",gap:8,
            color:filterCat===cat.id&&!showBriefing?cat.text:T.textSub,
            fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,fontWeight:filterCat===cat.id&&!showBriefing?600:400,
          }}>
            <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:filterCat===cat.id&&!showBriefing?cat.color:T.borderMid}}/>
            {cat.label}
          </button>
        ))}
      </div>

      {/* 위젯 */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px 16px"}}>
        <WeightSection/>
        <WordSection/>
      </div>
    </div>
  );

  // ─── 메인 콘텐츠 ─────────────────────────────────
  const mainContent = (
    <div style={{
      flex:1,display:"flex",flexDirection:"column",overflow:"hidden",
      padding:isMobile?"12px 10px":"18px 22px",
      paddingBottom:isMobile?80:18,
    }}>
      {showBriefing ? (
        <BriefingView/>
      ) : isArchiveView ? (
        <ArchiveView events={events} onOpen={setShowDetail} onAddFromArchive={handleAddFromArchive}/>
      ) : (
        <>
          {/* 캘린더 헤더 (데스크탑만) */}
          {!isMobile&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button onClick={()=>nav(-1)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:14,color:T.textSub}}>‹</button>
              <div style={{fontSize:14,fontWeight:600,color:T.text,minWidth:60,textAlign:"center"}}>{dateLabel()}</div>
              <button onClick={()=>nav(1)}  style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:14,color:T.textSub}}>›</button>
              <button onClick={()=>setCurDate(new Date())} style={{background:T.bgSub,border:`1px solid ${T.border}`,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,color:T.textSub}}>오늘</button>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <div style={{display:"flex",background:T.bgSub,borderRadius:8,padding:3,border:`1px solid ${T.border}`}}>
                {VIEWS.map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{
                    padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:12,
                    background:view===v?T.bgCard:"transparent",border:view===v?`1px solid ${T.border}`:"none",
                    color:view===v?T.text:T.textSub,fontWeight:view===v?600:400,
                    boxShadow:view===v?"0 1px 3px rgba(44,40,37,0.08)":"none",
                    fontFamily:"'Noto Sans KR',sans-serif",
                  }}>{v}</button>
                ))}
              </div>
              <button onClick={()=>handleAdd(null,null)} style={{
                background:T.accent,border:"none",borderRadius:9,padding:"7px 14px",
                cursor:"pointer",fontSize:12,color:"white",fontWeight:600,
                boxShadow:`0 2px 10px ${T.accent}44`,fontFamily:"'Noto Sans KR',sans-serif",
              }}>+ 추가</button>
            </div>
          </div>}

          {/* 뷰 본체 */}
          {loading?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1}}>
              <div style={{fontSize:13,color:T.textMute}}>불러오는 중...</div>
            </div>
          ):view==="주"?(
            <WeekView curDate={curDate} events={events} filterCat={filterCat} onOpen={setShowDetail} onAdd={handleAdd}/>
          ):view==="월"?(
            <div style={{flex:1,overflowY:"auto"}}>
              <MonthView curDate={curDate} events={events} filterCat={filterCat} onOpen={setShowDetail} onAdd={handleAdd}/>
            </div>
          ):(
            <div style={{flex:1,overflowY:"auto"}}>
              <YearView curDate={curDate} events={events} onOpen={setShowDetail}/>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div style={{
      display:"flex",flexDirection:isMobile?"column":"row",
      height:"100vh",background:T.bg,
      fontFamily:"'Noto Sans KR',sans-serif",
    }}>
      {!isMobile && sidebar}

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0,background:T.bg}}>
        {/* 모바일 헤더 */}
        {isMobile&&(
          <div style={{padding:"10px 12px 8px",background:T.bgCard,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
            {isSpecialView?(
              <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Libre Baskerville',serif"}}>
                {showBriefing?"브리핑":"아카이브"}
              </div>
            ):(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <button onClick={()=>nav(-1)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"3px 8px",cursor:"pointer",fontSize:14,color:T.textSub}}>‹</button>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>{dateLabel()}</div>
                  <button onClick={()=>nav(1)}  style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"3px 8px",cursor:"pointer",fontSize:14,color:T.textSub}}>›</button>
                </div>
                <div style={{display:"flex",gap:5}}>
                  <div style={{display:"flex",background:T.bgSub,borderRadius:7,padding:2,border:`1px solid ${T.border}`}}>
                    {VIEWS.map(v=>(
                      <button key={v} onClick={()=>setView(v)} style={{
                        padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:11,
                        background:view===v?T.bgCard:"transparent",border:view===v?`1px solid ${T.border}`:"none",
                        color:view===v?T.text:T.textSub,fontFamily:"'Noto Sans KR',sans-serif",
                      }}>{v}</button>
                    ))}
                  </div>
                  <button onClick={()=>handleAdd(null,null)} style={{
                    background:T.accent,border:"none",borderRadius:7,
                    padding:"5px 12px",cursor:"pointer",fontSize:11,color:"white",fontWeight:600,
                  }}>+</button>
                </div>
              </div>
            )}
          </div>
        )}

        {mainContent}
      </div>

      {/* 모바일 하단 탭 — 사이드바와 동일 5개 */}
      {isMobile&&(
        <BottomTabBar
          filterCat={filterCat} showBriefing={showBriefing}
          setFilterCat={setFilterCat} setShowBriefing={setShowBriefing}
        />
      )}

      {showDetail&&(
        <DetailModal ev={showDetail} onClose={()=>setShowDetail(null)} onRefetch={refetch}/>
      )}
      {showAdd&&(
        <AddModal
          presetDate={addPresetDate} presetHour={addPresetHour}
          presetCat={addPresetCat} presetSub={addPresetSub}
          addEventFn={addEvent} onSaved={refetch} onClose={()=>setShowAdd(false)}
        />
      )}
    </div>
  );
}
