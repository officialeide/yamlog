/* ─────────────────────────────────────────────────────
   APP.JSX — 캘린더 뷰, 아카이브 뷰, 메인 Yamlog 컴포넌트
───────────────────────────────────────────────────── */
import { useState, useMemo, useEffect } from "react";
import {
  T, CATS, VIEWS, WEEKDAYS, MONTHS_KR, HOURS,
  today, catOf, dateStr, getWeekDays, getMonthCells,
} from "./constants.js";
import { useEvents, addEvent } from "./api.js";
import {
  LiveClock, TaskChip, DetailModal, AddModal,
  WeightSection, WordSection,
  BriefingView, BottomTabBar,
} from "./components.jsx";

// useIsMobile - UI hook, belongs here not in api.js (SoC fix)
function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

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
// WEEK VIEW 헬퍼 — 분 단위 레이아웃 계산
// ─────────────────────────────────────────────────────
function layoutDayEvents(evs, startH, ROW_H) {
  if (!evs.length) return [];
  const items = evs.map(ev => {
    const sm = ev.fields?.startMinute || 0;
    const eh = ev.fields?.endHour != null ? ev.fields.endHour : ev.hour + 1;
    const em = ev.fields?.endMinute || 0;
    const s  = ev.hour * 60 + sm;
    const e  = Math.max(eh * 60 + em, s + 15);
    return { ev, s, e };
  }).filter(it => it.e > startH * 60);

  items.sort((a, b) => a.s - b.s);

  // 그리디 트랙 배정
  const trackEnds = [];
  const trackIdx  = items.map(item => {
    let t = trackEnds.findIndex(end => end <= item.s);
    if (t < 0) { trackEnds.push(0); t = trackEnds.length - 1; }
    trackEnds[t] = item.e;
    return t;
  });

  return items.map((item, i) => {
    const overlapping = items.filter(o => o.s < item.e && o.e > item.s);
    const maxTrack    = Math.max(...overlapping.map(o => trackIdx[items.indexOf(o)]));
    const numCols     = maxTrack + 1;
    const col         = trackIdx[i];
    return {
      ev:     item.ev,
      top:    Math.max(0, (item.s - startH * 60) / 60 * ROW_H) + 1,
      height: Math.max(16, (item.e - item.s) / 60 * ROW_H - 2),
      left:   col / numCols,
      width:  1   / numCols,
    };
  });
}

