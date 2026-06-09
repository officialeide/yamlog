/* ─────────────────────────────────────────────────────
   COMPONENTS.JSX — 모달, 사이드바 위젯, 네비게이션
───────────────────────────────────────────────────── */
import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  T, CATS, ARCHIVE_SECTS, HEALTH_SUBS, REVIEW_SUBS,
  TOEIC_WORDS, catOf, dateStr, KNOWN_SUBS, TAB_ITEMS,
} from "./constants.js";
import { supabase, updateEvent, upsertWeight, deleteEvent, deleteWeight } from "./api.js";

// ─────────────────────────────────────────────────────
// LIVE CLOCK
// ─────────────────────────────────────────────────────
export function LiveClock() {
  const fmt = () => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
  };
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const timerRef = { current: null };
    const tick = () => {
      setTime(fmt());
      const now = new Date();
      const msToNext = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      timerRef.current = setTimeout(tick, msToNext);
    };
    const now = new Date();
    const msToNext = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    timerRef.current = setTimeout(tick, msToNext);
    return () => clearTimeout(timerRef.current);
  }, []);
  return (
    <span style={{fontSize:10,color:T.textMute,fontFamily:"'KoPub Dotum',sans-serif",fontWeight:400,letterSpacing:.3}}>
      {time}
    </span>
  );
}


