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
  BriefingView, BottomTabBar, MoreSheet,
} from "./components.jsx";

const todayStr = dateStr(today);

// ─────────────────────────────────────────────────────
// DAY VIEW (주별 뷰 내 시간 컬럼)
// ─────────────────────────────────────────────────────
function DayView({ date, events, onOpen, onAdd, filterCat }) {
  const ds = dateStr(date);
  const isToday = ds === todayStr;

  return (
    <div style={{ flex:1, minWidth:0 }}>
      {/* 날짜 헤더 */}
      <div style={{
        padding:"4px 6px",textAlign:"center",marginBottom:2,
        background: isToday ? T.accent : "transparent",
        borderRadius:8,
      }}>
        <div style={{fontSize:10,color:isToday?"#fff":T.textMute}}>{WEEKDAYS[date.getDay()]}</div>
        <div style={{fontSize:13,color:isToday?"#fff":T.text,fontWeight:isToday?700:400}}>{date.getDate()}</div>
      </div>

      {/* 시간 슬롯 */}
      <div style={{overflowY:"auto", maxHeight:"calc(100vh - 210px)"}}>
        {HOURS.map(h => {
          const evs = events.filter(e =>
            e.date === ds && e.hour === h &&
            (filterCat === "all" || e.category === filterCat)
          );
          return (
            <div key={h} onClick={()=>onAdd(ds, h)} style={{
              minHeight:36,borderTop:`1px solid ${T.border}`,
              padding:"2px 4px",cursor:"pointer",position:"relative",
            }}
            onMouseEnter={e=>e.currentTarget.style.background=T.bgSub}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              {h % 3 === 0 && (
                <div style={{position:"absolute",top:2,right:4,fontSize:8,color:T.textMute}}>
                  {String(h).padStart(2,"0")}
                </div>
              )}
              {evs.map(ev=>(
                <TaskChip key={ev.id} ev={ev} compact onOpen={onOpen}/>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// WEEK VIEW
// ─────────────────────────────────────────────────────
function WeekView({ curDate, events, filterCat, onOpen, onAdd }) {
  const days = useMemo(() => getWeekDays(curDate), [curDate]);

  return (
    <div style={{display:"flex",gap:4,overflowX:"auto"}}>
      {days.map((d,i) => (
        <DayView
          key={i} date={d} events={events}
          filterCat={filterCat} onOpen={onOpen}
          onAdd={(ds, h) => onAdd(ds, h)}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────────────────────
function MonthView({ curDate, events, filterCat, onOpen, onAdd }) {
  const cells = useMemo(() => getMonthCells(curDate), [curDate]);

  return (
    <div>
      {/* 요일 헤더 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {WEEKDAYS.map((d,i)=>(
          <div key={d} style={{
            textAlign:"center",fontSize:11,color:i===0?"#C0443A":i===6?"#2E6FA5":T.textSub,
            padding:"4px 0",fontWeight:500,
          }}>{d}</div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i) => {
          if (!d) return <div key={i}/>;
          const ds = dateStr(d);
          const isToday = ds === todayStr;
          const allEvs  = events.filter(e =>
            e.date === ds && (filterCat === "all" || e.category === filterCat)
          );
          const todoEvs = allEvs.filter(e => !e.done);
          const doneEvs = allEvs.filter(e =>  e.done);
          const isWknd  = d.getDay()===0||d.getDay()===6;

          return (
            <div key={i} onClick={()=>onAdd(ds,9)} style={{
              minHeight:80,borderRadius:8,padding:"4px 5px",cursor:"pointer",
              background: isToday ? T.accent+"18" : T.bgCard,
              border:`1px solid ${isToday ? T.accent+"55" : T.border}`,
              transition:"border-color .12s",
            }}
            onMouseEnter={e=>{ if(!isToday) e.currentTarget.style.borderColor=T.accent+"55"; }}
            onMouseLeave={e=>{ if(!isToday) e.currentTarget.style.borderColor=T.border; }}>
              <div style={{
                fontSize:11,fontWeight:isToday?700:400,marginBottom:3,
                color:isToday?T.accent:isWknd?d.getDay()===0?"#C0443A":"#2E6FA5":T.text,
              }}>{d.getDate()}</div>

              {/* 미완료 이벤트 */}
              {todoEvs.map(ev => {
                const cat = catOf(ev.category, ev.sub_category);
                return (
                  <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} style={{
                    fontSize:9,marginBottom:2,padding:"2px 5px",borderRadius:4,cursor:"pointer",
                    background:cat.bg,color:cat.text,
                    border:`1px solid ${cat.color}33`,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                  }}>{ev.title}</div>
                );
              })}

              {/* 완료 이벤트 */}
              {doneEvs.length > 0 && (
                <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:2}}>
                  {doneEvs.map(ev => {
                    const cat = catOf(ev.category, ev.sub_category);
                    return (
                      <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} style={{
                        width:7,height:7,borderRadius:"50%",
                        background:cat.color+"88",cursor:"pointer",
                      }} title={ev.title}/>
                    );
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
// YEAR VIEW
// ─────────────────────────────────────────────────────
function YearView({ curDate, events, filterCat, onOpen }) {
  const year = curDate.getFullYear();
  const months = Array.from({length:12}, (_,m) => m);

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      {months.map(m => {
        const cells = getMonthCells(new Date(year, m, 1));
        const monthEvs = events.filter(e => {
          const d = new Date(e.date);
          return d.getFullYear()===year && d.getMonth()===m &&
            (filterCat==="all" || e.category===filterCat);
        });
        const dots = monthEvs.slice(0,8);

        return (
          <div key={m} style={{background:T.bgCard,borderRadius:10,padding:"10px 8px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,fontWeight:600,color:T.textSub,marginBottom:6}}>
              {MONTHS_KR[m]}
            </div>
            {/* 미니 달력 */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:5}}>
              {cells.map((d,i) => {
                if (!d) return <div key={i}/>;
                const ds = dateStr(d);
                const hasEv = events.some(e =>
                  e.date === ds && (filterCat==="all" || e.category===filterCat)
                );
                const isTod = ds === todayStr;
                return (
                  <div key={i} style={{
                    fontSize:7,textAlign:"center",
                    color:isTod?T.accent:hasEv?T.text:T.textMute,
                    fontWeight:isTod?700:hasEv?600:400,
                    background:isTod?T.accent+"22":"transparent",
                    borderRadius:2,padding:"1px 0",
                  }}>{d.getDate()}</div>
                );
              })}
            </div>
            {/* 이벤트 점 */}
            {dots.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:4}}>
                {dots.map(ev=>{
                  const cat = catOf(ev.category, ev.sub_category);
                  return (
                    <div key={ev.id} onClick={e=>{e.stopPropagation();onOpen(ev);}} style={{
                      width:6,height:6,borderRadius:"50%",
                      background:cat.color,cursor:"pointer",opacity:ev.done?0.4:1,
                    }} title={ev.title}/>
                  );
                })}
                {monthEvs.length>8&&(
                  <div style={{fontSize:7,color:T.textMute,lineHeight:"6px"}}>+{monthEvs.length-8}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// ARCHIVE ENTRY CARD
// ─────────────────────────────────────────────────────
function ArchiveEntryCard({ ev, accentColor, onOpen }) {
  const f = ev.fields || {};

  const renderContent = () => {
    switch (ev.sub_category) {
      case "weight":
        return (
          <div>
            {f.weight && (
              <span style={{fontSize:22,fontWeight:700,color:accentColor,fontFamily:"'Libre Baskerville',serif"}}>
                {f.weight}<span style={{fontSize:13,fontWeight:400,marginLeft:3}}>kg</span>
              </span>
            )}
            {ev.detail && <div style={{fontSize:12,color:T.textSub,marginTop:4}}>{ev.detail}</div>}
          </div>
        );

      case "diet": {
        const meals = [["breakfast","아침"],["lunch","점심"],["dinner","저녁"],["snack","간식"]];
        return (
          <div>
            {meals.filter(([k]) => f[k]).map(([k,label]) => (
              <div key={k} style={{fontSize:12,color:T.text,marginBottom:3,display:"flex",gap:8}}>
                <span style={{color:T.textMute,fontSize:10,minWidth:22}}>{label}</span>
                <span>{f[k]}</span>
              </div>
            ))}
            {(f.calories||f.protein) && (
              <div style={{fontSize:10,color:T.textMute,marginTop:5,display:"flex",gap:10}}>
                {f.calories&&<span>🔥 {f.calories}</span>}
                {f.protein&&<span>💪 단백질 {f.protein}</span>}
              </div>
            )}
          </div>
        );
      }

      case "weight_training":
        return (
          <div>
            <div style={{display:"flex",gap:12,fontSize:12,color:T.text,marginBottom:5,flexWrap:"wrap"}}>
              {f.part     && <span style={{fontWeight:600}}>{f.part}</span>}
              {f.duration && <span style={{color:T.textSub}}>· {f.duration}</span>}
              {f.condition && (
                <span style={{color:T.textSub}}>
                  · 컨디션 {"★".repeat(f.condition)}{"☆".repeat(5-f.condition)}
                </span>
              )}
            </div>
            {ev.detail && (
              <pre style={{
                fontSize:11,color:T.textSub,whiteSpace:"pre-wrap",margin:0,
                lineHeight:1.7,fontFamily:"'Noto Sans KR',sans-serif",
              }}>{ev.detail}</pre>
            )}
          </div>
        );

      case "cardio":
        return (
          <div>
            <div style={{display:"flex",gap:8,fontSize:12,color:T.text,flexWrap:"wrap",marginBottom:f.calories||ev.detail?4:0}}>
              {f.type     && <span style={{fontWeight:600}}>{f.type}</span>}
              {f.distance && <span>· {f.distance}</span>}
              {f.avgSpeed && <span>· {f.avgSpeed}</span>}
              {f.avgHr    && <span>· 심박 {f.avgHr}</span>}
              {f.calories && <span>· {f.calories}</span>}
            </div>
            {ev.detail && <div style={{fontSize:11,color:T.textSub}}>{ev.detail}</div>}
          </div>
        );

      case "economy":
        return (
          <div>
            {f.index && (
              <div style={{fontSize:12,color:T.text,fontWeight:600,marginBottom:5}}>{f.index}</div>
            )}
            {f.keyword && (
              <div style={{marginBottom:7}}>
                {f.keyword.split(/\s+/).filter(Boolean).map((kw,i) => (
                  <span key={i} style={{
                    display:"inline-block",marginRight:4,marginBottom:3,
                    padding:"2px 8px",borderRadius:10,fontSize:10,
                    background:accentColor+"18",color:accentColor,
                    border:`1px solid ${accentColor}33`,
                  }}>{kw}</span>
                ))}
              </div>
            )}
            {ev.detail && (
              <div style={{fontSize:12,color:T.text,lineHeight:1.75}}>{ev.detail}</div>
            )}
            {f.watchlist && (
              <div style={{fontSize:11,color:T.textMute,marginTop:7,paddingTop:7,borderTop:`1px dashed ${T.border}`}}>
                내일 주목: {f.watchlist}
              </div>
            )}
          </div>
        );

      case "book":
        return (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:3,fontFamily:"'Libre Baskerville',serif"}}>
              {f.bookTitle || ev.title}
              {f.author && (
                <span style={{fontSize:11,fontWeight:400,color:T.textSub,fontFamily:"'Noto Sans KR',sans-serif"}}> · {f.author}</span>
              )}
            </div>
            {(f.genre||f.period) && (
              <div style={{fontSize:10,color:T.textMute,marginBottom:6}}>
                {f.genre}{f.genre&&f.period&&" · "}{f.period}
              </div>
            )}
            {f.score && (
              <div style={{fontSize:13,marginBottom:5,color:accentColor}}>
                {"★".repeat(f.score)}{"☆".repeat(5-f.score)}
              </div>
            )}
            {ev.detail && (
              <div style={{fontSize:12,color:T.textSub,lineHeight:1.7}}>{ev.detail}</div>
            )}
          </div>
        );

      case "wine":
        return (
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:3,fontFamily:"'Libre Baskerville',serif"}}>
              {f.wineName || ev.title}
              {f.vintage && <span style={{fontSize:11,fontWeight:400,color:T.textSub,fontFamily:"'Noto Sans KR',sans-serif"}}> {f.vintage}</span>}
            </div>
            {(f.origin||f.grape) && (
              <div style={{fontSize:10,color:T.textMute,marginBottom:6}}>
                {f.origin}{f.origin&&f.grape&&" · "}{f.grape}
              </div>
            )}
            {f.score && (
              <div style={{fontSize:13,marginBottom:5,color:accentColor}}>
                {"★".repeat(f.score)}{"☆".repeat(5-f.score)}
              </div>
            )}
            {ev.detail && <div style={{fontSize:12,color:T.textSub}}>{ev.detail}</div>}
          </div>
        );

      case "coffee":
        return (
          <div>
            {f.cafe && (
              <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:3}}>{f.cafe}</div>
            )}
            {(f.menu||f.price) && (
              <div style={{fontSize:12,color:T.textSub,marginBottom:4}}>
                {f.menu}{f.menu&&f.price&&" · "}{f.price}
              </div>
            )}
            {ev.detail && <div style={{fontSize:12,color:T.textSub}}>{ev.detail}</div>}
          </div>
        );

      default:
        return ev.detail
          ? <div style={{fontSize:12,color:T.textSub,lineHeight:1.75}}>{ev.detail}</div>
          : null;
    }
  };

  return (
    <div
      onClick={() => onOpen && onOpen(ev)}
      style={{
        background:T.bgCard,borderRadius:10,padding:"12px 14px",
        border:`1px solid ${T.border}`,borderLeft:`3px solid ${accentColor}`,
        cursor:"pointer",transition:"box-shadow .12s",
        boxShadow:"0 1px 4px rgba(44,40,37,0.05)",
      }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 18px ${accentColor}22`}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(44,40,37,0.05)"}
    >
      <div style={{fontSize:10,color:T.textMute,marginBottom:7,letterSpacing:.3}}>{ev.date}</div>
      {renderContent()}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// ARCHIVE VIEW — 건강 / 경제 / 리뷰 / 기타 섹션
// ─────────────────────────────────────────────────────
const ARCHIVE_VIEW_SECTS = [
  { id:"health",  label:"건강", color:"#2E6FA5", bg:"#E8F2FA", text:"#1A4E7A",
    subs:["weight","diet","weight_training","cardio"] },
  { id:"economy", label:"경제", color:"#3A52A0", bg:"#EAECF8", text:"#243580",
    subs:["economy"] },
  { id:"review",  label:"리뷰", color:"#7E4FA0", bg:"#F3EBF8", text:"#5A2E80",
    subs:["book","wine","coffee"] },
  { id:"etc",     label:"기타", color:"#4A8A5A", bg:"#EBF5EE", text:"#2E6640",
    subs:null },
];
const KNOWN_ARCHIVE_SUBS = ["weight","diet","weight_training","cardio","economy","book","wine","coffee"];

function ArchiveView({ events, onOpen }) {
  const [activeSec, setActiveSec] = useState("health");

  const archiveEvs = events.filter(e => e.category === "archive");

  const filtered = archiveEvs
    .filter(e => {
      const sec = ARCHIVE_VIEW_SECTS.find(s => s.id === activeSec);
      if (!sec) return false;
      if (sec.subs === null) return !KNOWN_ARCHIVE_SUBS.includes(e.sub_category);
      return sec.subs.includes(e.sub_category);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeDef = ARCHIVE_VIEW_SECTS.find(s => s.id === activeSec);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 155px)"}}>

      {/* 4섹션 탭 — 각 1/4 너비, 수평 분할 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:14,flexShrink:0}}>
        {ARCHIVE_VIEW_SECTS.map(sec => {
          const count = archiveEvs.filter(e =>
            sec.subs === null
              ? !KNOWN_ARCHIVE_SUBS.includes(e.sub_category)
              : sec.subs.includes(e.sub_category)
          ).length;
          const active = activeSec === sec.id;

          return (
            <button key={sec.id} onClick={()=>setActiveSec(sec.id)} style={{
              padding:"14px 6px",borderRadius:12,cursor:"pointer",
              background: active ? sec.color : T.bgCard,
              border:`1px solid ${active ? sec.color : T.border}`,
              color: active ? "white" : T.textSub,
              fontWeight: active ? 700 : 400,
              fontSize:14,fontFamily:"'Noto Sans KR',sans-serif",
              display:"flex",flexDirection:"column",alignItems:"center",gap:4,
              boxShadow: active ? `0 4px 18px ${sec.color}44` : "none",
              transition:"all .15s",
            }}>
              {sec.label}
              {count > 0 && (
                <span style={{fontSize:9,opacity:.75}}>{count}개</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 메모 목록 */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.length === 0 ? (
          <div style={{
            display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",height:"100%",gap:10,
          }}>
            <div style={{fontSize:26,opacity:.2}}>○</div>
            <div style={{fontSize:13,color:T.textMute}}>기록이 없습니다</div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(e => (
              <ArchiveEntryCard
                key={e.id} ev={e}
                accentColor={activeDef?.color || T.accent}
                onOpen={onOpen}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// MAIN YAMLOG COMPONENT
// ─────────────────────────────────────────────────────
export default function Yamlog() {
  const isMobile = useIsMobile();

  // 뷰 상태
  const [filterCat,    setFilterCat]    = useState("all");
  const [view,         setView]         = useState("주");
  const [curDate,      setCurDate]      = useState(today);
  const [showBriefing, setShowBriefing] = useState(false);

  // 모달 상태
  const [showDetail,    setShowDetail]    = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [addPresetDate, setAddPresetDate] = useState(null);
  const [addPresetHour, setAddPresetHour] = useState(null);

  // 모바일 추가 UI
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  // 아카이브 뷰 (filterCat="archive" 이면 ArchiveView 표시)
  const isArchiveView = filterCat === "archive" && !showBriefing;

  // 이벤트 로드 — filterCat="archive" 이면 archive만, "all" 이면 전체
  const { events, loading, refetch } = useEvents(
    showBriefing ? null : filterCat === "all" ? null : filterCat
  );

  // 날짜 이동
  const nav = (dir) => {
    const d = new Date(curDate);
    if (view === "주")     d.setDate(d.getDate() + dir * 7);
    else if (view === "월") d.setMonth(d.getMonth() + dir);
    else                   d.setFullYear(d.getFullYear() + dir);
    setCurDate(d);
  };

  // 날짜 레이블
  const dateLabel = () => {
    if (view === "주") {
      const days = getWeekDays(curDate);
      const s    = days[0], e = days[6];
      return `${s.getMonth()+1}/${s.getDate()} – ${e.getMonth()+1}/${e.getDate()}`;
    }
    if (view === "월") return `${curDate.getFullYear()}년 ${MONTHS_KR[curDate.getMonth()]}`;
    return `${curDate.getFullYear()}년`;
  };

  // Add 핸들러
  const handleAdd = (ds, h) => {
    setAddPresetDate(ds || null);
    setAddPresetHour(h != null ? String(h).padStart(2,"0") : null);
    setShowAdd(true);
  };

  // ─── SIDEBAR ───────────────────────────────────────
  const sidebar = (
    <div style={{
      width:220,flexShrink:0,height:"100vh",
      background:T.bgCard,borderRight:`1px solid ${T.border}`,
      display:"flex",flexDirection:"column",overflow:"hidden",
    }}>
      {/* 로고 영역 */}
      <div style={{padding:"22px 18px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{
          fontFamily:"'Libre Baskerville',Georgia,serif",
          fontSize:18,fontWeight:700,color:T.text,
          letterSpacing:-.3,lineHeight:1,marginBottom:3,
        }}>얌로그</div>
        <LiveClock/>
        <div style={{
          fontSize:10,color:T.textMute,marginTop:3,fontFamily:"'Noto Sans KR',sans-serif",
        }}>{today.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}</div>
      </div>

      {/* 인용문 — 한글 크게, 영어 연하고 작게 이탤릭 */}
      <div style={{padding:"16px 18px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{
          fontSize:13,
          color:T.text,
          lineHeight:2,
          fontFamily:"'Noto Sans KR',sans-serif",
          fontWeight:500,
        }}>
          탁월함은 일시적 행위가 아니라<br/>
          우리를 정의하는 습관이다.
          <br/><br/>
          이는 곧 중용의 태도이자<br/>
          행복이다.
        </div>
        <div style={{
          fontSize:9.5,
          color:T.textMute,
          lineHeight:1.85,
          fontFamily:"'Libre Baskerville',Georgia,serif",
          fontStyle:"italic",
          marginTop:10,
          opacity:0.8,
        }}>
          Arete is no fleeting act,<br/>
          but our defining habit.
          <br/><br/>
          It is the stance of Mesotes,<br/>
          and the state of Eudaimonia.
        </div>
      </div>

      {/* 카테고리 네비게이션 */}
      <div style={{padding:"14px 12px 0"}}>
        {/* 전체 보기 */}
        <button onClick={()=>{setFilterCat("all");setShowBriefing(false);}} style={{
          width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,
          cursor:"pointer",marginBottom:2,
          background:filterCat==="all"&&!showBriefing?T.bgSub:"transparent",
          border:"none",display:"flex",alignItems:"center",gap:8,
          color:filterCat==="all"&&!showBriefing?T.text:T.textSub,
          fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,
          fontWeight:filterCat==="all"&&!showBriefing?600:400,
        }}>
          <div style={{
            width:7,height:7,borderRadius:"50%",flexShrink:0,
            background:filterCat==="all"&&!showBriefing?T.accent:T.borderMid,
          }}/>
          전체
        </button>

        {/* 브리핑 */}
        <button onClick={()=>{setShowBriefing(true);setFilterCat("all");}} style={{
          width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,
          cursor:"pointer",marginBottom:8,
          background:showBriefing?"#6B7C3A22":"transparent",
          border:"none",display:"flex",alignItems:"center",gap:8,
          color:showBriefing?"#6B7C3A":T.textSub,
          fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,
          fontWeight:showBriefing?600:400,
        }}>
          <div style={{
            width:7,height:7,borderRadius:"50%",flexShrink:0,
            background:showBriefing?"#6B7C3A":T.borderMid,
          }}/>
          브리핑
        </button>

        {/* 카테고리들 */}
        <div style={{fontSize:9,color:T.textMute,letterSpacing:.8,textTransform:"uppercase",marginBottom:5,paddingLeft:10}}>카테고리</div>
        {CATS.map(cat => (
          <button key={cat.id} onClick={()=>{setFilterCat(cat.id);setShowBriefing(false);}} style={{
            width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,cursor:"pointer",
            marginBottom:2,
            background:filterCat===cat.id&&!showBriefing?cat.bg:"transparent",
            border:"none",display:"flex",alignItems:"center",gap:8,
            color:filterCat===cat.id&&!showBriefing?cat.text:T.textSub,
            fontFamily:"'Noto Sans KR',sans-serif",fontSize:13,
            fontWeight:filterCat===cat.id&&!showBriefing?600:400,
          }}>
            <div style={{
              width:7,height:7,borderRadius:"50%",flexShrink:0,
              background:filterCat===cat.id&&!showBriefing?cat.color:T.borderMid,
            }}/>
            {cat.label}
          </button>
        ))}
      </div>

      {/* 사이드바 하단 위젯 */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px 16px"}}>
        <WeightSection/>
        <WordSection/>
        <RandomReview events={events} onOpen={setShowDetail}/>
      </div>
    </div>
  );

  // ─── 메인 콘텐츠 ─────────────────────────────────
  const mainContent = (
    <div style={{flex:1,overflowY:"auto",padding:isMobile?"12px 10px":"18px 22px",paddingBottom:isMobile?80:18}}>
      {showBriefing ? (
        // 브리핑 뷰
        <BriefingView/>
      ) : isArchiveView ? (
        // 아카이브 뷰 — 브리핑처럼 별도 뷰로 전환
        <ArchiveView events={events} onOpen={setShowDetail}/>
      ) : (
        // 캘린더 뷰 (일정/이벤트/전체)
        <>
          {/* 헤더 */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>nav(-1)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:14,color:T.textSub}}>‹</button>
              <div style={{fontSize:14,fontWeight:600,color:T.text,minWidth:130,textAlign:"center"}}>{dateLabel()}</div>
              <button onClick={()=>nav(1)}  style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:14,color:T.textSub}}>›</button>
              <button onClick={()=>setCurDate(new Date())} style={{
                background:T.bgSub,border:`1px solid ${T.border}`,borderRadius:7,
                padding:"4px 10px",cursor:"pointer",fontSize:11,color:T.textSub,
              }}>오늘</button>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {/* 뷰 전환 */}
              <div style={{display:"flex",background:T.bgSub,borderRadius:8,padding:3,border:`1px solid ${T.border}`}}>
                {VIEWS.map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{
                    padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:12,
                    background:view===v?T.bgCard:"transparent",
                    border:view===v?`1px solid ${T.border}`:"none",
                    color:view===v?T.text:T.textSub,fontWeight:view===v?600:400,
                    boxShadow:view===v?"0 1px 3px rgba(44,40,37,0.08)":"none",
                    fontFamily:"'Noto Sans KR',sans-serif",
                  }}>{v}</button>
                ))}
              </div>
              {/* 추가 버튼 */}
              <button onClick={()=>handleAdd(null,null)} style={{
                background:T.accent,border:"none",borderRadius:9,
                padding:"7px 14px",cursor:"pointer",fontSize:12,
                color:"white",fontWeight:600,
                boxShadow:`0 2px 10px ${T.accent}44`,
                fontFamily:"'Noto Sans KR',sans-serif",
              }}>+ 추가</button>
            </div>
          </div>

          {/* 뷰 본체 */}
          {loading ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200}}>
              <div style={{fontSize:13,color:T.textMute}}>불러오는 중...</div>
            </div>
          ) : view==="주" ? (
            <WeekView curDate={curDate} events={events} filterCat={filterCat} onOpen={setShowDetail} onAdd={handleAdd}/>
          ) : view==="월" ? (
            <MonthView curDate={curDate} events={events} filterCat={filterCat} onOpen={setShowDetail} onAdd={handleAdd}/>
          ) : (
            <YearView curDate={curDate} events={events} filterCat={filterCat} onOpen={setShowDetail}/>
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

      {/* 데스크탑: 사이드바 */}
      {!isMobile && sidebar}

      {/* 메인 */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* 모바일: 상단 탭바 대신 BottomTabBar */}
        {isMobile && !showBriefing && !isArchiveView && (
          <div style={{
            padding:"10px 12px 0",background:T.bgCard,
            borderBottom:`1px solid ${T.border}`,flexShrink:0,
          }}>
            {/* 날짜 헤더 + 뷰 전환 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>nav(-1)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"3px 8px",cursor:"pointer",fontSize:14,color:T.textSub}}>‹</button>
                <div style={{fontSize:13,fontWeight:600,color:T.text}}>{dateLabel()}</div>
                <button onClick={()=>nav(1)}  style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"3px 8px",cursor:"pointer",fontSize:14,color:T.textSub}}>›</button>
              </div>
              <div style={{display:"flex",gap:5}}>
                <div style={{display:"flex",background:T.bgSub,borderRadius:7,padding:2,border:`1px solid ${T.border}`}}>
                  {VIEWS.map(v=>(
                    <button key={v} onClick={()=>setView(v)} style={{
                      padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:11,
                      background:view===v?T.bgCard:"transparent",
                      border:view===v?`1px solid ${T.border}`:"none",
                      color:view===v?T.text:T.textSub,
                    }}>{v}</button>
                  ))}
                </div>
                <button onClick={()=>handleAdd(null,null)} style={{
                  background:T.accent,border:"none",borderRadius:7,
                  padding:"5px 12px",cursor:"pointer",fontSize:11,color:"white",fontWeight:600,
                }}>+</button>
              </div>
            </div>
          </div>
        )}

        {/* 모바일 아카이브/브리핑 헤더 */}
        {isMobile && (showBriefing || isArchiveView) && (
          <div style={{padding:"14px 14px 10px",background:T.bgCard,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
            <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Libre Baskerville',serif"}}>
              {showBriefing ? "브리핑" : "아카이브"}
            </div>
          </div>
        )}

        {mainContent}
      </div>

      {/* 모바일 하단 탭 */}
      {isMobile && (
        <BottomTabBar
          filterCat={filterCat} showBriefing={showBriefing}
          setFilterCat={setFilterCat} setShowBriefing={setShowBriefing}
          setShowMoreSheet={setShowMoreSheet}
        />
      )}

      {/* 더보기 시트 */}
      {isMobile && showMoreSheet && (
        <MoreSheet
          filterCat={filterCat} showBriefing={showBriefing}
          setFilterCat={setFilterCat} setShowBriefing={setShowBriefing}
          onClose={()=>setShowMoreSheet(false)}
        />
      )}

      {/* Detail Modal */}
      {showDetail && (
        <DetailModal
          ev={showDetail}
          onClose={()=>setShowDetail(null)}
          onRefetch={refetch}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddModal
          presetDate={addPresetDate}
          presetHour={addPresetHour}
          addEventFn={addEvent}
          onSaved={refetch}
          onClose={()=>setShowAdd(false)}
        />
      )}
    </div>
  );
}