// ─────────────────────────────────────────────────────
// WEEK VIEW — 분 단위 절대좌표 일기장 스타일
// ─────────────────────────────────────────────────────
function WeekView({ curDate, events, filterCat, onOpen, onAdd }) {
  const days = useMemo(() => getWeekDays(curDate), [curDate]);
  const [showNight, setShowNight] = useState(false);
  const [nowHour,   setNowHour]   = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setNowHour(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);

  const ROW_H  = 52;
  const startH = showNight ? 0 : 8;
  const visHrs = HOURS.filter(h => h >= startH);
  const totalH = visHrs.length * ROW_H;
  const COL_W  = 34;

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>

      {/* 요일/날짜 헤더 */}
      <div style={{display:"flex",flexShrink:0,borderBottom:`1px solid ${T.borderMid}`,background:T.bg,paddingBottom:4}}>
        <div style={{width:COL_W,flexShrink:0}}/>
        {days.map((d,i)=>{
          const ds=dateStr(d), isToday=ds===todayStr;
          const dow=d.getDay();
          const wknd=dow===0?"#C0443A":dow===6?"#2E6FA5":null;
          return (
            <div key={i} style={{flex:1,textAlign:"center",padding:"3px 2px"}}>
              <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
                background:isToday?T.accent:"transparent",borderRadius:8,padding:"3px 5px",minWidth:28}}>
                <div style={{fontSize:9,color:isToday?"#fff":wknd||T.textMute}}>{WEEKDAYS[dow]}</div>
                <div style={{fontSize:13,fontWeight:isToday?700:400,color:isToday?"#fff":wknd||T.text}}>{d.getDate()}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 0-7시 토글 */}
      <div style={{display:"flex",padding:"2px 4px",background:T.bg,flexShrink:0}}>
        <button onClick={()=>setShowNight(s=>!s)} style={{
          fontSize:9,color:T.textMute,background:"transparent",border:`1px solid ${T.border}`,
          borderRadius:4,padding:"2px 8px",cursor:"pointer",lineHeight:1.4,marginLeft:COL_W,
        }}>{showNight?"▲ 0-7시 접기":"▼ 0-7시 펼치기"}</button>
      </div>

      {/* 스크롤 그리드 */}
      <div style={{flex:1,overflowY:"auto"}}>
        <div style={{display:"flex",height:totalH}}>

          {/* 시간 레이블 열 */}
          <div style={{width:COL_W,flexShrink:0,position:"relative",height:totalH}}>
            {visHrs.map(h=>(
              <div key={h} style={{
                position:"absolute",
                top:(h-startH)*ROW_H - 7,
                right:4,fontSize:8,color:T.textMute,lineHeight:1,
              }}>{String(h).padStart(2,"0")}</div>
            ))}
          </div>

          {/* 날짜별 열 */}
          {days.map((d,i)=>{
            const ds=dateStr(d), isToday=ds===todayStr;
            const colEvs = events.filter(e=>
              e.date===ds && (filterCat==="all"||e.category===filterCat)
            );
            const laid = layoutDayEvents(colEvs, startH, ROW_H);

            return (
              <div key={i} style={{flex:1,minWidth:0,borderLeft:`1px solid ${T.border}`,
                position:"relative",height:totalH}}>

                {/* 시간 배경 격자 */}
                {visHrs.map(h=>{
                  const isCur = isToday && h===nowHour;
                  return (
                    <div key={h} onClick={()=>onAdd(ds,h)} style={{
                      position:"absolute",top:(h-startH)*ROW_H,left:0,right:0,height:ROW_H,
                      borderBottom:`1px solid ${T.border}`,cursor:"pointer",
                      background:isCur?"#6B7C3A1C":isToday&&h%2===0?T.accent+"05":"transparent",
                      borderTop:isCur?`2px solid ${T.accent}`:"none",
                    }}/>
                  );
                })}

                {/* 이벤트 블록 (분 단위 절대 위치) */}
                {laid.map(({ev, top, height, left, width}, idx)=>{
                  const cat = catOf(ev.category, ev.sub_category);
                  return (
                    <div key={ev.id}
                      onClick={e=>{e.stopPropagation();onOpen(ev);}}
                      style={{
                        position:"absolute",
                        top, height,
                        left:`calc(${left*100}% + 2px)`,
                        width:`calc(${width*100}% - 4px)`,
                        borderRadius:4,zIndex:1+idx,cursor:"pointer",
                        background:ev.done?T.bgSub:cat.bg,
                        borderLeft:`3px solid ${ev.done?T.borderMid:cat.color}`,
                        padding:"2px 4px",overflow:"hidden",
                        opacity:ev.done?0.55:1,
                        boxShadow:"0 1px 3px rgba(44,40,37,0.08)",
                      }}>
                      <div style={{fontSize:10,color:ev.done?T.textMute:cat.text,
                        lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                        fontWeight:500}}>
                        {ev.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:0,flex:1,alignContent:"space-evenly"}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i} style={{minWidth:0}}/>;
          const ds=dateStr(d), isToday=ds===todayStr;
          const allEvs=events.filter(e=>e.date===ds&&(filterCat==="all"||e.category===filterCat));
          const todoEvs=allEvs.filter(e=>!e.done), doneEvs=allEvs.filter(e=>e.done);
          const isWknd=d.getDay()===0||d.getDay()===6;
          return (
            <div key={i} onClick={()=>onAdd(ds,9)} style={{
              height:95,overflow:"hidden",minWidth:0,borderRadius:8,padding:"4px 4px",cursor:"pointer",
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
                    fontSize:11,marginBottom:2,padding:"2px 5px",borderRadius:4,cursor:"pointer",
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
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0,overflow:"hidden"}}>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"repeat(4,1fr)",gap:6,flex:1,minHeight:0}}>
        {Array.from({length:12},(_,m)=>m).map(m=>{
          const cells=getMonthCells(new Date(year,m,1));
          return (
            <div key={m} style={{background:T.bgCard,borderRadius:8,padding:"7px 6px",border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden"}}>
              <div style={{fontSize:10,fontWeight:600,color:T.textSub,marginBottom:3}}>{MONTHS_KR[m]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:0,flex:1,alignContent:"space-evenly"}}>
                {cells.map((d,i)=>{
                  if(!d) return <div key={i} style={{minWidth:0}}/>;
                  const ds=dateStr(d);
                  const hasEv=eventEvs.some(e=>e.date===ds);
                  const isSelected=clickedDay===ds;
                  const isTod=ds===todayStr;
                  const ydow=d.getDay();
                  const ywknd=ydow===0?"#C0443A":ydow===6?"#2E6FA5":null;
                  const circleBg=isSelected?"#B09520DD":isTod?T.accent:hasEv?"#B0952070":"transparent";
                  const circleColor=isTod?"#fff":hasEv?"#4A3800":ywknd||T.textMute;
                  return (
                    <div key={i} style={{display:"flex",justifyContent:"center",alignItems:"center",padding:"0"}}
                      onClick={()=>hasEv&&setClickedDay(isSelected?null:ds)}>
                      <div style={{
                        width:14,height:14,borderRadius:"50%",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:7,fontWeight:isTod||hasEv?700:400,
                        color:circleColor,background:circleBg,
                        cursor:hasEv?"pointer":"default",
                      }}>{d.getDate()}</div>
                    </div>
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
            {f.weight&&<span style={{fontSize:15,fontWeight:700,color:accentColor}}>{f.weight}<span style={{fontSize:12,fontWeight:400,marginLeft:3}}>kg</span></span>}
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
            {ev.detail&&<pre style={{fontSize:11,color:T.textSub,whiteSpace:"pre-wrap",margin:0,lineHeight:1.7,fontFamily:"'KoPub Dotum',sans-serif"}}>{ev.detail}</pre>}
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
            {f.index&&<div style={{marginBottom:4}}><span style={{fontSize:11,color:T.textMute}}>지수 </span><span style={{fontSize:11,color:T.text,fontWeight:600}}>{f.index}</span></div>}
            {f.keyword&&<div style={{marginBottom:6}}>
              <span style={{fontSize:11,color:T.textMute,marginRight:4}}>키워드 </span>
              {f.keyword.split(/\s+/).filter(Boolean).map((kw,i)=>(
                <span key={i} style={{display:"inline-block",marginRight:4,padding:"2px 7px",borderRadius:10,fontSize:10,background:accentColor+"18",color:accentColor,border:`1px solid ${accentColor}33`}}>{kw}</span>
              ))}
            </div>}
            {ev.detail&&<div style={{marginBottom:4}}><span style={{fontSize:10,color:T.textMute}}>요약 </span><span style={{fontSize:12,color:T.text,lineHeight:1.75}}>{ev.detail}</span></div>}
            {f.watchlist&&<div style={{fontSize:11,color:T.textMute,marginTop:4}}>📌 {f.watchlist}</div>}
          </div>
        );
      case "book":
        return (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:3,fontFamily:"'Libre Baskerville',serif"}}>
              {f.bookTitle||ev.title}
            </div>
            {f.author&&<div style={{marginBottom:2}}><span style={{fontSize:11,color:T.textMute}}>작가 </span><span style={{fontSize:11,color:T.text}}>{f.author}</span></div>}
            {(f.genre||f.period)&&<div style={{marginBottom:4}}>
              {f.genre&&<span><span style={{fontSize:11,color:T.textMute}}>장르 </span><span style={{fontSize:11,color:T.text}}>{f.genre}</span></span>}
              {f.genre&&f.period&&<span style={{color:T.textMute}}> · </span>}
              {f.period&&<span><span style={{fontSize:11,color:T.textMute}}>기간 </span><span style={{fontSize:11,color:T.text}}>{f.period}</span></span>}
            </div>}
            {f.score&&<div style={{fontSize:13,color:accentColor,marginBottom:4}}>{"★".repeat(f.score)}{"☆".repeat(5-f.score)}</div>}
            {ev.detail&&<div style={{fontSize:12,color:T.textSub,lineHeight:1.7}}>{ev.detail}</div>}
          </div>
        );
      case "wine":
        return (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2,fontFamily:"'Libre Baskerville',serif"}}>
              {f.wineName||ev.title}
            </div>
            {f.vintage&&<div style={{marginBottom:2}}><span style={{fontSize:11,color:T.textMute}}>빈티지 </span><span style={{fontSize:11,color:T.text}}>{f.vintage}</span></div>}
            {(f.origin||f.grape)&&<div style={{marginBottom:4}}>
              {f.origin&&<span><span style={{fontSize:11,color:T.textMute}}>생산지 </span><span style={{fontSize:11,color:T.text}}>{f.origin}</span></span>}
              {f.origin&&f.grape&&<span style={{color:T.textMute}}> · </span>}
              {f.grape&&<span><span style={{fontSize:11,color:T.textMute}}>품종 </span><span style={{fontSize:11,color:T.text}}>{f.grape}</span></span>}
            </div>}
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
        return (
          <div>
            {ev.title&&ev.title!=="기타"&&<div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>{ev.title}</div>}
            {ev.detail&&<div style={{fontSize:12,color:T.textSub,lineHeight:1.75}}>{ev.detail}</div>}
          </div>
        );
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
              fontSize:14,fontFamily:"'KoPub Dotum',sans-serif",
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
      background:T.bgSub,borderRight:`1px solid ${T.border}`,
      display:"flex",flexDirection:"column",overflow:"hidden",
    }}>
      {/* 로고 */}
      <div style={{padding:"20px 18px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontFamily:"'Libre Baskerville',Georgia,serif",fontSize:22,fontWeight:700,color:T.text,letterSpacing:-.5,lineHeight:1,marginBottom:10}}>Yamlog</div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'KoPub Dotum',sans-serif",fontSize:10}}>
          <span style={{color:T.accent,fontWeight:600}}>
            {today.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}
          </span>
          <span style={{color:T.textMute}}>·</span>
          <LiveClock/>
        </div>
      </div>

      {/* 인용문 — 각 문장 끝 줄바꿈, 문단 사이 빈줄 없음 */}
      <div style={{padding:"16px 18px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:12,color:T.textSub,lineHeight:1.5,fontFamily:"'KoPub Dotum',sans-serif",fontWeight:700}}>
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
          fontFamily:"'KoPub Dotum',sans-serif",fontSize:13,fontWeight:filterCat==="all"&&!showBriefing?600:400,
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
          fontFamily:"'KoPub Dotum',sans-serif",fontSize:13,fontWeight:showBriefing?600:400,
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
            fontFamily:"'KoPub Dotum',sans-serif",fontSize:13,fontWeight:filterCat===cat.id&&!showBriefing?600:400,
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
                    fontFamily:"'KoPub Dotum',sans-serif",
                  }}>{v}</button>
                ))}
              </div>
              <button onClick={()=>handleAdd(null,null)} style={{
                background:T.accent,border:"none",borderRadius:9,padding:"7px 14px",
                cursor:"pointer",fontSize:12,color:"white",fontWeight:600,
                boxShadow:`0 2px 10px ${T.accent}44`,fontFamily:"'KoPub Dotum',sans-serif",
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
      minHeight:"100vh",background:T.bg,
      fontFamily:"'KoPub Dotum',sans-serif",color:T.text,
    }}>
      <style>{`
        @font-face{font-family:'KoPub Dotum';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2021@1.1/KoPubWorld-Dotum-Light.woff2') format('woff2');font-weight:300 400;}
        @font-face{font-family:'KoPub Dotum';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2021@1.1/KoPubWorld-Dotum-Bold.woff2') format('woff2');font-weight:600 700 800;}
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F7F4EF;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#F0EDE7;}
        ::-webkit-scrollbar-thumb{background:#CEC5B8;border-radius:2px;}
        input,textarea,button{font-family:'KoPub Dotum',sans-serif;}
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer;}
        button:focus{outline:none;}
      `}</style>
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
                        color:view===v?T.text:T.textSub,fontFamily:"'KoPub Dotum',sans-serif",
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
