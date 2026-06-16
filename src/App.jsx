/* ─────────────────────────────────────────────────────
   APP.JSX — 캘린더 뷰, 아카이브 뷰, 메인 Yamlog 컴포넌트
───────────────────────────────────────────────────── */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  T, CATS, VIEWS, WEEKDAYS, MONTHS_KR, HOURS,
  catOf, dateStr, getWeekDays, getMonthCells, KNOWN_SUBS, ARCHIVE_SECTS,
} from "./constants.js";
import { useEvents, addEvent, useWeightLogs } from "./api.js";
import {
  LiveClock, DetailModal, AddModal,
  WeightSection, WordSection,
  BriefingView, HabitView, BottomTabBar, MacroBar,
} from "./components.jsx";

// ── 한국 공휴일 (2025~2027) ─────────────────────────
const KR_HOLIDAYS = {
  // 2025
  "2025-01-01":"신정","2025-01-28":"설날 연휴","2025-01-29":"설날","2025-01-30":"설날 연휴",
  "2025-03-01":"삼일절","2025-05-05":"어린이날","2025-05-06":"대체공휴일","2025-06-06":"현충일",
  "2025-08-15":"광복절","2025-10-03":"개천절","2025-10-06":"추석 연휴","2025-10-07":"추석","2025-10-08":"추석 연휴","2025-10-09":"한글날",
  "2025-12-25":"성탄절",
  // 2026
  "2026-01-01":"신정","2026-02-17":"설날 연휴","2026-02-18":"설날","2026-02-19":"설날 연휴",
  "2026-03-01":"삼일절","2026-03-02":"대체공휴일","2026-05-05":"어린이날","2026-05-25":"부처님오신날","2026-06-06":"현충일",
  "2026-08-15":"광복절","2026-08-17":"대체공휴일",
  "2026-09-24":"추석 연휴","2026-09-25":"추석","2026-09-26":"추석 연휴",
  "2026-10-03":"개천절","2026-10-09":"한글날","2026-12-25":"성탄절",
  // 2027
  "2027-01-01":"신정","2027-02-08":"설날 연휴","2027-02-09":"설날","2027-02-10":"설날 연휴",
  "2027-03-01":"삼일절","2027-05-05":"어린이날","2027-05-13":"부처님오신날","2027-06-06":"현충일",
  "2027-08-15":"광복절","2027-08-16":"대체공휴일",
  "2027-09-14":"추석 연휴","2027-09-15":"추석","2027-09-16":"추석 연휴",
  "2027-10-03":"개천절","2027-10-04":"대체공휴일","2027-10-09":"한글날","2027-12-25":"성탄절",
};
const isHoliday = (ds) => ds in KR_HOLIDAYS;
const holidayName = (ds) => KR_HOLIDAYS[ds] || null;

// ── useIsMobile: 디바운스 적용으로 리사이즈 과부하 방지 ──
function useIsTablet() {
  const getVal = () => {
    if (typeof window === "undefined") return false;
    const w = window.innerWidth || screen.width;
    return w >= 1024 && navigator.maxTouchPoints > 0;
  };
  const [t, setT] = useState(getVal);
  useEffect(() => {
    let timer;
    const fn = () => { clearTimeout(timer); timer = setTimeout(() => setT(getVal()), 500); };
    window.addEventListener("resize", fn);
    window.addEventListener("orientationchange", fn);
    if (screen.orientation) screen.orientation.addEventListener("change", fn);
    return () => {
      window.removeEventListener("resize", fn);
      window.removeEventListener("orientationchange", fn);
      if (screen.orientation) screen.orientation.removeEventListener("change", fn);
      clearTimeout(timer);
    };
  }, []);
  return t;
}

function useIsMobile() {
  const getVal = () => {
    if (typeof window === "undefined") return false;
    const w = window.innerWidth || screen.width;
    return w < 1024;
  };
  const [m, setM] = useState(getVal);
  useEffect(() => {
    let timer;
    const fn = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setM(getVal()), 500);
    };
    window.addEventListener("resize", fn);
    window.addEventListener("orientationchange", fn);
    // 안드로이드 웨일/크롬: screen.orientation API
    if (screen.orientation) {
      screen.orientation.addEventListener("change", fn);
    }
    return () => {
      window.removeEventListener("resize", fn);
      window.removeEventListener("orientationchange", fn);
      if (screen.orientation) screen.orientation.removeEventListener("change", fn);
      clearTimeout(timer);
    };
  }, []);
  return m;
}