// ─────────────────────────────────────────────────────
// DETAIL MODAL — 필드 내용 표시 + 삭제 버튼 + 수정 연동
// ─────────────────────────────────────────────────────
export function DetailModal({ ev, onClose, onRefetch, onRefetchWeight }) {
  const cat = catOf(ev.category||ev.cat, ev.sub_category||ev.sub);
  const [done,     setDone]     = useState(ev.done);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggleDone = async () => {
    const newDone = !done;
    setDone(newDone);
    await supabase.from("events").update({ done: newDone }).eq("id", ev.id);
    onRefetch?.();
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteEvent(ev.id);
      // 체중 이벤트면 weight_logs도 무조건 삭제 (날짜당 1개만 기록)
      if (ev.sub_category === "weight" && ev.date) {
        await deleteWeight(ev.date);
      }
      onRefetch?.();
      onRefetchWeight?.();
      onClose();
    } catch(e) {
      console.error("삭제 실패:", e);
      setDeleting(false);
    }
  };

  // 구조화 필드 렌더링
  const renderFields = () => {
    const f   = ev.fields || {};
    const sub = ev.sub_category;
    if (!f || Object.keys(f).length === 0) return null;
    const rows = [];

    if (sub === "weight" && f.weight) {
      rows.push(
        <div key="w" style={{textAlign:"center",padding:"10px 0 6px"}}>
          <span style={{fontSize:32,fontWeight:700,color:"#D4867E",fontFamily:"'Libre Baskerville',serif"}}>{f.weight}</span>
          <span style={{fontSize:15,color:T.textSub,marginLeft:5}}>kg</span>
        </div>
      );
    }

    if (sub === "diet") {
      [["breakfast","아침"],["lunch","점심"],["dinner","저녁"],["snack","간식"]]
        .filter(([k]) => f[k])
        .forEach(([k,label]) => {
          rows.push(
            <div key={k} style={{display:"flex",gap:14,marginBottom:6,alignItems:"flex-start"}}>
              <span style={{fontSize:11,color:T.textMute,minWidth:26,paddingTop:1}}>{label}</span>
              <span style={{fontSize:13,color:T.text,flex:1,lineHeight:1.5}}>{f[k]}</span>
            </div>
          );
        });
      if (f.calories||f.protein||f.sugar) {
        const GOALS = { calories:1400, protein:100, sugar:25 };
        rows.push(
          <div key="stats" style={{marginTop:6,display:"flex",gap:14,fontSize:11,paddingTop:6,borderTop:`1px dashed ${T.border}`}}>
            {f.calories&&<span>🔥 <span style={{color:T.text}}>{f.calories}</span><span style={{color:T.textMute}}>/{GOALS.calories} kcal</span></span>}
            {f.protein&&<span>🍖 <span style={{color:T.text}}>{f.protein}</span><span style={{color:T.textMute}}>/{GOALS.protein} g</span></span>}
            {f.sugar&&<span>🧁 <span style={{color:T.text}}>{f.sugar}</span><span style={{color:T.textMute}}>/{GOALS.sugar} g</span></span>}
          </div>
        );
      }
    }

    if (sub === "weight_training") {
      if (f.part||f.duration||f.condition) {
        rows.push(
          <div key="wt" style={{display:"flex",gap:10,marginBottom:4,fontSize:13,color:T.text,flexWrap:"wrap"}}>
            {f.part&&<span style={{fontWeight:600}}>{f.part}</span>}
            {f.duration&&<span style={{color:T.textSub}}>· {f.duration}</span>}
            {f.condition&&<span style={{color:T.textSub}}>· 컨디션 {f.condition}/5</span>}
          </div>
        );
      }
    }

    if (sub === "cardio") {
      rows.push(
        <div key="cardio" style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:13,color:T.text,marginBottom:4}}>
          {f.type&&<span style={{fontWeight:600}}>{f.type}</span>}
          {f.distance&&<span>· {f.distance}</span>}
          {f.avgSpeed&&<span>· {f.avgSpeed}</span>}
          {f.avgHr&&<span>· 심박 {f.avgHr}</span>}
          {f.calories&&<span>· {f.calories}</span>}
        </div>
      );
    }

    if (sub === "economy") {
      if (f.index) rows.push(<div key="idx" style={{fontSize:13,color:T.text,fontWeight:600,marginBottom:5}}>{f.index}</div>);
      if (f.keyword) rows.push(
        <div key="kw" style={{marginBottom:7}}>
          {f.keyword.split(/\s+/).filter(Boolean).map((kw,i)=>(
            <span key={i} style={{
              display:"inline-block",marginRight:4,marginBottom:3,
              padding:"2px 8px",borderRadius:10,fontSize:10,
              background:"#3A52A022",color:"#243580",border:"1px solid #3A52A033",
            }}>{kw}</span>
          ))}
        </div>
      );
      if (f.watchlist) rows.push(
        <div key="wl" style={{fontSize:11,color:T.text,marginTop:6,paddingTop:6,borderTop:`1px dashed ${T.border}`}}>✔️ {f.watchlist}</div>
      );
    }

    if (sub === "book") {
      if (f.bookTitle) rows.push(
        <div key="bt" style={{fontFamily:"'Libre Baskerville',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:3}}>
          {f.bookTitle}{f.author&&<span style={{fontSize:12,fontWeight:400,color:T.textSub,fontFamily:"'KoPub Dotum',sans-serif"}}> · {f.author}</span>}
        </div>
      );
      if (f.genre||f.period) rows.push(<div key="bmeta" style={{fontSize:10,color:T.textMute,marginBottom:5}}>{f.genre}{f.genre&&f.period&&" · "}{f.period}</div>);
      if (f.score) rows.push(<div key="bscore" style={{fontSize:15,color:"#7E4FA0",marginBottom:6}}>{"★".repeat(f.score)}{"☆".repeat(5-f.score)}</div>);
      if (f.record) rows.push(
        <div key="brec" style={{fontSize:12,color:T.text,lineHeight:1.7,marginBottom:6,whiteSpace:"pre-wrap"}}>{f.record}</div>
      );
    }

    if (sub === "wine") {
      if (f.wineName) rows.push(
        <div key="wn" style={{fontFamily:"'Libre Baskerville',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:3}}>
          {f.wineName}{f.vintage&&<span style={{fontSize:11,fontWeight:400,color:T.textSub,fontFamily:"'KoPub Dotum',sans-serif"}}> {f.vintage}</span>}
        </div>
      );
      if (f.origin||f.grape) rows.push(<div key="wmeta" style={{fontSize:10,color:T.textMute,marginBottom:5}}>{f.origin}{f.origin&&f.grape&&" · "}{f.grape}</div>);
      if (f.alcohol) rows.push(<div key="walc" style={{fontSize:11,color:T.textMute,marginBottom:4}}>도수 {f.alcohol}</div>);
      if (f.sweetness||f.acidity||f.tannin||f.body||f.score) rows.push(
        <div key="wtaste" style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:5,marginTop:2,alignItems:"center"}}>
          {[["sweetness","당도"],["acidity","산도"],["tannin","타닌"],["body","바디"],["score","총점"]].filter(([k])=>f[k]).map(([k,label])=>(
            <span key={k} style={{fontSize:11}}>
              <span style={{color:T.textMute,fontSize:10}}>{label} </span>
              <span style={{fontWeight:k==="score"?700:500,color:k==="score"?"#7E4FA0":T.text}}>{f[k]}</span>
            </span>
          ))}
        </div>
      );
    }

    if (sub === "coffee") {
      if (f.cafe) rows.push(<div key="cafe" style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:3}}>{f.cafe}</div>);
      if (f.menu||f.price) rows.push(<div key="cmeta" style={{fontSize:12,color:T.textSub,marginBottom:4}}>{f.menu}{f.menu&&f.price&&" · "}{f.price}</div>);
    }

    return rows.length>0 ? <div style={{marginBottom:10}}>{rows}</div> : null;
  };

  if (showEdit) {
    return (
      <EditModal
        ev={{...ev,done}}
        onClose={()=>setShowEdit(false)}
        onSaved={()=>{ setShowEdit(false); onRefetch?.(); onClose(); }}
      />
    );
  }

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(44,40,37,0.45)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,
      backdropFilter:"blur(3px)",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.bgCard,borderRadius:18,
        width:440,maxWidth:"92vw",maxHeight:"82vh",
        boxShadow:"0 16px 60px rgba(44,40,37,0.18)",
        display:"flex",flexDirection:"column",
        border:`1px solid ${T.border}`,overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{background:cat.bg,borderBottom:`1px solid ${T.border}`,padding:"18px 22px 14px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{
              width:36,height:36,borderRadius:10,flexShrink:0,
              background:cat.color+"22",border:`1.5px solid ${cat.color}55`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,color:cat.color,fontWeight:700,marginTop:1,
            }}>{cat.label.slice(0,2)}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:17,color:T.text,fontWeight:600,lineHeight:1.3,fontFamily:"'Libre Baskerville',serif"}}>
                {ev.title}
              </div>
              <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:11,padding:"2px 9px",borderRadius:20,
                  background:cat.color+"18",color:cat.color,border:`1px solid ${cat.color}33`,fontWeight:500}}>
                  {cat.label}
                </span>
                <span style={{fontSize:11,color:T.textMute}}>
                  {ev.date}&nbsp;&nbsp;{String(ev.hour).padStart(2,"0")}:00
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{
              background:"transparent",border:"none",color:T.textMute,
              cursor:"pointer",fontSize:20,padding:"0 4px",lineHeight:1,flexShrink:0,
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 22px"}}>
          {/* 구조화 필드 */}
          {renderFields()}
          {/* 텍스트 상세 */}
          {ev.detail ? (
            <pre style={{fontFamily:"'KoPub Dotum',sans-serif",fontSize:13,
              color:T.text,lineHeight:1.85,whiteSpace:"pre-wrap",margin:0}}>
              {ev.detail}
            </pre>
          ) : (!ev.fields || Object.keys(ev.fields||{}).length === 0) ? (
            <div style={{color:T.textMute,fontSize:13,fontStyle:"italic"}}>상세 내용이 없습니다.</div>
          ) : null}

        </div>

        {/* Footer */}
        <div style={{
          borderTop:`1px solid ${T.border}`,padding:"12px 22px",
          display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bgSub,gap:8,
        }}>
          {/* 완료 토글 */}
          <button onClick={handleToggleDone} style={{
            display:"flex",alignItems:"center",gap:7,cursor:"pointer",flexShrink:0,
            background:"transparent",border:`1.5px solid ${done?cat.color:T.borderMid}`,
            borderRadius:9,padding:"7px 12px",
            color:done?cat.color:T.textSub,fontSize:12,fontWeight:500,transition:"all .15s",
          }}>
            <div style={{
              width:13,height:13,borderRadius:"50%",
              background:done?cat.color:"transparent",
              border:`1.5px solid ${done?cat.color:T.borderMid}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:8,color:"white",
            }}>{done&&"✓"}</div>
            {done?"완료됨":"완료"}
          </button>

          <div style={{display:"flex",gap:6}}>
            {/* 삭제 버튼 */}
            <button onClick={handleDelete} disabled={deleting} style={{
              padding:"7px 12px",borderRadius:9,cursor:"pointer",fontSize:12,
              background:confirmDelete?"#C0443A":"transparent",
              border:`1px solid ${confirmDelete?"#C0443A":T.borderMid}`,
              color:confirmDelete?"white":T.textMute,
              fontWeight:confirmDelete?600:400,transition:"all .15s",
            }}>
              {deleting?"삭제 중...":confirmDelete?"확인":"삭제"}
            </button>
            {confirmDelete&&(
              <button onClick={()=>setConfirmDelete(false)} style={{
                padding:"7px 12px",borderRadius:9,cursor:"pointer",fontSize:12,
                background:"transparent",border:`1px solid ${T.border}`,color:T.textSub,
              }}>취소</button>
            )}
            <button onClick={()=>setShowEdit(true)} style={{
              padding:"7px 14px",borderRadius:9,cursor:"pointer",fontSize:12,
              background:T.accent,border:"none",color:"white",fontWeight:600,
            }}>수정</button>
            <button onClick={onClose} style={{
              padding:"7px 14px",borderRadius:9,cursor:"pointer",fontSize:12,
              background:"transparent",border:`1px solid ${T.border}`,color:T.textSub,
            }}>닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// EDIT MODAL
// ─────────────────────────────────────────────────────
function EditModal({ ev, onClose, onSaved }) {
  const cat = catOf(ev.category, ev.sub_category);
  const sub = ev.sub_category || "";

  const isWeight         = sub === "weight";
  const isDiet           = sub === "diet";
  const isWeightTraining = sub === "weight_training";
  const isCardio         = sub === "cardio";
  const isEconomy        = sub === "economy";
  const isBook           = sub === "book";
  const isWine           = sub === "wine";
  const isCoffee         = sub === "coffee";
  const isBasic = ev.category === "schedule" || ev.category === "event"
    || (ev.category === "archive" && !KNOWN_SUBS.includes(sub));

  const [title,      setTitle]      = useState(ev.title  || "");
  const [detail,     setDetail]     = useState(ev.detail || "");
  const [date,       setDate]       = useState(ev.date   || dateStr(new Date()));
  const [startTime,  setStartTime]  = useState(`${String(ev.hour??9).padStart(2,'0')}:${String(ev.fields?.startMinute||0).padStart(2,'0')}`);
  const [endTime,    setEndTime]    = useState(ev.fields?.endHour!=null?`${String(ev.fields.endHour).padStart(2,'0')}:${String(ev.fields.endMinute||0).padStart(2,'0')}`:'');
  const [fields,     setFields]     = useState(ev.fields || {});
  const [saving,     setSaving]     = useState(false);

  const setField = (k, v) => setFields(f => ({...f, [k]: v}));

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalTitle = title.trim();
      if (!finalTitle) {
        if      (isWeight)         finalTitle = "체중";
        else if (isDiet)           finalTitle = "식단";
        else if (isWeightTraining) finalTitle = "웨이트";
        else if (isCardio)         finalTitle = "카디오";
        else if (isEconomy)        finalTitle = "경제";
        else if (isBook)           finalTitle = fields.bookTitle || "책 리뷰";
        else if (isWine)           finalTitle = fields.wineName  || "와인 리뷰";
        else if (isCoffee)         finalTitle = fields.cafe      || "커피";
      }
      if (!finalTitle) { setSaving(false); return; }

      if (isWeight && fields.weight) {
        await upsertWeight(date, parseFloat(fields.weight), detail);
      }

      const [sh, sm] = (startTime||"09:00").split(':').map(s=>parseInt(s,10)||0);
      const ep = endTime ? endTime.split(':').map(s=>parseInt(s,10)||0) : null;
      await updateEvent(ev.id, {
        title: finalTitle,
        detail: detail || null,
        date,
        hour: sh,
        fields: {
          ...fields,
          startMinute: sm||0,
          ...(ep && ep[0]!=null && { endHour: ep[0], endMinute: ep[1]||0 }),
        },
      });
      onSaved?.();
    } catch(e) {
      console.error("수정 실패:", e);
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width:"100%",background:T.bgSub,border:`1px solid ${T.border}`,borderRadius:8,
    padding:"10px 12px",color:T.text,fontSize:13,outline:"none",
    boxSizing:"border-box",fontFamily:"'KoPub Dotum',sans-serif",
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(44,40,37,0.45)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:450,backdropFilter:"blur(3px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.bgCard,borderRadius:18,width:420,maxWidth:"94vw",maxHeight:"90vh",
        boxShadow:"0 20px 60px rgba(44,40,37,0.18)",border:`1px solid ${T.border}`,
        display:"flex",flexDirection:"column",overflow:"hidden",
      }}>
        <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0,background:cat.bg,
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10,padding:"2px 10px",borderRadius:20,background:cat.color+"22",
              color:cat.color,border:`1px solid ${cat.color}44`,fontWeight:600}}>{cat.label}</span>
            <span style={{fontSize:14,fontWeight:600,color:T.text}}>수정</span>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:T.textMute,cursor:"pointer",fontSize:18}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
          <input type="date" style={{...inp,marginBottom:8}} value={date} onChange={e=>setDate(e.target.value)}/>
          {!isWeight&&(
            <div style={{display:"flex",gap:7,marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:T.textSub,marginBottom:3}}>시작</div>
                <input type="time" style={{...inp}} value={startTime} onChange={e=>setStartTime(e.target.value)}/>
              </div>
              {isBasic&&(
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:T.textSub,marginBottom:3}}>종료</div>
                  <input type="time" style={{...inp}} value={endTime} onChange={e=>setEndTime(e.target.value)}/>
                </div>
              )}
            </div>
          )}

          {isWeight&&(<>
            <div style={{fontSize:11,color:T.textSub,marginBottom:6}}>체중 (kg)</div>
            <input type="number" step="0.1" style={{...inp,marginBottom:10,fontSize:20,fontWeight:700,textAlign:"center"}}
              value={fields.weight||""} onChange={e=>setField("weight",e.target.value)}/>
            <textarea placeholder="메모" rows={2} style={{...inp,resize:"none"}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {isDiet&&(<>
            {[["breakfast","아침"],["lunch","점심"],["dinner","저녁"],["snack","간식"]].map(([k,label])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                <span style={{fontSize:11,color:T.textMute,minWidth:22,flexShrink:0}}>{label}</span>
                <input placeholder="메뉴" style={{...inp,flex:2,marginBottom:0}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                <input type="number" placeholder="kcal" style={{...inp,flex:1,marginBottom:0,textAlign:"right"}}
                  value={fields[k+"_kcal"]||""} onChange={e=>{
                    const val = e.target.value;
                    setFields(prev=>{
                      const next = {...prev, [k+"_kcal"]: val};
                      const total = ["breakfast","lunch","dinner","snack"]
                        .reduce((sum,mk)=>sum+(parseFloat(next[mk+"_kcal"])||0),0);
                      return {...next, calories: total||undefined};
                    });
                  }}/>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8,fontSize:11,color:T.textMute}}>
              총 칼로리 <span style={{color:T.text,fontWeight:700,marginLeft:6}}>{fields.calories||0}</span> kcal
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
              {[["protein","총 단백질"],["sugar","총 당류"]].map(([k,label])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                  <input style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
            </div>
            {/* 특이사항 체크박스 */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:T.textSub,marginBottom:6}}>특이사항</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {["🍾","💩","🩸","💙"].map(emoji=>{
                  const checked=(fields.checks||[]).includes(emoji);
                  return (
                    <button key={emoji} onClick={()=>setFields(prev=>{
                      const cur=prev.checks||[];
                      return {...prev,checks:checked?cur.filter(e=>e!==emoji):[...cur,emoji]};
                    })} style={{
                      fontSize:16,padding:"4px 8px",borderRadius:8,cursor:"pointer",
                      background:checked?T.bgSub:"transparent",
                      border:`1px solid ${checked?T.borderMid:T.border}`,
                      opacity:checked?1:0.4,transition:"all .12s",
                    }}>{emoji}</button>
                  );
                })}
                <input placeholder="기타" style={{...inp,flex:1,marginBottom:0,fontSize:12,minWidth:60}}
                  value={fields.checksEtc||""} onChange={e=>setField("checksEtc",e.target.value)}/>
              </div>
            </div>
          </>)}

          {isWeightTraining&&(<>
            <div style={{fontSize:11,color:T.textSub,marginBottom:5}}>부위</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              {["가슴","등","어깨","팔","하체","전신"].map(p=>(
                <button key={p} onClick={()=>setField("part",p)} style={{
                  padding:"5px 12px",borderRadius:16,fontSize:11,cursor:"pointer",
                  background:fields.part===p?"#E8F2FA":T.bgSub,border:`1px solid ${fields.part===p?"#2E6FA588":T.border}`,
                  color:fields.part===p?"#1A4E7A":T.textSub,
                }}>{p}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:7,marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>운동 시간</div>
                <input style={{...inp}} value={fields.duration||""} onChange={e=>setField("duration",e.target.value)}/>
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
            <textarea rows={4} style={{...inp,resize:"vertical"}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {isCardio&&(<>
            <div style={{display:"flex",gap:5,marginBottom:8}}>
              {["러닝","자전거","수영","기타"].map(t=>(
                <button key={t} onClick={()=>setField("type",t)} style={{
                  flex:1,padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:11,
                  background:fields.type===t?"#E8F2FA":T.bgSub,border:`1px solid ${fields.type===t?"#2E6FA588":T.border}`,
                  color:fields.type===t?"#1A4E7A":T.textSub,
                }}>{t}</button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
              {[["distance","거리"],["avgSpeed","평균 속도"],["avgHr","심박수"],["calories","칼로리"]].map(([k,label])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                  <input style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
            </div>
            <textarea placeholder="메모" rows={2} style={{...inp,resize:"none"}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {isEconomy&&(<>
            <input placeholder="주요 지수" style={{...inp,marginBottom:8}} value={fields.index||""} onChange={e=>setField("index",e.target.value)}/>
            <input placeholder="오늘의 키워드" style={{...inp,marginBottom:8}} value={fields.keyword||""} onChange={e=>setField("keyword",e.target.value)}/>
            <textarea placeholder="시장 요약" rows={3} style={{...inp,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
            <input placeholder="내일 주목할 것" style={{...inp}} value={fields.watchlist||""} onChange={e=>setField("watchlist",e.target.value)}/>
          </>)}

          {isBook&&(<>
            {[["bookTitle","책 제목"],["author","작가"],["genre","장르"]].map(([k,label])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                <input style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
              </div>
            ))}
            <div style={{display:"flex",gap:7,marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>기간</div>
                <input style={{...inp}} value={fields.period||""} onChange={e=>setField("period",e.target.value)}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>점수 /5</div>
                <div style={{display:"flex",gap:3}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setField("score",n)} style={{
                      flex:1,padding:"8px 0",borderRadius:7,cursor:"pointer",fontSize:12,
                      background:fields.score===n?"#F3EBF8":T.bgSub,border:`1px solid ${fields.score===n?"#7E4FA088":T.border}`,
                      color:fields.score===n?"#5A2E80":T.textSub,fontWeight:fields.score===n?700:400,
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <textarea placeholder="인상 깊은 문장" rows={2} style={{...inp,resize:"vertical",marginBottom:8}} value={fields.record||""} onChange={e=>setField("record",e.target.value)}/>
            <textarea placeholder="감상" rows={2} style={{...inp,resize:"vertical"}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {isWine&&(<>
            {[["wineName","와인명"],["vintage","빈티지"],["origin","생산지"],["grape","품종"],["alcohol","알코올"]].map(([k,label])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                <input style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
              </div>
            ))}
            {[["sweetness","당도"],["acidity","산도"],["tannin","타닌"],["body","바디감"],["score","총점"]].map(([k,label])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                <div style={{display:"flex",gap:4}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setField(k,n)} style={{
                      flex:1,padding:"7px 0",borderRadius:7,cursor:"pointer",fontSize:12,
                      background:fields[k]===n?"#F3EBF8":T.bgSub,border:`1px solid ${fields[k]===n?"#7E4FA088":T.border}`,
                      color:fields[k]===n?"#5A2E80":T.textSub,fontWeight:fields[k]===n?700:400,
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
            <textarea placeholder="메모" rows={2} style={{...inp,resize:"none"}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {isCoffee&&(<>
            {[["cafe","카페명"],["menu","메뉴"],["price","가격"]].map(([k,label])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                <input style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
              </div>
            ))}
            <textarea placeholder="메모" rows={3} style={{...inp,resize:"vertical"}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {isBasic&&(<>
            <input placeholder="제목" style={{...inp,marginBottom:8}} value={title} onChange={e=>setTitle(e.target.value)}/>
            <textarea placeholder="상세 내용" rows={4} style={{...inp,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}
        </div>

        <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,flexShrink:0,background:T.bgSub}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:9,cursor:"pointer",
            background:"transparent",border:`1px solid ${T.borderMid}`,color:T.textSub,fontSize:13}}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{flex:1,padding:"11px",borderRadius:9,cursor:"pointer",
            background:cat.color,border:"none",color:"white",fontSize:13,fontWeight:600,opacity:saving?0.6:1}}>
            {saving?"저장 중...":"저장"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// ADD MODAL
// ─────────────────────────────────────────────────────
export function AddModal({ onClose, onSaved, presetDate, presetHour, presetCat, presetSub, addEventFn }) {
  const [cat,        setCat]        = useState(presetCat || "schedule");
  const [archiveSub, setArchiveSub] = useState(presetSub || "health");
  const [healthSub,  setHealthSub]  = useState("weight");
  const [reviewSub,  setReviewSub]  = useState("book");
  const [title,      setTitle]      = useState("");
  const [detail,     setDetail]     = useState("");
  const [fields,     setFields]     = useState({});
  const [date,       setDate]       = useState(presetDate || dateStr(new Date()));
  const [startTime,  setStartTime]  = useState(`${String(presetHour||9).padStart(2,'0')}:00`);
  const [endTime,    setEndTime]    = useState('');
  const [endDate,     setEndDate]    = useState('');
  const [saving,     setSaving]     = useState(false);

  const setField = (k, v) => setFields(f => ({...f, [k]: v}));

  const currentColor = () => {
    if (cat === "archive") return ARCHIVE_SECTS.find(s=>s.id===archiveSub) || ARCHIVE_SECTS[0];
    return CATS.find(c=>c.id===cat) || CATS[0];
  };
  const c = currentColor();

  const handleSave = async () => {
    let finalTitle = title.trim();
    if (!finalTitle) {
      if (cat === "archive") {
        if (archiveSub === "health") {
          if      (healthSub === "weight")          finalTitle = "체중";
          else if (healthSub === "diet")            finalTitle = "식단";
          else if (healthSub === "weight_training") finalTitle = "웨이트";
          else if (healthSub === "cardio")          finalTitle = "카디오";
        } else if (archiveSub === "economy") {
          finalTitle = "경제";
        } else if (archiveSub === "review") {
          if      (reviewSub === "book")   finalTitle = fields.bookTitle || "책 리뷰";
          else if (reviewSub === "wine")   finalTitle = fields.wineName  || "와인 리뷰";
          else if (reviewSub === "coffee") finalTitle = fields.cafe      || "커피";
        } else if (archiveSub === "etc") {
          finalTitle = title.trim() || "기타";
        }
      }
    }
    if (!finalTitle) return;
    setSaving(true);
    try {
      const sub = cat === "archive"
        ? (archiveSub === "health" ? healthSub
          : archiveSub === "review" ? reviewSub
          : archiveSub === "etc" ? "etc"
          : "economy")
        : null;

      if (cat==="archive" && archiveSub==="health" && healthSub==="weight" && fields.weight) {
        await upsertWeight(date, parseFloat(fields.weight), detail);
      }

      const [sh, sm] = (startTime||"09:00").split(':').map(s=>parseInt(s,10)||0);
      const endParts = endTime ? endTime.split(':').map(s=>parseInt(s,10)||0) : null;
      const finalFields = {
        ...fields,
        ...(sm && { startMinute: sm }),
        ...(endParts && endParts[0]!=null && {
          endHour: endParts[0],
          endMinute: endParts[1]||0,
        }),
      };
      await addEventFn({
        category: cat, sub_category: sub, title: finalTitle,
        date, hour: cat === "archive" ? null : sh,
        done: false, detail: detail || null,
        fields: { ...finalFields, ...(endDate && (cat==="schedule"||cat==="event") ? {endDate} : {}) },
      });
      onSaved?.();
      onClose();
    } catch(e) {
      console.error("저장 실패:", e);
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width:"100%",background:T.bgSub,border:`1px solid ${T.border}`,borderRadius:8,
    padding:"10px 12px",color:T.text,fontSize:13,outline:"none",
    boxSizing:"border-box",fontFamily:"'KoPub Dotum',sans-serif",
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(44,40,37,0.4)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,backdropFilter:"blur(3px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.bgCard,borderRadius:18,width:400,maxWidth:"94vw",maxHeight:"90vh",
        boxShadow:"0 20px 60px rgba(44,40,37,0.18)",border:`1px solid ${T.border}`,
        display:"flex",flexDirection:"column",overflow:"hidden",
      }}>
        <div style={{padding:"18px 20px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:600,color:T.text,marginBottom:14,fontFamily:"'Libre Baskerville',serif"}}>새 기록</div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {CATS.map(ct=>(
              <button key={ct.id} onClick={()=>setCat(ct.id)} style={{
                flex:1,padding:"7px 4px",borderRadius:9,cursor:"pointer",fontSize:12,
                background:cat===ct.id?ct.bg:T.bgSub,border:`1px solid ${cat===ct.id?ct.color+"88":T.border}`,
                color:cat===ct.id?ct.text:T.textSub,fontWeight:cat===ct.id?600:400,
              }}>{ct.label}</button>
            ))}
          </div>
          {cat==="archive"&&(<>
            <div style={{display:"flex",gap:5}}>
              {ARCHIVE_SECTS.map(s=>(
                <button key={s.id} onClick={()=>setArchiveSub(s.id)} style={{
                  flex:1,padding:"5px 4px",borderRadius:7,cursor:"pointer",fontSize:11,
                  background:archiveSub===s.id?s.bg:T.bgSub,border:`1px solid ${archiveSub===s.id?s.color+"88":T.border}`,
                  color:archiveSub===s.id?s.text:T.textSub,fontWeight:archiveSub===s.id?600:400,
                }}>{s.label}</button>
              ))}
            </div>
            {archiveSub==="health"&&(
              <div style={{display:"flex",gap:4,marginTop:5}}>
                {HEALTH_SUBS.map(s=>(
                  <button key={s.id} onClick={()=>setHealthSub(s.id)} style={{
                    flex:1,padding:"4px 2px",borderRadius:6,cursor:"pointer",fontSize:10,
                    background:healthSub===s.id?"#E8F2FA":T.bgSub,border:`1px solid ${healthSub===s.id?"#2E6FA588":T.border}`,
                    color:healthSub===s.id?"#1A4E7A":T.textSub,fontWeight:healthSub===s.id?600:400,
                  }}>{s.label}</button>
                ))}
              </div>
            )}
            {archiveSub==="review"&&(
              <div style={{display:"flex",gap:5,marginTop:5}}>
                {REVIEW_SUBS.map(s=>(
                  <button key={s.id} onClick={()=>setReviewSub(s.id)} style={{
                    flex:1,padding:"4px 2px",borderRadius:6,cursor:"pointer",fontSize:10,
                    background:reviewSub===s.id?"#F3EBF8":T.bgSub,border:`1px solid ${reviewSub===s.id?"#7E4FA088":T.border}`,
                    color:reviewSub===s.id?"#5A2E80":T.textSub,fontWeight:reviewSub===s.id?600:400,
                  }}>{s.label}</button>
                ))}
              </div>
            )}
          </>)}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
          {cat==="archive"&&archiveSub==="health"&&healthSub==="weight"&&(<>
            <div style={{fontSize:11,color:T.textSub,marginBottom:6}}>체중 (kg)</div>
            <input type="number" step="0.1" placeholder="예) 71.2" style={{...inp,marginBottom:10,fontSize:20,fontWeight:700,textAlign:"center"}}
              value={fields.weight||""} onChange={e=>setField("weight",e.target.value)}/>
            <textarea placeholder="메모 (선택)" rows={2} style={{...inp,resize:"none",marginBottom:10}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {cat==="archive"&&archiveSub==="health"&&healthSub==="diet"&&(<>
            {[["breakfast","아침"],["lunch","점심"],["dinner","저녁"],["snack","간식"]].map(([k,label])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                <span style={{fontSize:11,color:T.textMute,minWidth:22,flexShrink:0}}>{label}</span>
                <input placeholder="메뉴" style={{...inp,flex:2,marginBottom:0}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                <input type="number" placeholder="kcal" style={{...inp,flex:1,marginBottom:0,textAlign:"right"}}
                  value={fields[k+"_kcal"]||""} onChange={e=>{
                    const val = e.target.value;
                    setFields(prev=>{
                      const next = {...prev, [k+"_kcal"]: val};
                      const total = ["breakfast","lunch","dinner","snack"]
                        .reduce((sum,mk)=>sum+(parseFloat(next[mk+"_kcal"])||0),0);
                      return {...next, calories: total||undefined};
                    });
                  }}/>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8,fontSize:11,color:T.textMute}}>
              총 칼로리 <span style={{color:T.text,fontWeight:700,marginLeft:6}}>{fields.calories||0}</span> kcal
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
              {[["protein","총 단백질","예) 170g"],["sugar","총 당류","예) 45g"]].map(([k,label,ph])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                  <input placeholder={ph} style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
            </div>
            {/* 특이사항 체크박스 */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:T.textSub,marginBottom:6}}>특이사항</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {["🍾","💩","🩸","💙"].map(emoji=>{
                  const checked=(fields.checks||[]).includes(emoji);
                  return (
                    <button key={emoji} onClick={()=>setFields(prev=>{
                      const cur=prev.checks||[];
                      return {...prev,checks:checked?cur.filter(e=>e!==emoji):[...cur,emoji]};
                    })} style={{
                      fontSize:16,padding:"4px 8px",borderRadius:8,cursor:"pointer",
                      background:checked?T.bgSub:"transparent",
                      border:`1px solid ${checked?T.borderMid:T.border}`,
                      opacity:checked?1:0.4,transition:"all .12s",
                    }}>{emoji}</button>
                  );
                })}
                <input placeholder="기타" style={{...inp,flex:1,marginBottom:0,fontSize:12,minWidth:60}}
                  value={fields.checksEtc||""} onChange={e=>setField("checksEtc",e.target.value)}/>
              </div>
            </div>
          </>)}

          {cat==="archive"&&archiveSub==="health"&&healthSub==="weight_training"&&(<>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:T.textSub,marginBottom:5}}>부위</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["가슴","등","어깨","팔","하체","전신"].map(p=>(
                  <button key={p} onClick={()=>setField("part",p)} style={{
                    padding:"5px 12px",borderRadius:16,fontSize:11,cursor:"pointer",
                    background:fields.part===p?"#E8F2FA":T.bgSub,border:`1px solid ${fields.part===p?"#2E6FA588":T.border}`,
                    color:fields.part===p?"#1A4E7A":T.textSub,
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:7,marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>운동 시간</div>
                <input placeholder="예) 60분" style={{...inp}} value={fields.duration||""} onChange={e=>setField("duration",e.target.value)}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>컨디션</div>
                <div style={{display:"flex",gap:4}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setField("condition",n)} style={{
                      flex:1,padding:"8px 0",borderRadius:7,cursor:"pointer",fontSize:12,
                      background:fields.condition===n?"#E8F2FA":T.bgSub,border:`1px solid ${fields.condition===n?"#2E6FA588":T.border}`,
                      color:fields.condition===n?"#1A4E7A":T.textSub,fontWeight:fields.condition===n?700:400,
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <textarea placeholder={`운동 기록\n예) 스쿼트 80kg 8회 4세트`} rows={4}
              style={{...inp,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {cat==="archive"&&archiveSub==="health"&&healthSub==="cardio"&&(<>
            <div style={{display:"flex",gap:5,marginBottom:8}}>
              {["러닝","자전거","수영","기타"].map(t=>(
                <button key={t} onClick={()=>setField("type",t)} style={{
                  flex:1,padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:11,
                  background:fields.type===t?"#E8F2FA":T.bgSub,border:`1px solid ${fields.type===t?"#2E6FA588":T.border}`,
                  color:fields.type===t?"#1A4E7A":T.textSub,
                }}>{t}</button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
              {[["distance","거리","예) 5km"],["avgSpeed","평균 속도","예) 5'36\""],["avgHr","심박수","예) 158bpm"],["calories","칼로리","예) 320kcal"]].map(([k,label,ph])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                  <input placeholder={ph} style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
            </div>
            <textarea placeholder="메모" rows={2} style={{...inp,resize:"none",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {cat==="archive"&&archiveSub==="economy"&&(<>
            <input placeholder="주요 지수" style={{...inp,marginBottom:8}} value={fields.index||""} onChange={e=>setField("index",e.target.value)}/>
            <input placeholder="오늘의 키워드" style={{...inp,marginBottom:8}} value={fields.keyword||""} onChange={e=>setField("keyword",e.target.value)}/>
            <textarea placeholder="오늘 시장 요약" rows={3} style={{...inp,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
            <input placeholder="내일 주목할 것" style={{...inp}} value={fields.watchlist||""} onChange={e=>setField("watchlist",e.target.value)}/>
          </>)}

          {cat==="archive"&&archiveSub==="review"&&reviewSub==="book"&&(<>
            {[["bookTitle","책 제목"],["author","작가"],["genre","장르"]].map(([k,label])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                <input style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
              </div>
            ))}
            <div style={{display:"flex",gap:7,marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>기간</div>
                <input placeholder="예) 5.1 ~ 5.20" style={{...inp}} value={fields.period||""} onChange={e=>setField("period",e.target.value)}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>총점</div>
                <div style={{display:"flex",gap:3}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setField("score",n)} style={{
                      flex:1,padding:"8px 0",borderRadius:7,cursor:"pointer",fontSize:12,
                      background:fields.score===n?"#F3EBF8":T.bgSub,border:`1px solid ${fields.score===n?"#7E4FA088":T.border}`,
                      color:fields.score===n?"#5A2E80":T.textSub,fontWeight:fields.score===n?700:400,
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <textarea placeholder="인상 깊은 문장" rows={2} style={{...inp,resize:"vertical",marginBottom:8}} value={fields.record||""} onChange={e=>setField("record",e.target.value)}/>
            <textarea placeholder="감상" rows={3} style={{...inp,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {cat==="archive"&&archiveSub==="review"&&reviewSub==="wine"&&(<>
            {[["wineName","와인명"],["vintage","빈티지"],["origin","생산지"],["grape","품종"],["alcohol","알코올"]].map(([k,label])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                <input style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
              </div>
            ))}
            {[["sweetness","당도"],["acidity","산도"],["tannin","타닌"],["body","바디감"],["score","총점"]].map(([k,label])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                <div style={{display:"flex",gap:4}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setField(k,n)} style={{
                      flex:1,padding:"7px 0",borderRadius:7,cursor:"pointer",fontSize:12,
                      background:fields[k]===n?"#F3EBF8":T.bgSub,border:`1px solid ${fields[k]===n?"#7E4FA088":T.border}`,
                      color:fields[k]===n?"#5A2E80":T.textSub,fontWeight:fields[k]===n?700:400,
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
            <textarea placeholder="메모" rows={2} style={{...inp,resize:"none"}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {cat==="archive"&&archiveSub==="review"&&reviewSub==="coffee"&&(<>
            {[["cafe","카페명"],["menu","메뉴"],["price","가격"]].map(([k,label])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:T.textSub,marginBottom:4}}>{label}</div>
                <input style={{...inp}} value={fields[k]||""} onChange={e=>setField(k,e.target.value)}/>
              </div>
            ))}
            <textarea rows={3} style={{...inp,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {cat==="archive"&&archiveSub==="etc"&&(<>
            <input placeholder="제목 입력..." style={{...inp,marginBottom:8}} value={title} onChange={e=>setTitle(e.target.value)}/>
            <textarea placeholder="상세 내용" rows={4} style={{...inp,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          {(cat==="schedule"||cat==="event")&&(<>
            <input placeholder="제목 입력..." style={{...inp,marginBottom:8}} value={title} onChange={e=>setTitle(e.target.value)}/>
            <textarea placeholder="상세 내용" rows={4} style={{...inp,resize:"vertical",marginBottom:8}} value={detail} onChange={e=>setDetail(e.target.value)}/>
          </>)}

          <input type="date" style={{...inp,marginTop:8}} value={date} onChange={e=>setDate(e.target.value)}/>
          {(cat==="schedule"||cat==="event")&&(
            <div style={{display:"flex",gap:7,marginTop:7,alignItems:"flex-end"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:T.textSub,marginBottom:3}}>종료 날짜 (기간 일정)</div>
                <input type="date" style={{...inp}} value={endDate} onChange={e=>setEndDate(e.target.value)}/>
              </div>
            </div>
          )}
          {cat !== "archive" && !(cat==="archive"&&archiveSub==="health"&&healthSub==="weight")&&(
            <div style={{display:"flex",gap:7,marginTop:7}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:T.textSub,marginBottom:3}}>시작</div>
                <input type="time" style={{...inp}} value={startTime} onChange={e=>setStartTime(e.target.value)}/>
              </div>
              {(cat==="schedule"||cat==="event")&&(
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:T.textSub,marginBottom:3}}>종료 시간</div>
                  <input type="time" style={{...inp}} value={endTime} onChange={e=>setEndTime(e.target.value)}/>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,flexShrink:0,background:T.bgSub}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:9,cursor:"pointer",
            background:"transparent",border:`1px solid ${T.borderMid}`,color:T.textSub,fontSize:13}}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{flex:1,padding:"11px",borderRadius:9,cursor:"pointer",
            background:c.color,border:"none",color:"white",fontSize:13,fontWeight:600,
            boxShadow:`0 3px 14px ${c.color}44`,opacity:saving?0.6:1}}>
            {saving?"저장 중...":"저장"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// WEIGHT SECTION
// ─────────────────────────────────────────────────────
export function WeightSection({ logs, onRefetch }) {
  const clr = { color:"#C0443A", bg:"#FDECEA", text:"#9B2E25" };

  if (!logs.length) return (
    <div style={{background:clr.bg,borderRadius:10,padding:"12px 10px",border:"1px solid #C0443A22",marginBottom:8}}>
      <div style={{fontSize:9,color:clr.text,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>체중</div>
      <div style={{fontSize:11,color:T.textMute}}>기록 없음</div>
    </div>
  );

  // ── 선형 보간: 측정값 사이 빈 날짜를 채움 ──────────
  const buildChartData = (rawLogs) => {
    if (rawLogs.length < 2) {
      return rawLogs.map(l => ({
        label: `${new Date(l.date).getMonth()+1}/${new Date(l.date).getDate()}`,
        weight: l.weight,
        interpolated: false,
      }));
    }
    const result = [];
    for (let i = 0; i < rawLogs.length; i++) {
      const cur  = rawLogs[i];
      const curD = new Date(cur.date + "T00:00:00");
      result.push({
        label: `${curD.getMonth()+1}/${curD.getDate()}`,
        weight: cur.weight,
        interpolated: false,
      });
      if (i < rawLogs.length - 1) {
        const next  = rawLogs[i + 1];
        const nextD = new Date(next.date + "T00:00:00");
        const dayGap = Math.round((nextD - curD) / 86400000);
        // 1일 초과 공백만 보간 (최대 14일까지)
        if (dayGap > 1 && dayGap <= 14) {
          for (let d = 1; d < dayGap; d++) {
            const fillD = new Date(curD);
            fillD.setDate(curD.getDate() + d);
            const ratio  = d / dayGap;
            const weight = +(cur.weight + (next.weight - cur.weight) * ratio).toFixed(1);
            result.push({
              label: `${fillD.getMonth()+1}/${fillD.getDate()}`,
              weight,
              interpolated: true,
            });
          }
        }
      }
    }
    return result;
  };

  const latest    = logs[logs.length-1];
  const chartData = buildChartData(logs);
  // 통계는 실측값만 사용
  const weights   = logs.map(l=>l.weight);
  const min = Math.min(...weights)-.8, max = Math.max(...weights)+.5;
  const avg = +(weights.reduce((a,w)=>a+w,0)/weights.length).toFixed(1);

  // 실측 점: 진한 원 / 보간 점: 속 빈 작은 원
  const CustomDot=(props)=>{
    const { cx, cy, payload } = props;
    if (payload.interpolated) {
      return <circle cx={cx} cy={cy} r={2.5} fill={T.bgCard} stroke={clr.color} strokeWidth={1.5} strokeOpacity={0.5}/>;
    }
    return <circle cx={cx} cy={cy} r={4} fill={clr.color} stroke={T.bgCard} strokeWidth={2}/>;
  };
  const CustomTip=({active,payload})=>{
    if(!active||!payload?.length) return null;
    const d=payload[0].payload;
    return <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:11}}>
      <div style={{color:T.textMute}}>{d.label}{d.interpolated?" (예상)":""}</div>
      <div style={{color:d.interpolated?T.textSub:clr.color,fontWeight:700}}>{d.weight}kg</div>
    </div>;
  };

  // XAxis 표시 간격: 전체 포인트 수 기준
  const totalPts = chartData.length;

  return (
    <div style={{background:clr.bg,borderRadius:10,padding:"12px 10px",border:"1px solid #C0443A22",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,alignItems:"center"}}>
        <span style={{fontSize:9,color:clr.text,fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>체중</span>
        <span style={{fontSize:9,color:clr.text,opacity:.7}}>{latest.weight}kg</span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={chartData} margin={{top:2,right:4,left:-28,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="label" tick={{fontSize:8,fill:T.textMute}} interval={Math.max(0,Math.floor(totalPts/4))}/>
          <YAxis domain={[min,max]} tick={{fontSize:8,fill:T.textMute}}/>
          <Tooltip content={<CustomTip/>}/>
          <ReferenceLine y={avg} stroke={clr.color+"55"} strokeDasharray="3 3"/>
          <Line type="monotone" dataKey="weight" stroke={clr.color} strokeWidth={1.5} dot={<CustomDot/>} activeDot={{r:4}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// WORD SECTION — 단어 학습 카드 (WeightSection 스타일)
// ─────────────────────────────────────────────────────
export function WordSection() {
  const [known, setKnown] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("yamlog_known_words")||"[]")); }
    catch { return new Set(); }
  });

  const pool = TOEIC_WORDS.filter(w => !known.has(w.word));
  const [idx, setIdx] = useState(() => pool.length > 0 ? Math.floor(Math.random() * pool.length) : 0);
  const safeIdx = pool.length > 0 ? idx % pool.length : 0;
  const current = pool[safeIdx];

  const markKnown = () => {
    if (!current) return;
    const next = new Set([...known, current.word]);
    setKnown(next);
    localStorage.setItem("yamlog_known_words", JSON.stringify([...next]));
  };
  const nextWord = () => { if (pool.length > 1) setIdx(i => (i+1) % pool.length); };
  const prevWord = () => { if (pool.length > 1) setIdx(i => (i-1+pool.length) % pool.length); };
  const reset    = () => { setKnown(new Set()); localStorage.removeItem("yamlog_known_words"); setIdx(0); };

  const clrW = { color:"#1A4E7A", bg:"rgba(46,111,165,0.08)", border:"rgba(46,111,165,0.25)" };

  if (pool.length === 0) return (
    <div style={{background:clrW.bg,borderRadius:10,padding:"12px 10px",
      border:`1px solid ${clrW.border}`,marginTop:8}}>
      <div style={{fontSize:9,color:clrW.color,fontWeight:600,letterSpacing:.5,
        textTransform:"uppercase",marginBottom:6}}>단어</div>
      <div style={{fontSize:12,color:clrW.color,marginBottom:8,fontWeight:500}}>모든 단어 완료 🎉</div>
      <button onClick={reset} style={{width:"100%",padding:"7px",borderRadius:7,cursor:"pointer",
        background:clrW.bg,border:`1px solid ${clrW.border}`,color:clrW.color,fontSize:11}}>초기화</button>
    </div>
  );

  return (
    <div style={{background:clrW.bg,borderRadius:10,padding:"12px 10px",
      border:`1px solid ${clrW.border}`,marginTop:8}}>
      {/* 헤더: 라벨 + 화살표 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <span style={{fontSize:9,color:clrW.color,fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>단어</span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={prevWord} style={{
            width:26,height:26,borderRadius:6,cursor:"pointer",
            background:clrW.bg,border:`1px solid ${clrW.border}`,
            color:clrW.color,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",
          }}>‹</button>
          <button onClick={nextWord} style={{
            width:26,height:26,borderRadius:6,cursor:"pointer",
            background:clrW.bg,border:`1px solid ${clrW.border}`,
            color:clrW.color,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",
          }}>›</button>
        </div>
      </div>
      {/* 단어 + 발음 병기 */}
      <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap",marginBottom:4}}>
        <span style={{fontFamily:"'KoPub Batang',Georgia,serif",fontSize:15,color:"#0F3058",fontWeight:700}}>{current.word}</span>
        {current.pronunciation&&(
          <span style={{fontSize:10,color:"#2E6FA5",letterSpacing:.3,fontFamily:"Georgia,serif"}}>{current.pronunciation}</span>
        )}
      </div>
      <div style={{fontSize:11,color:"#1A4E7A",lineHeight:1.5,marginBottom:12}}>{current.meaning}</div>
      {/* O / X 버튼 */}
      <div style={{display:"flex",gap:6}}>
        <button onClick={markKnown} style={{
          flex:1,height:34,borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700,
          background:"#1A4E7A",border:"none",color:"white",
        }}>O</button>
        <button onClick={nextWord} style={{
          flex:1,height:34,borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700,
          background:clrW.bg,border:`1px solid ${clrW.border}`,color:clrW.color,
        }}>X</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// RANDOM REVIEW
// ─────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────
// BRIEFING
// ─────────────────────────────────────────────────────
const BRIEFING_FALLBACK = {
  headline:"브리핑을 불러오는 중입니다. 잠시 후 다시 확인해주세요.",
  sections:[
    {title:"세계정세",summary:"데이터 없음",lines:["브리핑 준비 중"]},
    {title:"한국 증시",summary:"데이터 없음",lines:["브리핑 준비 중"]},
    {title:"미장 지수",summary:"데이터 없음",lines:["브리핑 준비 중"]},
    {title:"선물 파생",summary:"데이터 없음",lines:["브리핑 준비 중"]},
    {title:"금리 환율 유가",summary:"데이터 없음",lines:["브리핑 준비 중"]},
    {title:"포트폴리오",summary:"데이터 없음",lines:["브리핑 준비 중"]},
  ],
};

// 브리핑 텍스트 내 숫자 콤마 포맷팅 (1000 이상)
const fmtNums = (str) =>
  String(str).replace(/\d+(\.\d+)?/g, (m) => {
    const n = parseFloat(m);
    if (n >= 1000 && Number.isInteger(n)) return n.toLocaleString("ko-KR");
    return m;
  });

function BriefingSection({section}){
  const [open,setOpen]=useState(true);
  const items=Array.isArray(section.content)&&section.content.length>0
    ?section.content:[section.summary,...(section.lines||[])].filter(Boolean);
  const summary=items[0]||"";
  const rest=items.slice(1);
  return(
    <div style={{marginBottom:10}}>
      <div style={{background:section.bg,borderRadius:12,border:`1px solid ${section.color}33`,overflow:"hidden"}}>
        {/* 헤더: 타이틀 + 요약 + 토글 */}
        <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px 7px",cursor:"pointer",borderBottom:open&&rest.length>0?`1px solid ${section.color}22`:"none"}}>
          <div style={{width:3,height:13,borderRadius:2,background:section.color,flexShrink:0}}/>
          <span style={{fontSize:13,fontWeight:700,color:section.color,lineHeight:1,flexShrink:0}}>{section.title}</span>
          {summary&&<span style={{fontSize:13,fontWeight:400,color:section.color,opacity:.85,lineHeight:1.3,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fmtNums(summary)}</span>}
          <span style={{fontSize:9,color:section.color,opacity:.6,flexShrink:0}}>{open?"▲":"▼"}</span>
        </div>
        {/* 본문 */}
        {open&&rest.length>0&&(
          <div style={{padding:"8px 14px 12px"}}>
            {rest.map((line,i)=>(
              <div key={i} style={{marginTop:i===0?0:4,paddingLeft:10,borderLeft:`2px solid ${section.color}55`}}>
                <span style={{fontSize:12,color:T.text,lineHeight:1.5,fontWeight:400,fontFamily:"'KoPub Dotum',sans-serif"}}>{fmtNums(line)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────
// HABIT VIEW — 습관 체크박스 + 해빗트래커
// ─────────────────────────────────────────────────────
const DEFAULT_HABITS = [
  { id:"weight",    label:"무게 체크", color:"#C0443A" },
  { id:"vitamin",   label:"영양제",    color:"#C96A2A" },
  { id:"ledger",    label:"가계부 기록", color:"#B09520" },
  { id:"stretch",   label:"스트레칭",   color:"#4A8A5A" },
  { id:"exercise",  label:"운동",      color:"#2E6FA5" },
  { id:"meditate",  label:"명상",      color:"#1A4080" },
  { id:"review",    label:"리뷰",      color:"#7E4FA0" },
];

export function HabitView() {
  const today = new Date();
  const todayStr = today.toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
  const year  = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  // 로컬스토리지 기반 저장
  const storageKey = `yamlog_habits_${year}_${String(month+1).padStart(2,"0")}`;
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)||"{}"); }
    catch { return {}; }
  });
  const [habits] = useState(DEFAULT_HABITS);

  const toggle = (habitId, dayStr) => {
    setLogs(prev => {
      const key = `${habitId}_${dayStr}`;
      const next = {...prev, [key]: !prev[key]};
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const isChecked = (habitId, dayStr) => !!logs[`${habitId}_${dayStr}`];

  const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

  return (
    <div style={{overflowY:"auto",height:"100%",paddingRight:4}}>
      {/* 헤더 */}
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:"'Libre Baskerville',serif",fontSize:17,fontWeight:700,color:T.text}}>
          {year}년 {MONTHS_KR[month]}
        </div>
      </div>

      {/* 오늘 체크박스 */}
      <div style={{background:T.bgCard,borderRadius:14,padding:"14px 16px",marginBottom:16,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,color:T.textMute,fontWeight:600,letterSpacing:.5,marginBottom:10}}>오늘의 습관</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {habits.map(h => {
            const checked = isChecked(h.id, todayStr);
            return (
              <div key={h.id} onClick={()=>toggle(h.id, todayStr)}
                style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none"}}>
                <div style={{
                  width:20,height:20,borderRadius:6,flexShrink:0,
                  border:`2px solid ${checked?h.color:T.border}`,
                  background:checked?h.color:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all .12s",
                }}>
                  {checked&&<span style={{color:"white",fontSize:12,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:13,color:checked?T.text:T.textSub,fontWeight:checked?600:400,
                  textDecoration:checked?"none":"none",transition:"all .12s"}}>{h.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 해빗트래커 */}
      <div style={{background:T.bgCard,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,color:T.textMute,fontWeight:600,letterSpacing:.5,marginBottom:12}}>이번 달 트래커</div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",minWidth:"100%"}}>
            <thead>
              <tr>
                <th style={{width:70,textAlign:"left",fontSize:10,color:T.textMute,fontWeight:400,paddingBottom:6,paddingRight:8}}></th>
                {Array.from({length:daysInMonth},(_,i)=>{
                  const d = new Date(year,month,i+1);
                  const ds = d.toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
                  const isToday = ds===todayStr;
                  const dow = d.getDay();
                  const isSun = dow===0, isSat = dow===6;
                  return (
                    <th key={i} style={{
                      width:22,minWidth:22,textAlign:"center",fontSize:9,fontWeight:isToday?700:400,
                      color:isToday?T.accent:isSun?"#C0443A":isSat?"#2E6FA5":T.textMute,
                      paddingBottom:4,
                    }}>{i+1}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {habits.map(h => (
                <tr key={h.id}>
                  <td style={{fontSize:10,color:T.textSub,paddingRight:8,paddingTop:3,paddingBottom:3,whiteSpace:"nowrap"}}>{h.label}</td>
                  {Array.from({length:daysInMonth},(_,i)=>{
                    const d = new Date(year,month,i+1);
                    const ds = d.toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
                    const checked = isChecked(h.id, ds);
                    const isFuture = ds > todayStr;
                    return (
                      <td key={i} onClick={()=>!isFuture&&toggle(h.id,ds)}
                        style={{textAlign:"center",padding:"2px 1px",cursor:isFuture?"default":"pointer"}}>
                        <div style={{
                          width:18,height:18,borderRadius:4,margin:"0 auto",
                          background:checked?h.color:isFuture?"transparent":T.bgSub,
                          border:isFuture?"none":`1px solid ${checked?h.color:T.border}`,
                          transition:"all .1s",
                        }}/>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function BriefingView(){
  const [briefing,setBriefing]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  useEffect(()=>{
    async function fetchBriefing(){
      try{
        const todayKST=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
        const{data:todayData}=await supabase.from("briefings").select("*").eq("date",todayKST).maybeSingle();
        if(todayData){setBriefing({...todayData,isToday:true});return;}
        const{data:latestData,error}=await supabase.from("briefings").select("*").order("date",{ascending:false}).limit(1).maybeSingle();
        if(error) throw error;
        const latestDate=new Date(latestData.date+"T00:00:00+09:00");
        const todayDate=new Date(new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"}));
        const diffDays=Math.round((todayDate-latestDate)/(1000*60*60*24));
        setBriefing({...latestData,isToday:false,diffDays});
      }catch(e){console.error("브리핑 로드 실패:",e);setError(e.message);}
      finally{setLoading(false);}
    }
    fetchBriefing();
  },[]);

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200}}><div style={{fontSize:13,color:T.textMute}}>브리핑 불러오는 중...</div></div>;
  const useFallback=error||!briefing;
  const headline=useFallback?BRIEFING_FALLBACK.headline:briefing.headline;
  const sections=useFallback?BRIEFING_FALLBACK.sections:briefing.sections;
  const dateLabel=useFallback?"브리핑 대기 중":new Date(briefing.date).toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Seoul"});
  const dowLabel=(()=>{if(useFallback)return null;const d=new Date(briefing.date+"T00:00:00");const dow=d.getDay();const labels=["일","월","화","수","목","금","토"];const col=dow===0?"#C0443A":dow===6?"#2E6FA5":T.textSub;return{text:labels[dow],color:col};})();
  const isStale=!useFallback&&!briefing.isToday;
  const COLORS={
    "세계정세":{color:"#C0443A",bg:"#FDECEA"},"한국증시":{color:"#C96A2A",bg:"#FDF1E8"},
    "한국 증시":{color:"#C96A2A",bg:"#FDF1E8"},"미장지수":{color:"#B09520",bg:"#FBF8E3"},
    "미장 지수":{color:"#B09520",bg:"#FBF8E3"},"선물파생":{color:"#4A8A5A",bg:"#EBF5EE"},
    "선물 파생":{color:"#4A8A5A",bg:"#EBF5EE"},"금리환율유가":{color:"#2E6FA5",bg:"#E8F2FA"},
    "금리 환율 유가":{color:"#2E6FA5",bg:"#E8F2FA"},"포트폴리오":{color:"#3A52A0",bg:"#EAECF8"},
    "포트폴리오 영향":{color:"#3A52A0",bg:"#EAECF8"},
  };
  return(
    <div style={{overflowY:"auto",maxHeight:"calc(100vh - 155px)",paddingRight:4}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontFamily:"'Libre Baskerville',serif",fontSize:17,color:T.text,fontWeight:700,display:"flex",alignItems:"baseline",gap:7}}>{dateLabel}{dowLabel&&<span style={{fontSize:13,fontWeight:600,color:dowLabel.color,fontFamily:"'KoPub Dotum',sans-serif"}}>{dowLabel.text}</span>}</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {isStale&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:10,background:"#B07D2E22",color:"#B07D2E",border:"1px solid #B07D2E44"}}>{briefing.diffDays}일 전</span>}
          {!useFallback&&briefing.isToday&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:10,background:"#6B7C3A22",color:"#6B7C3A",border:"1px solid #6B7C3A44"}}>오늘</span>}
          <div style={{fontSize:10,padding:"3px 11px",borderRadius:20,background:"#6B7C3A22",color:"#6B7C3A",border:"1px solid #6B7C3A44",fontWeight:600}}>AI 브리핑</div>
        </div>
      </div>
      <div style={{background:"#3A3228",borderRadius:12,padding:"13px 16px",marginBottom:14,border:"1px solid #5a4e44"}}>
        <div style={{fontSize:10,color:"#6B7C3A",fontWeight:700,letterSpacing:.8,textTransform:"uppercase",marginBottom:7}}>핵심 한 줄</div>
        <div style={{fontSize:13,color:"#EDE6DC",lineHeight:1.75,fontFamily:"'KoPub Dotum',sans-serif",fontStyle:"italic"}}>{headline}</div>
      </div>
      {sections.map((s,i)=>{
        const c=COLORS[s.title]||{color:"#6B7B8D",bg:"#EFF1F4"};
        return <BriefingSection key={i} section={{...s,...c}}/>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// BOTTOM TAB BAR — 사이드바와 동일 구성 (전체/브리핑/일정/이벤트/아카이브)
// ─────────────────────────────────────────────────────
export function BottomTabBar({ filterCat, showBriefing, showHabit, setFilterCat, setShowBriefing, setShowHabit }) {
  const tabs = TAB_ITEMS;
  return (
    <div style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:200,
      background:T.bgCard,borderTop:`1px solid ${T.border}`,
      display:"flex",paddingBottom:"env(safe-area-inset-bottom)",
      boxShadow:"0 -2px 12px rgba(44,40,37,0.08)",
    }}>
      {tabs.map(tab=>{
        const isActive = tab.id==="briefing" ? showBriefing&&!showHabit : tab.id==="habit" ? showHabit : filterCat===tab.id&&!showBriefing&&!showHabit;
        return (
          <button key={tab.id} onClick={()=>{
            if(tab.id==="briefing"){ setShowBriefing(true); setShowHabit(false); setFilterCat("all"); }
            else if(tab.id==="habit"){ setShowHabit(true); setShowBriefing(false); setFilterCat("all"); }
            else { setShowBriefing(false); setShowHabit(false); setFilterCat(tab.id); }
          }} style={{
            flex:1,padding:"10px 4px 8px",border:"none",cursor:"pointer",
            background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:3,
          }}>
            <div style={{
              width:28,height:28,borderRadius:8,
              background:isActive?tab.color+"22":"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:16,transition:"all .12s",
              filter:isActive?"none":"grayscale(80%) opacity(0.5)",
              boxShadow:isActive?`0 0 0 1px ${tab.color}44`:"none",
            }}>{tab.icon}</div>
            <span style={{
              fontSize:9,color:isActive?tab.color:T.textMute,
              fontWeight:isActive?700:400,fontFamily:"'KoPub Dotum',sans-serif",
            }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