// ── useToday: 자정마다 오늘 날짜 갱신 ──────────────────
function useToday() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const timerRef = { current: null };
    const scheduleNextMidnight = () => {
      const now  = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const ms   = next - now;
      timerRef.current = setTimeout(() => {
        setToday(new Date());
        scheduleNextMidnight();
      }, ms);
    };
    scheduleNextMidnight();
    return () => clearTimeout(timerRef.current);
  }, []);
  return today;
}

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
function WeekView({ curDate, events, onOpen, onAdd, isMobile, todayStr }) {
  const days = useMemo(() => getWeekDays(curDate), [curDate]);
  const [showNight, setShowNight] = useState(false);
  const [nowHour,   setNowHour]   = useState(() => new Date().getHours());
  const gridRef  = useRef(null);
  const [gridH, setGridH] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowHour(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    // 초기값 즉시 설정
    setGridH(el.clientHeight);
    const ro = new ResizeObserver(() => setGridH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [showNight]);

  const startH  = showNight ? 0 : 8;
  const visHrs  = HOURS.filter(h => h >= startH);
  const ROW_H   = gridH > 0 ? Math.max(24, Math.floor(gridH / visHrs.length)) : 40;
  const totalH  = visHrs.length * ROW_H;
  const COL_W   = 28;

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>

      {/* 요일/날짜 헤더 */}
      <div style={{display:"flex",flexShrink:0,borderBottom:`1px solid ${T.borderMid}`,background:T.bg,paddingBottom:4}}>
        <div style={{width:COL_W,flexShrink:0}}/>
        {days.map((d,i)=>{
          const ds=dateStr(d), isToday=ds===todayStr;
          const dow=d.getDay();
          const holi=isHoliday(ds);
          const holiNm=holidayName(ds);
          const wknd=dow===0||holi?"#C0443A":dow===6?"#2E6FA5":null;
          return (
            <div key={i} style={{flex:1,textAlign:"center",padding:"3px 2px"}}>
              <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
                background:isToday?T.accent:"transparent",borderRadius:8,padding:"3px 5px",minWidth:28}}>
                <div style={{fontSize:9,color:isToday?"#fff":wknd||T.textMute}}>{WEEKDAYS[dow]}</div>
                <div style={{fontSize:13,fontWeight:isToday?700:400,color:isToday?"#fff":wknd||T.text}}>{d.getDate()}</div>
                {holiNm&&<div style={{fontSize:7,color:isToday?"#fff":"#C0443A",lineHeight:1.2,marginTop:1,maxWidth:36,wordBreak:"keep-all",textAlign:"center"}}>{holiNm}</div>}
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

      {/* 그리드 — 스크롤 없이 flex:1로 꽉 채움 */}
      <div ref={gridRef} style={{flex:1,overflow:"hidden",position:"relative"}}>
        <div style={{display:"flex",height:"100%"}}>

          {/* 시간 레이블 열 */}
          <div style={{width:COL_W,flexShrink:0,position:"relative",height:"100%"}}>
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
              e.date===ds && e.category !== "archive"
            );
            const laid = layoutDayEvents(colEvs, startH, ROW_H);

            return (
              <div key={i} style={{flex:1,minWidth:0,borderLeft:`1px solid ${T.border}`,
                position:"relative",height:"100%"}}>

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
                {/* 30분 단위 얇은 선 */}
                {visHrs.map(h=>(
                  <div key={`h_${h}`} style={{
                    position:"absolute",top:(h-startH)*ROW_H + ROW_H/2,
                    left:0,right:0,height:1,
                    borderBottom:`1px dashed ${T.border}`,
                    opacity:0.5,pointerEvents:"none",
                  }}/>
                ))}

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
                      <div style={{fontSize:isMobile?9:12,color:ev.done?T.textMute:cat.text,
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
// 월보기 날짜 셀 — 미완료 4개 표시, 초과 시 +N 버튼으로 전체(완료 포함) 표시
function MonthCell({ d, events, isToday, isMobile, onOpen, onAdd, todayStr }) {
  const [showPopup, setShowPopup] = useState(false);
  const ds = dateStr(d);
  const isWknd = d.getDay()===0||d.getDay()===6;
  const isHoli = isHoliday(ds);
  const holiNm = holidayName(ds);
  const allEvs = events.filter(e=>e.date===ds && e.category !== "archive");
  const todoEvs = allEvs.filter(e=>!e.done);
  const doneEvs = allEvs.filter(e=>e.done);
  const SHOW_MAX = 4;
  const overflow = todoEvs.length - SHOW_MAX;

  return (
    <div onClick={()=>onAdd(ds,9)} style={{
      height:isMobile?80:122,overflow:"hidden",minWidth:0,borderRadius:8,padding:"4px 4px",cursor:"pointer",
      background:isToday?T.accent+"18":T.bgCard,
      border:`1px solid ${isToday?T.accent+"55":T.border}`,transition:"border-color .12s",
      position:"relative",
    }}
    onMouseEnter={e=>{if(!isToday)e.currentTarget.style.borderColor=T.accent+"55";}}
    onMouseLeave={e=>{if(!isToday)e.currentTarget.style.borderColor=T.border;}}>
      {/* 날짜 숫자 + 특이사항 이모지 + +N 버튼 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
        <div style={{display:"flex",alignItems:"center",gap:2,flexWrap:"wrap",flex:1,minWidth:0}}>
          <div style={{fontSize:isMobile?8:11,fontWeight:isToday?700:400,flexShrink:0,
            color:isToday?T.accent:(isWknd||isHoli)?d.getDay()===0||isHoli?"#C0443A":"#2E6FA5":T.text}}>
            {d.getDate()}
          </div>
          {holiNm&&<div style={{fontSize:isMobile?6:8,color:"#C0443A",lineHeight:1.1,flexShrink:0,maxWidth:isMobile?28:44,wordBreak:"keep-all"}}>{holiNm}</div>}
          {(()=>{
            const CHECK_ORDER=["🍾","💩","🩸","💙"];
            const dietEv=events.find(e=>e.date===ds&&e.category==="archive"&&e.sub_category==="diet");
            if(!dietEv||!dietEv.fields) return null;
            const checks=Array.isArray(dietEv.fields.checks)?dietEv.fields.checks:[];
            const etc=dietEv.fields.checksEtc||"";
            const emojis=CHECK_ORDER.filter(c=>checks.includes(c));
            if(emojis.length===0&&!etc) return null;
            return <span style={{fontSize:isMobile?7:9,lineHeight:1,color:T.text}}>{emojis.join("")}{etc?` ${etc}`:""}</span>;
          })()}
        </div>
        {overflow>0&&(
          <div onClick={e=>{e.stopPropagation();setShowPopup(true);}} style={{
            fontSize:8,fontWeight:700,color:"white",
            background:T.accent,borderRadius:4,
            padding:"0px 4px",cursor:"pointer",lineHeight:"14px",flexShrink:0,
          }}>+{overflow}</div>
        )}
      </div>
      {/* 미완료 이벤트 — 최대 4개 */}
      {todoEvs.slice(0,SHOW_MAX).map(ev=>{
        const cat=catOf(ev.category,ev.sub_category);
        return (
          <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} style={{
            fontSize:isMobile?9:12,marginBottom:2,padding:"1px 3px",borderRadius:4,cursor:"pointer",
            background:cat.bg,color:cat.text,border:`1px solid ${cat.color}33`,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          }}>{ev.title}</div>
        );
      })}
      {/* 완료 이벤트 점 */}
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
      {/* 전체 일정 팝업 */}
      {showPopup&&(
        <div onClick={e=>e.stopPropagation()} style={{
          position:"fixed",inset:0,zIndex:500,
          display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(44,40,37,0.45)",backdropFilter:"blur(3px)",
        }} onClick={e=>{e.stopPropagation();setShowPopup(false);}}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:T.bgCard,borderRadius:16,
            width:320,maxWidth:"90vw",maxHeight:"70vh",
            boxShadow:"0 16px 60px rgba(44,40,37,0.18)",
            border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden",
          }}>
            <div style={{padding:"14px 18px 10px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text}}>{ds}</div>
              <button onClick={()=>setShowPopup(false)} style={{background:"transparent",border:"none",color:T.textMute,cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"10px 14px 14px"}}>
              {todoEvs.length>0&&(
                <>
                  <div style={{fontSize:10,color:T.textMute,fontWeight:600,letterSpacing:.4,marginBottom:6}}>미완료</div>
                  {todoEvs.map(ev=>{
                    const cat=catOf(ev.category,ev.sub_category);
                    return (
                      <div key={ev.id} onClick={()=>{setShowPopup(false);onOpen(ev);}} style={{
                        fontSize:13,marginBottom:6,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                        background:cat.bg,color:cat.text,border:`1px solid ${cat.color}33`,
                        borderLeft:`3px solid ${cat.color}`,
                      }}>{ev.title}</div>
                    );
                  })}
                </>
              )}
              {doneEvs.length>0&&(
                <>
                  <div style={{fontSize:10,color:T.textMute,fontWeight:600,letterSpacing:.4,marginTop:10,marginBottom:6}}>완료</div>
                  {doneEvs.map(ev=>{
                    const cat=catOf(ev.category,ev.sub_category);
                    return (
                      <div key={ev.id} onClick={()=>{setShowPopup(false);onOpen(ev);}} style={{
                        fontSize:13,marginBottom:6,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                        background:T.bgSub,color:T.textMute,border:`1px solid ${T.border}`,
                        textDecoration:"line-through",opacity:0.75,
                      }}>{ev.title}</div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({ curDate, events, onOpen, onAdd, isMobile, todayStr }) {
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
          return (
            <MonthCell key={i} d={d} events={events}
              isToday={isToday} isMobile={isMobile} onOpen={onOpen} onAdd={onAdd} todayStr={todayStr}/>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// YEAR VIEW — 이벤트만 표시, 클릭 시 상세 표시
// ─────────────────────────────────────────────────────
function YearView({ curDate, events, onOpen, isMobile, todayStr }) {
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
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(3,1fr)",gridTemplateRows:isMobile?"repeat(4,1fr)":"repeat(4,1fr)",gap:isMobile?4:8,flex:1,minHeight:0,overflow:"hidden"}}>
        {Array.from({length:12},(_,m)=>m).map(m=>{
          const cells=getMonthCells(new Date(year,m,1));
          return (
            <div key={m} style={{background:T.bgCard,borderRadius:8,padding:isMobile?"5px 4px":"7px 6px",border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden"}}>
              <div style={{fontSize:isMobile?10:14,fontWeight:700,color:T.textSub,marginBottom:isMobile?2:3,textAlign:"center"}}>{MONTHS_KR[m]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:0,flex:1,alignContent:"space-evenly"}}>
                {cells.map((d,i)=>{
                  if(!d) return <div key={i} style={{minWidth:0}}/>;
                  const ds=dateStr(d);
                  const hasEv=eventEvs.some(e=>e.date===ds);
                  const isSelected=clickedDay===ds;
                  const isTod=ds===todayStr;
                  const ydow=d.getDay();
                  const yHoli=isHoliday(ds);
                  const ywknd=ydow===0||yHoli?"#C0443A":ydow===6?"#2E6FA5":null;
                  const circleBg=isSelected?"#B09520DD":isTod?T.accent:hasEv?"#B0952070":"transparent";
                  const circleColor=isTod?"#fff":hasEv?"#4A3800":ywknd||T.textMute;
                  const circleSize=isMobile?16:22;
                  const fontSize=isMobile?8:12;
                  return (
                    <div key={i} style={{display:"flex",justifyContent:"center",alignItems:"center",padding:"0"}}
                      onClick={()=>hasEv&&setClickedDay(isSelected?null:ds)}>
                      <div style={{
                        width:circleSize,height:circleSize,borderRadius:"50%",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize,fontWeight:isTod||hasEv?700:400,
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
        const GOALS = { calories:1500, protein:90, sugar:25, carbs:160, fat:60 };
        return (
          <div>
            {meals.filter(([k])=>f[k]).map(([k,label])=>(
              <div key={k} style={{fontSize:12,color:T.text,marginBottom:3,display:"flex",gap:8}}>
                <span style={{color:T.textMute,fontSize:10,minWidth:22}}>{label}</span><span>{f[k]}</span>
              </div>
            ))}
            {(f.calories||f.carbs||f.protein||f.fat||f.sugar)&&(()=>{const calColor=f.calories>GOALS.calories?"#C0443A":T.text;const protColor=f.protein&&f.protein<GOALS.protein?"#2E6FA5":T.text;const carbsN=parseFloat(f.carbs)||0,protN=parseFloat(f.protein)||0,fatN=parseFloat(f.fat)||0;return(<div style={{marginTop:5,paddingTop:5,borderTop:`1px dashed ${T.border}`}}><div style={{fontSize:10.5,display:"flex",gap:8,flexWrap:"wrap",marginBottom:4}}>{f.calories&&<span style={{whiteSpace:"nowrap"}}>🔥 <span style={{color:calColor}}>{f.calories}</span><span style={{color:T.textMute}}>/{GOALS.calories} kcal</span></span>}{f.carbs&&<span style={{whiteSpace:"nowrap"}}>🥖 <span style={{color:T.text}}>{f.carbs}</span><span style={{color:T.textMute}}>/{GOALS.carbs} g</span></span>}{f.protein&&<span style={{whiteSpace:"nowrap"}}>🍖 <span style={{color:protColor}}>{f.protein}</span><span style={{color:T.textMute}}>/{GOALS.protein} g</span></span>}{f.fat&&<span style={{whiteSpace:"nowrap"}}>🧀 <span style={{color:T.text}}>{f.fat}</span><span style={{color:T.textMute}}>/{GOALS.fat} g</span></span>}{f.sugar&&<span style={{whiteSpace:"nowrap"}}>🧁 <span style={{color:T.text}}>{f.sugar}</span><span style={{color:T.textMute}}>/{GOALS.sugar} g</span></span>}</div>{(carbsN||protN||fatN)&&<div style={{maxWidth:isMobile?undefined:320}}><MacroBar carbs={carbsN} protein={protN} fat={fatN}/></div>}</div>);})()}
            {ev.detail&&<div style={{fontSize:11,color:T.text,marginTop:5,whiteSpace:"pre-wrap",lineHeight:1.6}}>{ev.detail}</div>}
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
            {ev.detail&&<pre style={{fontSize:11,color:T.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.7,fontFamily:"'Noto Sans KR',sans-serif"}}>{ev.detail}</pre>}
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
            {ev.detail&&<div style={{fontSize:11,color:T.text,whiteSpace:"pre-wrap",lineHeight:1.6}}>{ev.detail}</div>}
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
            {ev.detail&&<div style={{marginBottom:4}}><span style={{fontSize:10,color:T.textMute,display:"block",marginBottom:2}}>요약</span><div style={{fontSize:12,color:T.text,lineHeight:1.75,whiteSpace:"pre-wrap"}}>{ev.detail}</div></div>}
            {f.watchlist&&<div style={{fontSize:11,color:T.text,marginTop:4}}>✔️ {f.watchlist}</div>}
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
            {f.score&&<div style={{fontSize:13,color:accentColor,marginBottom:6}}>{"★".repeat(f.score)}{"☆".repeat(5-f.score)}</div>}
            {f.record&&(
              <div style={{marginBottom:6}}>
                <div style={{fontSize:10,color:T.textMute,fontWeight:600,letterSpacing:.4,marginBottom:3}}>인상깊은 문장</div>
                <div style={{fontSize:12,color:T.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{f.record}</div>
              </div>
            )}
            {ev.detail&&(
              <div>
                <div style={{fontSize:10,color:T.textMute,fontWeight:600,letterSpacing:.4,marginBottom:3}}>감상</div>
                <div style={{fontSize:12,color:T.text,lineHeight:1.7,padding:"7px 10px",background:T.bgSub,borderRadius:6,whiteSpace:"pre-wrap"}}>{ev.detail}</div>
              </div>
            )}
          </div>
        );
      case "wine":
        return (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2,fontFamily:"'Libre Baskerville',serif"}}>
              {f.wineName||ev.title}
            </div>
            {f.vintage&&<div style={{marginBottom:2}}><span style={{fontSize:11,color:T.textMute}}>빈티지 </span><span style={{fontSize:11,color:T.text}}>{f.vintage}</span></div>}
            {f.alcohol&&<div style={{marginBottom:2}}><span style={{fontSize:11,color:T.textMute}}>도수 </span><span style={{fontSize:11,color:T.text}}>{f.alcohol}</span></div>}
            {(f.origin||f.grape)&&<div style={{marginBottom:4}}>
              {f.origin&&<span><span style={{fontSize:11,color:T.textMute}}>생산지 </span><span style={{fontSize:11,color:T.text}}>{f.origin}</span></span>}
              {f.origin&&f.grape&&<span style={{color:T.textMute}}> · </span>}
              {f.grape&&<span><span style={{fontSize:11,color:T.textMute}}>품종 </span><span style={{fontSize:11,color:T.text}}>{f.grape}</span></span>}
            </div>}
            {/* 당도~총점 1줄 */}
            {(f.sweetness||f.acidity||f.tannin||f.body||f.score)&&(
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:5,marginTop:2,alignItems:"center"}}>
                {[["sweetness","당도"],["acidity","산도"],["tannin","타닌"],["body","바디"],["score","총점"]].filter(([k])=>f[k]).map(([k,label])=>(
                  <span key={k} style={{fontSize:11,color:k==="score"?accentColor:T.textSub}}>
                    <span style={{color:T.textMute,fontSize:10}}>{label} </span>
                    <span style={{fontWeight:k==="score"?700:500,color:k==="score"?accentColor:T.text}}>{f[k]}</span>
                  </span>
                ))}
              </div>
            )}
            {ev.detail&&<div style={{fontSize:12,color:T.text,whiteSpace:"pre-wrap",lineHeight:1.6}}>{ev.detail}</div>}
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
            {ev.fields?.tag&&(
              <span style={{display:"inline-block",marginBottom:6,padding:"2px 10px",borderRadius:20,
                fontSize:10,background:"#7E4FA022",color:"#7E4FA0",border:"1px solid #7E4FA033",fontWeight:600}}>
                {ev.fields.tag}
              </span>
            )}
            {ev.title&&ev.title!=="기타"&&<div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>{ev.title}</div>}
            {ev.detail&&<div style={{fontSize:12,color:T.text,lineHeight:1.75,whiteSpace:"pre-wrap"}}>{ev.detail}</div>}
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


// 건강 섹션: 날짜별로 체중+식단을 하나의 카드로 통합 표시
function HealthDayCards({ evs, accentColor, onOpen, isMobile }) {
  // 날짜별 그룹핑
  const byDate = {};
  evs.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {dates.map(date => {
        const dayEvs = byDate[date];
        const weightEv = dayEvs.find(e=>e.sub_category==="weight");
        const dietEv   = dayEvs.find(e=>e.sub_category==="diet");
        const otherEvs = dayEvs.filter(e=>e.sub_category!=="weight"&&e.sub_category!=="diet");
        const GOALS = { calories:1500, protein:90, sugar:25, carbs:160, fat:60 };
        return (
          <div key={date} style={{
            background:T.bgCard,borderRadius:12,padding:"12px 14px",
            border:`1px solid ${T.border}`,
          }}>
            <div style={{fontSize:10,color:T.textMute,marginBottom:8}}>{date}</div>
            {/* 체중 + 식단 한 줄 */}
            {(weightEv||dietEv)&&(
              <div style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:otherEvs.length>0?10:0}}>
                {/* 체중 */}
                {weightEv&&(
                  <div onClick={()=>onOpen(weightEv)} style={{cursor:"pointer",flexShrink:0}}>
                    <div style={{fontSize:10,color:T.textMute,marginBottom:2}}>체중</div>
                    <div style={{fontSize:18,fontWeight:700,color:accentColor,lineHeight:1}}>
                      {(weightEv.fields||{}).weight}
                      <span style={{fontSize:11,fontWeight:400,marginLeft:2}}>kg</span>
                    </div>
                  </div>
                )}
                {weightEv&&dietEv&&(
                  <div style={{width:1,background:T.border,alignSelf:"stretch",marginTop:4}}/>
                )}
                {/* 식단 */}
                {dietEv&&(
                  <div onClick={()=>onOpen(dietEv)} style={{cursor:"pointer",flex:1,minWidth:0}}>
                    <div style={{fontSize:10,color:T.textMute,marginBottom:4}}>식단</div>
                    {[["breakfast","아침"],["lunch","점심"],["dinner","저녁"],["snack","간식"]]
                      .filter(([k])=>(dietEv.fields||{})[k])
                      .map(([k,label])=>(
                        <div key={k} style={{fontSize:11,color:T.text,marginBottom:2,display:"flex",gap:6}}>
                          <span style={{color:T.textMute,fontSize:10,minWidth:20}}>{label}</span>
                          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(dietEv.fields||{})[k]}</span>
                        </div>
                      ))
                    }
                    {(()=>{const f=dietEv.fields||{};const calColor=f.calories>GOALS.calories?"#C0443A":T.text;const protColor=f.protein&&f.protein<GOALS.protein?"#2E6FA5":T.text;const carbsN=parseFloat(f.carbs)||0,protN=parseFloat(f.protein)||0,fatN=parseFloat(f.fat)||0;return (f.calories||f.protein||f.sugar||f.checks?.length||f.checksEtc)&&(
                      <div style={{marginTop:4,paddingTop:4,borderTop:`1px dashed ${T.border}`}}>
                        {/* 숫자 줄 */}
                        <div style={{display:"flex",alignItems:"center",gap:10,fontSize:10}}>
                          <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap",alignItems:"center"}}>
                            {f.calories&&<span style={{whiteSpace:"nowrap"}}>🔥 <span style={{color:calColor}}>{f.calories}</span><span style={{color:T.textMute}}>/{GOALS.calories}kcal</span></span>}
                            {f.carbs&&<span style={{whiteSpace:"nowrap"}}>🥖 <span style={{color:T.text}}>{f.carbs}</span><span style={{color:T.textMute}}>/{GOALS.carbs}g</span></span>}
                            {f.protein&&<span style={{whiteSpace:"nowrap"}}>🍖 <span style={{color:protColor}}>{f.protein}</span><span style={{color:T.textMute}}>/{GOALS.protein}g</span></span>}
                            {f.fat&&<span style={{whiteSpace:"nowrap"}}>🧀 <span style={{color:T.text}}>{f.fat}</span><span style={{color:T.textMute}}>/{GOALS.fat}g</span></span>}
                            {f.sugar&&<span style={{whiteSpace:"nowrap"}}>🧁 <span style={{color:T.text}}>{f.sugar}</span><span style={{color:T.textMute}}>/{GOALS.sugar}g</span></span>}
                          </div>
                          {(f.checks?.length||f.checksEtc)&&(
                            <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
                              {(()=>{const CHECK_ORDER=["🍾","💩","🩸","💙"];return CHECK_ORDER.filter(c=>(f.checks||[]).includes(c)).map(e=><span key={e} style={{fontSize:13}}>{e}</span>);})()}
                              {f.checksEtc&&<span style={{fontSize:10,color:T.textMute}}>{f.checksEtc}</span>}
                            </div>
                          )}
                        </div>
                        {/* 바 그래프 줄 */}
                        {(carbsN||protN||fatN)&&<div style={{maxWidth:isMobile?undefined:320}}><MacroBar carbs={carbsN} protein={protN} fat={fatN}/></div>}
                      </div>
                    );})()}
                  </div>
                )}
              </div>
            )}
            {/* 웨이트+카디오 반반 통합, 나머지는 기존 카드 */}
            {(()=>{
              const wtEv = otherEvs.find(e=>e.sub_category==="weight_training");
              const cdEv = otherEvs.find(e=>e.sub_category==="cardio");
              const restEvs = otherEvs.filter(e=>e.sub_category!=="weight_training"&&e.sub_category!=="cardio");
              const hasWC = wtEv||cdEv;
              return (
                <>
                  {hasWC&&(
                    <div style={{display:"flex",gap:12,marginTop:(weightEv||dietEv)?10:0,alignItems:"flex-start"}}>
                      {wtEv&&(
                        <div onClick={()=>onOpen(wtEv)} style={{cursor:"pointer",flex:1,minWidth:0}}>
                          <div style={{fontSize:10,color:T.textMute,marginBottom:3}}>웨이트</div>
                          <div style={{fontSize:11,color:T.text,display:"flex",gap:8,flexWrap:"wrap"}}>
                            {(wtEv.fields||{}).part&&<span style={{fontWeight:600}}>{wtEv.fields.part}</span>}
                            {(wtEv.fields||{}).duration&&<span style={{color:T.textSub}}>{wtEv.fields.duration}분</span>}
                            {(wtEv.fields||{}).condition&&<span>{"★".repeat(wtEv.fields.condition)}{"☆".repeat(5-wtEv.fields.condition)}</span>}
                          </div>
                          {wtEv.detail&&<div style={{fontSize:10,color:T.textSub,marginTop:3,whiteSpace:"pre-wrap"}}>{wtEv.detail}</div>}
                        </div>
                      )}
                      {wtEv&&cdEv&&<div style={{width:1,background:T.border,alignSelf:"stretch"}}/>}
                      {cdEv&&(
                        <div onClick={()=>onOpen(cdEv)} style={{cursor:"pointer",flex:1,minWidth:0}}>
                          <div style={{fontSize:10,color:T.textMute,marginBottom:3}}>카디오</div>
                          <div style={{fontSize:11,color:T.text,display:"flex",gap:8,flexWrap:"wrap"}}>
                            {(cdEv.fields||{}).type&&<span style={{fontWeight:600}}>{cdEv.fields.type}</span>}
                            {(cdEv.fields||{}).distance&&<span>{cdEv.fields.distance}km</span>}
                            {(cdEv.fields||{}).calories&&<span style={{color:T.textSub}}>{cdEv.fields.calories}kcal</span>}
                          </div>
                          {cdEv.detail&&<div style={{fontSize:10,color:T.textSub,marginTop:3,whiteSpace:"pre-wrap"}}>{cdEv.detail}</div>}
                        </div>
                      )}
                    </div>
                  )}
                  {restEvs.map(e=>(
                    <ArchiveEntryCard key={e.id} ev={e} accentColor={accentColor} onOpen={onOpen}/>
                  ))}
                </>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

const ETC_TAGS = ["업무","지식","취미","요리","베이킹","참고"];

function ArchiveView({ events, onOpen, onAddFromArchive, isMobile }) {
  const [activeSec, setActiveSec] = useState("health");
  const [activeTag, setActiveTag] = useState(null);
  const archiveEvs = events.filter(e => e.category === "archive");

  const filtered = archiveEvs.filter(e=>{
    const sec=ARCHIVE_SECTS.find(s=>s.id===activeSec);
    if(!sec) return false;
    if(sec.subs===null) {
      if(!KNOWN_SUBS.includes(e.sub_category)){
        if(activeTag && e.fields?.tag !== activeTag) return false;
        return true;
      }
      return false;
    }
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
            <button key={sec.id} onClick={()=>{setActiveSec(sec.id);setActiveTag(null);}} style={{
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

      {/* 기타 섹션 태그 필터 */}
      {activeSec==="etc"&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,flexShrink:0}}>
          {ETC_TAGS.map(tag=>(
            <button key={tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} style={{
              padding:"4px 12px",borderRadius:20,fontSize:11,cursor:"pointer",
              background:activeTag===tag?"#7E4FA0":"transparent",
              color:activeTag===tag?"white":T.textSub,
              border:`1px solid ${activeTag===tag?"#7E4FA0":T.border}`,
              transition:"all .12s",
            }}>{tag}</button>
          ))}
        </div>
      )}

      {/* 메모 목록 */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.length===0?(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10}}>
            <div style={{fontSize:26,opacity:.2}}>○</div>
            <div style={{fontSize:13,color:T.textMute}}>기록이 없습니다</div>
          </div>
        ) : activeSec === "health" ? (
          // 건강 섹션: 같은 날짜의 체중+식단 통합 카드
          <HealthDayCards evs={filtered} accentColor={activeDef?.color||T.accent} onOpen={onOpen} isMobile={isMobile}/>
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
  const isTablet = useIsTablet();
  const today    = useToday();
  const { logs: weightLogs, refetch: refetchWeight } = useWeightLogs();
  // 자정에 today가 바뀌면 체중 그래프도 재조회
  useEffect(() => { refetchWeight(); }, [today]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayStr = dateStr(today);

  const [filterCat,    setFilterCat]    = useState("all");
  const [view,         setView]         = useState("주");
  const [curDate,      setCurDate]      = useState(() => new Date());
  const [showBriefing, setShowBriefing] = useState(false);
  const [showHabit,    setShowHabit]    = useState(false);

  const [showDetail,     setShowDetail]     = useState(null);
  const [showAdd,        setShowAdd]        = useState(false);
  const [addPresetDate,  setAddPresetDate]  = useState(null);
  const [addPresetHour,  setAddPresetHour]  = useState(null);
  const [addPresetCat,   setAddPresetCat]   = useState(null);
  const [addPresetSub,   setAddPresetSub]   = useState(null);
  const [addPresetFields,setAddPresetFields]= useState(null);
  const [addPresetTitle, setAddPresetTitle] = useState(null);

  const isArchiveView = filterCat === "archive" && !showBriefing && !showHabit;
  const isHabitView   = showHabit;
  const isSpecialView = showBriefing || isArchiveView || isHabitView;

  // 뷰에 맞는 날짜 범위 계산 (아카이브/브리핑은 null → 전체 조회)
  const dateRange = useMemo(() => {
    if (isSpecialView) return null;
    if (view === "주") {
      const days = getWeekDays(curDate);
      // 버퍼 하루씩 추가 (타임존 경계 문제 방지)
      const from = new Date(days[0]); from.setDate(from.getDate() - 1);
      const to   = new Date(days[6]); to.setDate(to.getDate() + 1);
      return { from: dateStr(from), to: dateStr(to) };
    }
    if (view === "월") {
      const y = curDate.getFullYear(), mo = curDate.getMonth();
      const from = `${y}-${String(mo+1).padStart(2,"0")}-01`;
      const lastDay = new Date(y, mo+1, 0).getDate();
      const to   = `${y}-${String(mo+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
      return { from, to };
    }
    // 년 뷰
    const y = curDate.getFullYear();
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }, [view, curDate, isSpecialView]);

  // 년 뷰는 event 카테고리 전체가 필요하므로 filterCat 무시
  const eventsFilterCat = (!showBriefing && view === "년")
    ? null
    : (showBriefing ? null : filterCat === "all" ? null : filterCat);
  const { events: rawEvents, loading, refetch } = useEvents(eventsFilterCat, dateRange);

  // endDate 있는 이벤트를 날짜별로 전개 (오전 8시 고정)
  const events = useMemo(() => {
    const result = [];
    for (const ev of rawEvents) {
      const endDate = ev.fields?.endDate;
      if ((ev.category === "schedule" || ev.category === "event") && endDate && endDate > ev.date) {
        const cur = new Date(ev.date + "T00:00:00");
        const end = new Date(endDate + "T00:00:00");
        while (cur <= end) {
          const ds = cur.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
          result.push({ ...ev, date: ds, hour: 8, fields: { ...ev.fields, startMinute: 0 } });
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        result.push(ev);
      }
    }
    return result;
  }, [rawEvents]);

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
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div style={{fontFamily:"'Noto Serif KR',Georgia,serif",fontSize:22,fontWeight:700,color:T.text,letterSpacing:-.5,lineHeight:1,marginBottom:10}}>Yamlog</div>
          <div style={{fontSize:28,lineHeight:1,userSelect:"none"}}>🐳</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'Noto Sans KR',sans-serif",fontSize:10}}>
          <span style={{color:T.accent,fontWeight:600}}>
            {today.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}
          </span>
          <span style={{color:T.textMute}}>·</span>
          <LiveClock/>
        </div>
      </div>

      {/* 인용문 — 각 문장 끝 줄바꿈, 문단 사이 빈줄 없음 */}
      <div style={{padding:"16px 18px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:12,color:T.textSub,lineHeight:1.5,fontFamily:"'Noto Sans KR',sans-serif",fontWeight:700}}>
          탁월함은 일시적 행위가 아니라<br/>
          우리를 정의하는 습관이다.<br/>
          이는 곧 중용의 태도이자<br/>
          행복이다.
        </div>
        <div style={{fontSize:9.5,color:T.textMute,lineHeight:1.85,fontFamily:"'Noto Serif KR',Georgia,serif",fontStyle:"italic",marginTop:10,opacity:.8}}>
          Arete is no fleeting act,<br/>
          but our defining habit.<br/>
          It is the stance of Mesotes,<br/>
          and the state of Eudaimonia.
        </div>
      </div>

      {/* 네비게이션 — "카테고리" 라벨 없음 */}
      <div style={{padding:"14px 12px 0"}}>
        {/* 전체 */}
        <button onClick={()=>{setFilterCat("all");setShowBriefing(false);setShowHabit(false);}} style={{
          width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
          background:filterCat==="all"&&!showBriefing&&!showHabit?"#B0952022":"transparent",border:"none",
          display:"flex",alignItems:"center",gap:8,
          color:filterCat==="all"&&!showBriefing&&!showHabit?"#B09520":T.textSub,
          fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,fontWeight:filterCat==="all"&&!showBriefing&&!showHabit?600:400,
        }}>
          <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:filterCat==="all"&&!showBriefing&&!showHabit?"#B09520":T.borderMid}}/>
          홈
        </button>
        {/* 브리핑 */}
        <button onClick={()=>{setShowBriefing(true);setFilterCat("all");setShowHabit(false);}} style={{
          width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
          background:showBriefing?"#6B7C3A22":"transparent",border:"none",
          display:"flex",alignItems:"center",gap:8,
          color:showBriefing?"#6B7C3A":T.textSub,
          fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,fontWeight:showBriefing?600:400,
        }}>
          <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:showBriefing?"#6B7C3A":T.borderMid}}/>
          브리핑
        </button>
        {/* 습관 */}
        <button onClick={()=>{setShowHabit(true);setShowBriefing(false);setFilterCat("all");}} style={{
          width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
          background:showHabit?"#2E6FA522":"transparent",border:"none",
          display:"flex",alignItems:"center",gap:8,
          color:showHabit?"#2E6FA5":T.textSub,
          fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,fontWeight:showHabit?600:400,
        }}>
          <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:showHabit?"#2E6FA5":T.borderMid}}/>
          습관
        </button>
        {/* 아카이브 */}
        <button onClick={()=>{setFilterCat("archive");setShowBriefing(false);setShowHabit(false);}} style={{
          width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
          background:filterCat==="archive"&&!showBriefing&&!showHabit?"#7E4FA022":"transparent",border:"none",
          display:"flex",alignItems:"center",gap:8,
          color:filterCat==="archive"&&!showBriefing&&!showHabit?"#7E4FA0":T.textSub,
          fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,fontWeight:filterCat==="archive"&&!showBriefing&&!showHabit?600:400,
        }}>
          <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:filterCat==="archive"&&!showBriefing&&!showHabit?"#7E4FA0":T.borderMid}}/>
          아카이브
        </button>
      </div>

      {/* 위젯 */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px 16px"}}>
        <WeightSection logs={weightLogs} onRefetch={refetchWeight}/>
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
      ) : isHabitView ? (
        <HabitView/>
      ) : isArchiveView ? (
        <ArchiveView events={events} onOpen={setShowDetail} onAddFromArchive={handleAddFromArchive} isMobile={isMobile}/>
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
            <WeekView curDate={curDate} events={events} onOpen={setShowDetail} onAdd={handleAdd} isMobile={isMobile} todayStr={todayStr}/>
          ):view==="월"?(
            <div style={{flex:1,overflowY:"auto"}}>
              <MonthView curDate={curDate} events={events} onOpen={setShowDetail} onAdd={handleAdd} isMobile={isMobile} todayStr={todayStr}/>
            </div>
          ):(
            <div style={{flex:1,overflowY:isMobile?"hidden":"auto",display:"flex",flexDirection:"column"}}>
              <YearView curDate={curDate} events={events} onOpen={setShowDetail} isMobile={isMobile} todayStr={todayStr}/>
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
      fontFamily:isTablet?"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',sans-serif":"'Noto Sans KR',sans-serif",
      color:T.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@300;400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F7F4EF;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#F0EDE7;}
        ::-webkit-scrollbar-thumb{background:#CEC5B8;border-radius:2px;}
        ${isTablet?'':`input,textarea,button{font-family:'Noto Sans KR',sans-serif;}`}
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
                {showBriefing?"브리핑":isHabitView?"습관":"아카이브"}
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
          filterCat={filterCat} showBriefing={showBriefing} showHabit={showHabit}
          setFilterCat={setFilterCat} setShowBriefing={setShowBriefing} setShowHabit={setShowHabit}
        />
      )}

      {showDetail&&(
        <DetailModal ev={showDetail} onClose={()=>setShowDetail(null)} onRefetch={refetch} onRefetchWeight={refetchWeight}
          onCopy={(ev)=>{
            setAddPresetCat(ev.category);
            setAddPresetSub(ev.sub_category);
            setAddPresetTitle(ev.title);
            setAddPresetFields({...ev.fields});
            setAddPresetDate(null);
            setAddPresetHour(ev.hour!=null?String(ev.hour).padStart(2,'0'):null);
            setShowDetail(null);
            setShowAdd(true);
          }}
        />
      )}
      {showAdd&&(
        <AddModal
          presetDate={addPresetDate} presetHour={addPresetHour}
          presetCat={addPresetCat} presetSub={addPresetSub}
          presetTitle={addPresetTitle} presetFields={addPresetFields}
          addEventFn={addEvent} onSaved={refetch}
          onClose={()=>{setShowAdd(false);setAddPresetFields(null);setAddPresetTitle(null);}}
        />
      )}
    </div>
  );
}
