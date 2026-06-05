import { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

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

// Category color system: each cat gets a hue with 3 tones (main, light bg, text)
const CATS = [
  { id:"health",   label:"건강",    icon:"o", color:"#C0443A", bg:"#FDECEA", text:"#9B2E25" },  // 빨강
  { id:"personal", label:"개인",    icon:"o", color:"#C96A2A", bg:"#FDF1E8", text:"#9E4D18" },  // 주황
  { id:"economy",  label:"경제",    icon:"o", color:"#B09520", bg:"#FBF8E3", text:"#7A6A10" },  // 노랑
  { id:"work",     label:"업무",    icon:"o", color:"#4A8A5A", bg:"#EBF5EE", text:"#2E6640" },  // 초록
  { id:"event",    label:"이벤트",  icon:"o", color:"#2E6FA5", bg:"#E8F2FA", text:"#1A4E7A" },  // 파랑
  { id:"review",   label:"리뷰",    icon:"o", color:"#3A52A0", bg:"#EAECF8", text:"#243580" },  // 남색
  { id:"archive",  label:"아카이브", icon:"o", color:"#7E4FA0", bg:"#F3EBF8", text:"#5A2E80" },  // 보라
];

const VIEWS = ["주","월","년"];
const WEEKDAYS = ["일","월","화","수","목","금","토"];
const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const HOURS = Array.from({length:24},(_,i)=>i);

const today = new Date(2025, 5, 3);

/* ─────────────────────────────────────────────────────
   SAMPLE DATA
───────────────────────────────────────────────────── */
const EVENTS = [
  { id:1,  cat:"health",   sub:"운동",     title:"데드리프트 3x5",         date:"2025-06-03", hour:7,  done:true,
    detail:"메인 세트: 100kg x 3세트 x 5회\n보조 운동: 루마니안 데드 80kg x 3x8\n컨디션 좋음. 다음 주 102.5kg 도전 예정." },
  { id:2,  cat:"health",   sub:"체중",     title:"체중 71.2kg",             date:"2025-06-03", hour:8,  done:true,
    detail:"기상 직후 측정. 전날 대비 -0.3kg.\n식단: 단백질 위주, 탄수화물 저녁만." },
  { id:3,  cat:"work",     sub:"",         title:"팀 주간 회의",             date:"2025-06-03", hour:10, done:false,
    detail:"안건: Q2 성과 정리, Q3 로드맵 초안 리뷰\n준비물: 대시보드 캡처, KPI 슬라이드\n참석자: 팀장, 기획 3명, 개발 2명" },
  { id:4,  cat:"personal", sub:"",         title:"친구 생일 선물 구매",      date:"2025-06-03", hour:13, done:false,
    detail:"예산: 5만원 내외\n후보: 무선이어폰, 향수, 지갑\n배송지 확인 필요." },
  { id:5,  cat:"review",   sub:"북",       title:"파친코 — 이민진",          date:"2025-06-02", hour:21, done:true,
    detail:"평점: 4/5\n역사와 가족사가 교차하는 서사. 4대에 걸친 재일교포 이야기.\n인상적인 문장: '역사는 우리를 저버렸지만, 그래도 버텼다.'\n다음 읽을 책: 채식주의자" },
  { id:6,  cat:"economy",  sub:"주식 리뷰", title:"NVDA 급등 포지션 정리",    date:"2025-06-02", hour:18, done:true,
    detail:"매도 가격: $127.4 (평단 $89.2 대비 +43%)\n매도 수량: 보유의 30%\n이유: 고점 부근, 리스크 관리\n잔여 포지션 유지. 조정 시 재매수 고려." },
  { id:7,  cat:"event",    sub:"피부과",   title:"레이저 토닝 시술",          date:"2025-06-05", hour:11, done:false,
    detail:"병원: 강남 OO피부과\n시술: 레이저 토닝 + 보습 앰플\n주의사항: 시술 후 3일 자외선 차단제 필수, 세안 조심\n다음 예약: 8주 후" },
  { id:8,  cat:"work",     sub:"",         title:"기획서 초안 제출",          date:"2025-06-04", hour:14, done:false,
    detail:"프로젝트: 앱 리뉴얼 기획\n포함 내용: 사용자 페르소나, 기능 정의, 화면 흐름도\nFigma 링크 첨부 예정." },
  { id:9,  cat:"health",   sub:"식단",     title:"단백질 170g 달성",          date:"2025-06-01", hour:20, done:true,
    detail:"아침: 닭가슴살 150g + 계란 3개 (단백질 약 55g)\n점심: 연어 200g + 현미밥 (약 50g)\n저녁: 소고기 150g + 두부 (약 65g)\n총 칼로리: 약 2,100kcal" },
  { id:10, cat:"event",    sub:"차 수리",  title:"엔진오일 교체",             date:"2025-05-20", hour:10, done:true,
    detail:"공업사: 성수 OO카센터\n교체 부품: 엔진오일 5W-30, 오일 필터\n비용: 85,000원\n다음 교체: 5,000km 후 또는 6개월 후" },
  { id:11, cat:"review",   sub:"와인",     title:"Barolo 2019",              date:"2025-05-15", hour:20, done:true,
    detail:"생산지: 이탈리아 피에몬테\n품종: 네비올로 100%\n평점: 5/5\n특징: 타닌 강하고 깊은 루비색. 체리, 가죽, 흙 향.\n푸드 페어링: 양갈비구이, 숙성 치즈\n재구매 의향: 있음" },
  { id:12, cat:"health",   sub:"운동",     title:"5km 러닝 28분",             date:"2025-05-10", hour:7,  done:true,
    detail:"경로: 한강 뚝섬 구간\n페이스: 5'36\"/km\n심박수: 평균 158bpm\n날씨: 맑음, 18도\n피로도 낮음. 다음 목표: 27분대" },
  { id:13, cat:"economy",  sub:"주식 리뷰", title:"포트폴리오 월간 점검",      date:"2025-04-30", hour:9,  done:true,
    detail:"총 평가금액: 약 3,800만원\nYTD 수익률: +12.4%\n주요 보유: NVDA(30%), MSFT(20%), 국내 ETF(50%)\n이달 리밸런싱: 국내 비중 +5% 조정 예정" },
  { id:14, cat:"event",    sub:"기타",     title:"이사 완료",                 date:"2025-03-15", hour:0,  done:true,
    detail:"이전 주소: 서울 마포구\n신규 주소: 서울 성동구\n이삿짐센터: OO이사\n비용: 85만원\n정리 기간: 약 1주일 소요" },
  { id:15, cat:"archive",  sub:"",         title:"React 렌더링 최적화 노트",  date:"2025-06-01", hour:22, done:true,
    detail:"핵심 개념:\n1. useMemo: 값 캐싱, 연산 비용 높을 때\n2. useCallback: 함수 참조 안정화\n3. React.memo: 컴포넌트 리렌더 방지\n4. 가상화(react-window): 긴 리스트\n참고: React 공식 docs, Kent C. Dodds 블로그" },
  { id:16, cat:"personal", sub:"",         title:"독서 30분",                 date:"2025-06-03", hour:22, done:false,
    detail:"오늘 목표: 채식주의자 1부 마무리\n현재 진도: p.87\n메모할 내용 있으면 리뷰 카테고리에 기록 예정" },
  { id:17, cat:"work",     sub:"",         title:"코드 리뷰",                 date:"2025-06-03", hour:15, done:false,
    detail:"PR #247 — 검색 필터 리팩토링\nPR #251 — 온보딩 플로우 수정\n예상 소요: 1시간\n코멘트 2건 남길 예정" },
  { id:18, cat:"health",   sub:"컨디션",   title:"컨디션 메모",               date:"2025-06-02", hour:23, done:true,
    detail:"피로감: 중간 (6/10)\n수면: 6시간 (부족)\n스트레스: 업무 마감으로 다소 높음\n내일: 수면 7시간 이상 목표, 카페인 오후 2시 이후 금지" },
  { id:19, cat:"review",   sub:"커피",     title:"블루보틀 나이트로",          date:"2025-05-28", hour:10, done:true,
    detail:"매장: 블루보틀 성수\n메뉴: 나이트로 콜드브루 (M)\n가격: 7,500원\n평점: 4/5\n특징: 크리미한 질감, 산미 낮음, 달지 않음\n재방문 의향: 있음" },
  { id:20, cat:"economy",  sub:"주식 리뷰", title:"금리 이슈 채권 비중 검토",   date:"2025-06-03", hour:8,  done:true,
    detail:"배경: 연준 금리 동결 기조 유지 발표\n분석: 단기채 매력 상승, TLT 저점 가능성\n액션: 채권 ETF 비중 5%p 확대 검토\n참고 자료: Bloomberg, 연준 성명서" },
  { id:21, cat:"personal", sub:"",         title:"명상 10분",                 date:"2025-06-03", hour:6,  done:true,
    detail:"앱: Calm\n방식: 호흡 명상\n집중도: 중간. 잡생각 많았음.\n내일은 가이디드 보다 사일런트 시도 예정" },
  { id:22, cat:"event",    sub:"기타",     title:"부모님 생신 저녁",           date:"2025-06-15", hour:18, done:false,
    detail:"장소: 압구정 한정식\n예약: 6시 30분\n참석: 가족 4명\n선물: 용돈 + 케이크" },
  { id:23, cat:"review",   sub:"북",       title:"도둑맞은 집중력 — 요한 하리", date:"2025-05-05", hour:21, done:true,
    detail:"평점: 5/5\n현대 집중력 위기를 체계적으로 분석. SNS, 업무 환경, 식단까지.\n핵심 메시지: 집중력 저하는 개인 의지 문제가 아니라 구조적 문제\n실천: 폰 흑백 모드 설정, 알림 전면 차단 시작" },
  { id:24, cat:"health",   sub:"운동",     title:"스쿼트 4x8",                date:"2025-06-01", hour:7,  done:true,
    detail:"메인: 80kg x 4세트 x 8회\n보조: 레그프레스 120kg x 3x10\n무릎 약간 불편함. 다음 세션 무게 유지 후 폼 점검 예정." },
  { id:25, cat:"work",     sub:"",         title:"분기 보고서 마감",           date:"2025-06-30", hour:18, done:false,
    detail:"포함 내용: Q2 KPI, 팀 성과, Q3 계획\n초안 마감: 6/25\n검토자: 팀장, 본부장\n양식: 사내 공유 드라이브 템플릿 사용" },
];

const RAW_WEIGHT = [
  {day:0,w:72.4},{day:3,w:72.1},{day:7,w:71.8},{day:10,w:71.9},
  {day:14,w:71.5},{day:18,w:71.2},{day:21,w:71.0},{day:25,w:70.8},{day:29,w:70.5},
];
const WEIGHT_DATA = (() => {
  const base = new Date(today); base.setDate(base.getDate()-29);
  return Array.from({length:30},(_,i)=>{
    const exact = RAW_WEIGHT.find(r=>r.day===i);
    const dd = new Date(base); dd.setDate(dd.getDate()+i);
    const label = `${dd.getMonth()+1}/${dd.getDate()}`;
    if(exact) return {day:i, weight:exact.w, actual:true, label};
    const prev=[...RAW_WEIGHT].reverse().find(r=>r.day<i);
    const next=RAW_WEIGHT.find(r=>r.day>i);
    if(prev&&next){
      const w=prev.w+(next.w-prev.w)*((i-prev.day)/(next.day-prev.day));
      return {day:i, weight:+w.toFixed(1), actual:false, label};
    }
    return {day:i, weight:null, actual:false, label};
  });
})();

/* ─────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────── */
const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const catOf = (id) => CATS.find(c=>c.id===id) || CATS[0];

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
function DetailModal({ ev, onClose }) {
  const cat = catOf(ev.cat);
  const [done, setDone] = useState(ev.done);
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
            }}>x</button>
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
          <button onClick={()=>setDone(d=>!d)} style={{
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
            }}>{done&&"v"}</div>
            {done ? "완료됨" : "미완료"}
          </button>
          <div style={{display:"flex",gap:8}}>
            <button style={{
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
  const cat = catOf(ev.cat);
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
function DayView({ date, filterCat, onOpen }) {
  const ds = dateStr(date);
  const [showEarly, setShowEarly] = useState(false);
  const earlyHours = [0,1,2,3,4,5,6,7];
  const mainHours  = HOURS.filter(h=>!earlyHours.includes(h));
  const nowH = today.getHours ? today.getHours() : -1;

  const renderRow = (h) => {
    const evs = EVENTS.filter(e=>e.date===ds&&e.hour===h&&(filterCat==="all"||e.cat===filterCat));
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
    acc+EVENTS.filter(e=>e.date===ds&&e.hour===h&&(filterCat==="all"||e.cat===filterCat)).length,0);

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
function WeekView({ date, filterCat, onOpen }) {
  const days = getWeekDays(date);
  const todayStr = dateStr(today);
  const [showEarly, setShowEarly] = useState(false);
  const earlyHours = [0,1,2,3,4,5,6,7];
  const mainHours  = HOURS.filter(h=>!earlyHours.includes(h));
  const COL = "44px repeat(7,1fr)";
  const ROW_H = 56; // fixed row height px

  const earlyEvCount = earlyHours.reduce((acc,h)=>
    acc+days.reduce((a2,d)=>
      a2+EVENTS.filter(e=>e.date===dateStr(d)&&e.hour===h&&(filterCat==="all"||e.cat===filterCat)).length,0),0);

  const renderRow = (h) => (
    <div key={h} style={{
      display:"grid", gridTemplateColumns:COL,
      height:ROW_H, flexShrink:0,
      borderBottom:"0.5px solid rgba(228,221,211,0.22)",
    }}>
      {/* time label */}
      <div style={{
        fontSize:9,color:T.textMute,textAlign:"right",
        paddingRight:6,paddingTop:5,letterSpacing:.2,
        borderRight:"0.5px solid rgba(228,221,211,0.22)",
      }}>
        {String(h).padStart(2,"0")}
      </div>
      {/* day columns */}
      {days.map((d,i)=>{
        const evs=EVENTS.filter(e=>e.date===dateStr(d)&&e.hour===h&&(filterCat==="all"||e.cat===filterCat));
        const isLastCol = i===6;
        return (
          <div key={i} style={{
            padding:"2px 3px",overflow:"hidden",
            borderRight:"0.5px solid rgba(228,221,211,0.22)",
          }}>
            {evs.map(ev=>{
              const cat=catOf(ev.cat);
              return (
                <div key={ev.id} onClick={()=>onOpen(ev)} title={ev.title} style={{
                  fontSize:11,padding:"3px 7px",borderRadius:5,marginBottom:2,
                  background: ev.done ? `${cat.bg}` : cat.bg,
                  color: ev.done ? T.textMute : cat.text,
                  border:`1px solid ${ev.done ? T.border : cat.color+"55"}`,
                  borderLeft:`2px solid ${ev.done ? T.borderMid : cat.color}`,
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                  cursor:"pointer",
                  opacity: ev.done ? 0.4 : 1,
                  textDecoration: "none",
                }}>{ev.title}</div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

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
          const isLastCol=i===6;
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
function MonthView({ date, filterCat, onDayClick, onOpen }) {
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
          const allEvs=EVENTS.filter(e=>e.date===ds&&(filterCat==="all"||e.cat===filterCat));
          // Split: todo first, done at bottom
          const todoEvs=allEvs.filter(e=>!e.done);
          const doneEvs=allEvs.filter(e=>e.done);
          const uniqueCats=[...new Set(todoEvs.map(e=>e.cat))];
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
                    <div key={cid} style={{width:5,height:5,borderRadius:"50%",background:catOf(cid).color}}/>
                  ))}
                </div>
              </div>
              {/* Todo items — normal */}
              <div style={{flex:1,overflow:"hidden"}}>
                {todoEvs.slice(0,2).map(ev=>{
                  const cat=catOf(ev.cat);
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
function YearView({ date, filterCat, onOpen }) {
  const year = date.getFullYear();
  const [tooltip, setTooltip] = useState(null);
  const todayStr = dateStr(today);

  const eventsByDate = useMemo(()=>{
    const map={};
    EVENTS.filter(e=>e.date.startsWith(`${year}`)&&e.cat==="event"&&(filterCat==="all"||filterCat==="event"))
      .forEach(e=>{ if(!map[e.date])map[e.date]=[]; map[e.date].push(e); });
    return map;
  },[year,filterCat]);

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
                  const cats=[...new Set(evs.map(e=>e.cat))];
                  const hasEvs=evs.length>0;

                  let bg="transparent";
                  if(hasEvs){
                    if(cats.length===1) bg=catOf(cats[0]).color;
                    else bg=`conic-gradient(${cats.map((c,ci)=>`${catOf(c).color} ${ci/cats.length*360}deg ${(ci+1)/cats.length*360}deg`).join(",")})`;
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
                        boxShadow:hasEvs?`0 0 4px ${catOf(cats[0]).color}55`:"none",
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
            const cat=catOf(ev.cat);
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
  useState(()=>{
    const id=setInterval(()=>{
      const n=new Date();
      setTime(`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`);
    },30000);
    return ()=>clearInterval(id);
  });
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
  const pool = events.filter(e=>e.cat==="archive"||(e.cat==="review"&&e.sub==="북"));
  const [idx, setIdx] = useState(()=>Math.floor(Math.random()*Math.max(pool.length,1)));
  if(!pool.length) return null;
  const ev = pool[idx % pool.length];
  const cat = catOf(ev.cat);
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
   WEIGHT CHART
───────────────────────────────────────────────────── */
function WeightSection() {
  const catHealth = {...CATS[0], color:'#D4867E', bg:'#FEF5F4'};
  const CustomDot=(props)=>{
    const{cx,cy,payload}=props;
    if(!payload.actual)return null;
    return <circle cx={cx} cy={cy} r={4} fill={catHealth.color} stroke={T.bgCard} strokeWidth={2}/>;
  };
  const CustomTip=({active,payload})=>{
    if(!active||!payload?.length)return null;
    const d=payload[0].payload;
    return(
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,boxShadow:"0 4px 12px rgba(44,40,37,0.1)"}}>
        <div style={{color:T.textMute}}>{d.label}</div>
        <div style={{color:d.actual?catHealth.color:T.textMute,fontWeight:d.actual?700:400}}>
          {d.weight}kg{!d.actual&&<span style={{fontSize:9,marginLeft:4,color:T.textMute}}>(보간)</span>}
        </div>
      </div>
    );
  };
  const actuals=WEIGHT_DATA.filter(d=>d.actual&&d.weight);
  const min=Math.min(...actuals.map(d=>d.weight))-.8;
  const max=Math.max(...actuals.map(d=>d.weight))+.5;
  const avg=+(actuals.reduce((a,d)=>a+d.weight,0)/actuals.length).toFixed(1);
  return(
    <div style={{background:catHealth.bg,borderRadius:10,padding:"12px 10px",border:`1px solid ${catHealth.color}22`}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,alignItems:"center"}}>
        <span style={{fontSize:9,color:catHealth.text,fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>체중</span>
        <span style={{fontSize:9,color:catHealth.text,fontWeight:400,opacity:.7}}>{WEIGHT_DATA[WEIGHT_DATA.length-1].weight}kg</span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={WEIGHT_DATA} margin={{top:2,right:4,left:-28,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="label" tick={{fontSize:8,fill:T.textMute}} interval={9}/>
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
   TEMPLATES
───────────────────────────────────────────────────── */
const TEMPLATES = {
  wine: {
    label: "와인",
    catId: "review",
    fields: [
      { key:"wineName",    label:"와인명",      type:"text" },
      { key:"vintage",     label:"빈티지",      type:"text", placeholder:"예) 2019" },
      { key:"origin",      label:"생산지",      type:"text", placeholder:"예) 이탈리아 / 피에몬테" },
      { key:"grape",       label:"포도 품종",   type:"text" },
      { key:"alcohol",     label:"알코올 도수", type:"text", placeholder:"예) 13.5%" },
      { key:"price",       label:"가격",        type:"text" },
      { key:"tasteDate",   label:"시음 날짜",   type:"date" },
      { key:"aroma",       label:"향",          type:"text" },
      { key:"sweetness",   label:"당도",        type:"score" },
      { key:"acidity",     label:"산도",        type:"score" },
      { key:"tannin",      label:"타닌",        type:"score" },
      { key:"body",        label:"바디감",      type:"score" },
      { key:"score",       label:"총점",        type:"score" },
      { key:"pairing",     label:"푸드 페어링", type:"text" },
      { key:"rebuy",       label:"재구매 의향", type:"text", placeholder:"Y / N" },
      { key:"memo",        label:"메모",        type:"textarea" },
    ]
  },
  book: {
    label: "책",
    catId: "review",
    fields: [
      { key:"title",    label:"책 제목", type:"text" },
      { key:"author",   label:"작가",    type:"text" },
      { key:"genre",    label:"장르",    type:"text" },
      { key:"period",   label:"날짜",    type:"text", placeholder:"예) 2025.05.01 – 2025.05.20" },
      { key:"record",   label:"기록",    type:"textarea", placeholder:"인상 깊은 문장이나 내용" },
      { key:"thought",  label:"생각",    type:"textarea" },
    ]
  },
  weightTraining: {
    label: "웨이트",
    catId: "health",
    fields: [
      { key:"part",     label:"부위",      type:"text", placeholder:"예) 가슴 / 등 / 어깨 / 팔 / 하체" },
      { key:"duration", label:"운동 시간", type:"text", placeholder:"예) 60분" },
      { key:"condition",label:"컨디션",    type:"score" },
      { key:"sets",     label:"운동명",    type:"textarea", placeholder:"예)\n스쿼트 (80kg, 8회, 4세트)\n레그프레스 (120kg, 10회, 3세트)" },
      { key:"memo",     label:"메모",      type:"textarea" },
    ]
  },
  cardio: {
    label: "카디오",
    catId: "health",
    fields: [
      { key:"exercise", label:"운동명",      type:"text", placeholder:"예) 러닝 / 자전거 / 수영" },
      { key:"distance", label:"거리",        type:"text", placeholder:"예) 5km" },
      { key:"avgSpeed", label:"평균 속도",   type:"text", placeholder:"예) 5'36\"/km" },
      { key:"avgHr",    label:"평균 심박수", type:"text", placeholder:"예) 158bpm" },
      { key:"calories", label:"칼로리",      type:"text", placeholder:"예) 320kcal" },
      { key:"memo",     label:"메모",        type:"textarea" },
    ]
  },
  diet: {
    label: "식단",
    catId: "health",
    fields: [
      { key:"breakfast", label:"아침",      type:"textarea", placeholder:"메뉴 입력" },
      { key:"lunch",     label:"점심",      type:"textarea", placeholder:"메뉴 입력" },
      { key:"dinner",    label:"저녁",      type:"textarea", placeholder:"메뉴 입력" },
      { key:"snack",     label:"간식",      type:"text" },
      { key:"calories",  label:"총 칼로리", type:"text", placeholder:"예) 2,100kcal" },
      { key:"protein",   label:"총 단백질", type:"text", placeholder:"예) 170g" },
      { key:"note",      label:"특이사항",  type:"text", placeholder:"예) 과식, 음주, 생리 등" },
    ]
  },
  coffee: {
    label: "커피",
    catId: "review",
    fields: [
      { key:"cafe",   label:"카페명", type:"text" },
      { key:"menu",   label:"메뉴",   type:"text" },
      { key:"price",  label:"가격",   type:"text" },
      { key:"memo",   label:"메모",   type:"textarea" },
    ]
  },
  economy: {
    label: "경제",
    catId: "economy",
    fields: [
      { key:"date",     label:"날짜",         type:"date" },
      { key:"index",    label:"주요 지수",    type:"text", placeholder:"예) 코스피 2,730 / S&P500 5,280" },
      { key:"keyword",  label:"오늘의 키워드",type:"text", placeholder:"예) 금리 동결, 실적 시즌" },
      { key:"summary",  label:"오늘 요약",    type:"textarea" },
      { key:"watchlist",label:"내일 주목할 것",type:"textarea" },
    ]
  },
};

const TMPL_ORDER = ["diet","weightTraining","cardio","book","coffee","wine","economy"];
// Sub-templates by category
const CAT_TEMPLATES = {
  health:  ["diet","weightTraining","cardio"],
  review:  ["book","coffee","wine"],
  economy: ["economy"],
};

/* ─────────────────────────────────────────────────────
   IMAGE UPLOAD  (for event / review / archive)
───────────────────────────────────────────────────── */
const IMAGE_CATS = new Set(["event","review","archive"]);

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
              lineHeight:1,
            }}>x</button>
          </div>
        ))}
        <label style={{
          width:64,height:64,borderRadius:8,cursor:"pointer",
          border:`1.5px dashed ${catColor||T.borderMid}`,
          background:T.bgSub,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:3, color:T.textMute, fontSize:10, flexShrink:0,
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
   ADD MODAL
───────────────────────────────────────────────────── */
function AddModal({ onClose }) {
  const [cat, setCat] = useState("personal");
  const [tmpl, setTmpl] = useState(null);  // null = free form
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState({});
  const [images, setImages] = useState([]);
  const c = catOf(cat);

  const setField = (key, val) => setFields(f=>({...f,[key]:val}));

  const inputStyle = {
    width:"100%", background:T.bgSub,
    border:`1px solid ${T.border}`, borderRadius:8,
    padding:"9px 12px", color:T.text, fontSize:12,
    outline:"none", boxSizing:"border-box",
    fontFamily:"'Noto Sans KR',sans-serif",
  };

  const currentTmpl = tmpl ? TEMPLATES[tmpl] : null;

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(44,40,37,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:400,
      backdropFilter:"blur(3px)",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.bgCard, borderRadius:18,
        width:460, maxWidth:"94vw", maxHeight:"88vh",
        boxShadow:"0 20px 60px rgba(44,40,37,0.18)",
        border:`1px solid ${T.border}`,
        display:"flex", flexDirection:"column",
        overflow:"hidden",
      }}>

        {/* Modal header */}
        <div style={{padding:"20px 22px 14px", borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
          <div style={{
            fontSize:16, fontWeight:600, color:T.text, marginBottom:14,
            fontFamily:"'Libre Baskerville',Georgia,serif",
          }}>새 기록 추가</div>

          {/* Category selector */}
          <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:12}}>
            {CATS.map(ct=>(
              <button key={ct.id} onClick={()=>{setCat(ct.id); setTmpl(null); setFields({}); setImages([]);}} style={{
                padding:"4px 11px", borderRadius:20, fontSize:11, cursor:"pointer",
                background:cat===ct.id?ct.bg:T.bgSub,
                border:`1px solid ${cat===ct.id?ct.color+"88":T.border}`,
                color:cat===ct.id?ct.text:T.textSub,
                fontWeight:cat===ct.id?600:400, transition:"all .12s",
              }}>{ct.label}</button>
            ))}
          </div>

          {/* Template selector — only shows when category has templates */}
          {CAT_TEMPLATES[cat] && (
            <div style={{display:"flex", gap:5, flexWrap:"wrap", alignItems:"center", marginTop:6}}>
              <span style={{fontSize:10, color:T.textMute, marginRight:2}}>템플릿</span>
              <button onClick={()=>setTmpl(null)} style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, cursor:"pointer",
                background:!tmpl?T.text:T.bgSub,
                border:`1px solid ${!tmpl?T.text:T.border}`,
                color:!tmpl?"white":T.textSub, fontWeight:!tmpl?600:400,
              }}>자유</button>
              {CAT_TEMPLATES[cat].map(tk=>{
                const t=TEMPLATES[tk];
                const active=tmpl===tk;
                const tcat=catOf(t.catId);
                return (
                  <button key={tk} onClick={()=>{setTmpl(tk); setFields({});}} style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, cursor:"pointer",
                    background:active?tcat.bg:T.bgSub,
                    border:`1px solid ${active?tcat.color+"88":T.border}`,
                    color:active?tcat.text:T.textSub, fontWeight:active?600:400,
                  }}>{t.label}</button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{flex:1, overflowY:"auto", padding:"16px 22px"}}>

          {/* Free form */}
          {!currentTmpl && (
            <>
              <input placeholder="제목 입력..." style={{...inputStyle, marginBottom:8}}
                value={title} onChange={e=>setTitle(e.target.value)}/>
              <textarea placeholder="상세 내용" rows={5}
                style={{...inputStyle, resize:"vertical", marginBottom:8}}/>
              {IMAGE_CATS.has(cat) && (
                <ImageUpload images={images} onChange={setImages} catColor={c.color}/>
              )}
              <div style={{display:"flex", gap:7}}>
                <input type="date" defaultValue="2025-06-03" style={{flex:1,...inputStyle}}/>
                <input type="time" defaultValue="09:00" style={{flex:1,...inputStyle}}/>
              </div>
            </>
          )}

          {/* Template form */}
          {currentTmpl && (
            <>
              <input placeholder="제목 입력..." style={{...inputStyle, marginBottom:12}}
                value={title} onChange={e=>setTitle(e.target.value)}/>
              {currentTmpl.fields.map(f=>(
                <div key={f.key} style={{marginBottom:10}}>
                  <div style={{
                    fontSize:11, color:T.textSub, fontWeight:500, marginBottom:4,
                    display:"flex", alignItems:"center", gap:6,
                  }}>
                    {f.label}
                    {f.type==="score" && (
                      <span style={{fontSize:10, color:T.textMute}}>/5</span>
                    )}
                  </div>
                  {f.type==="score" ? (
                    <div style={{display:"flex", gap:5}}>
                      {[1,2,3,4,5].map(n=>(
                        <button key={n} onClick={()=>setField(f.key, n)} style={{
                          width:34, height:34, borderRadius:8, cursor:"pointer", fontSize:13,
                          background:fields[f.key]===n?c.color:T.bgSub,
                          border:`1px solid ${fields[f.key]===n?c.color:T.border}`,
                          color:fields[f.key]===n?"white":T.textSub, fontWeight:600,
                        }}>{n}</button>
                      ))}
                      {fields[f.key] && (
                        <button onClick={()=>setField(f.key,null)} style={{
                          width:34,height:34,borderRadius:8,cursor:"pointer",fontSize:10,
                          background:"transparent",border:`1px solid ${T.border}`,color:T.textMute,
                        }}>x</button>
                      )}
                    </div>
                  ) : f.type==="textarea" ? (
                    <textarea rows={3} placeholder={f.placeholder||""} style={{...inputStyle,resize:"vertical"}}
                      value={fields[f.key]||""} onChange={e=>setField(f.key,e.target.value)}/>
                  ) : f.type==="date" ? (
                    <input type="date" style={inputStyle}
                      value={fields[f.key]||"2025-06-03"} onChange={e=>setField(f.key,e.target.value)}/>
                  ) : (
                    <input type="text" placeholder={f.placeholder||""} style={inputStyle}
                      value={fields[f.key]||""} onChange={e=>setField(f.key,e.target.value)}/>
                  )}
                </div>
              ))}
              {IMAGE_CATS.has(cat) && (
                <ImageUpload images={images} onChange={setImages} catColor={c.color}/>
              )}
              <div style={{display:"flex", gap:7, marginTop:4}}>
                <input type="date" defaultValue="2025-06-03" style={{flex:1,...inputStyle}}/>
                <input type="time" defaultValue="09:00" style={{flex:1,...inputStyle}}/>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding:"14px 22px", borderTop:`1px solid ${T.border}`,
          display:"flex", gap:8, flexShrink:0, background:T.bgSub,
        }}>
          <button onClick={onClose} style={{
            flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
            background:"transparent", border:`1px solid ${T.borderMid}`,
            color:T.textSub, fontSize:13,
          }}>취소</button>
          <button onClick={onClose} style={{
            flex:1, padding:"11px", borderRadius:9, cursor:"pointer",
            background:c.color, border:"none", color:"white",
            fontSize:13, fontWeight:600,
            boxShadow:`0 3px 14px ${c.color}44`,
          }}>저장</button>
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

        // 며칠 전 데이터인지 계산
        const latestDate = new Date(latestData.date);
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
  const diffDays  = briefing?.diffDays || 0;

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
  { id:"all",      label:"전체",   icon:"○" },
  { id:"briefing", label:"브리핑", icon:"◈" },
  { id:"health",   label:"건강",   icon:"○" },
  { id:"personal", label:"개인",   icon:"○" },
  { id:"work",     label:"업무",   icon:"○" },
  { id:"more",     label:"더보기", icon:"≡" },
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
  const moreCats = CATS.filter(c=>!["health","personal","work"].includes(c.id));
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

  const todayEvs = EVENTS.filter(e=>e.date===dateStr(today));
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

          {/* Nav */}
          <nav style={{padding:"10px 10px",flex:1}}>
            {/* 전체 보기 */}
            {[{id:"all",label:"전체 보기",color:T.textSub,bg:T.bgCard,text:T.text}].map(item=>{
              const active=filterCat===item.id&&!showBriefing;
              return (
                <button key={item.id} onClick={()=>{setFilterCat(item.id);setShowBriefing(false);}} style={{
                  width:"100%",textAlign:"left",padding:"8px 12px",
                  borderRadius:9,marginBottom:2,cursor:"pointer",
                  background:active?T.bgCard:"transparent",
                  border:`1px solid ${active?"#88888844":T.bgSub}`,
                  color:active?T.text:T.textSub,
                  fontSize:13,display:"flex",alignItems:"center",gap:8,transition:"all .12s",
                  fontWeight:active?600:400,
                }}>
                  <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:active?T.accent:T.borderMid}}/>
                  전체 보기
                </button>
              );
            })}
            {/* 브리핑 */}
            <button onClick={()=>setShowBriefing(s=>!s)} style={{
              width:"100%",textAlign:"left",padding:"8px 12px",
              borderRadius:9,marginBottom:2,cursor:"pointer",
              background:showBriefing?"#6B7C3A18":"transparent",
              border:`1px solid ${showBriefing?"#6B7C3A44":T.bgSub}`,
              color:showBriefing?"#6B7C3A":T.textSub,
              fontSize:13,display:"flex",alignItems:"center",gap:8,transition:"all .12s",
              fontWeight:showBriefing?600:400,
            }}>
              <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:showBriefing?"#6B7C3A":T.borderMid}}/>
              브리핑
            </button>
            {/* Category items */}
            {CATS.map(item=>{
              const active=filterCat===item.id&&!showBriefing;
              return (
                <button key={item.id} onClick={()=>{setFilterCat(item.id);setShowBriefing(false);}} style={{
                  width:"100%",textAlign:"left",padding:"8px 12px",
                  borderRadius:9,marginBottom:2,cursor:"pointer",
                  background:active?(item.bg||T.bgCard):"transparent",
                  border:`1px solid ${active?(item.color+"44"):T.bgSub}`,
                  color:active?(item.text||T.text):T.textSub,
                  fontSize:13,display:"flex",alignItems:"center",gap:8,transition:"all .12s",
                  fontWeight:active?600:400,
                }}>
                  <div style={{
                    width:8,height:8,borderRadius:"50%",flexShrink:0,
                    background:active?(item.color||T.accent):T.borderMid,
                  }}/>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Weight chart + Random review */}
          <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`}}>
            <WeightSection/>
            <RandomReview events={EVENTS} onOpen={setShowDetail}/>
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
          {/* Row 1: 날짜 네비 */}
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            padding:isMobile?"10px 12px 6px":"12px 20px 6px",
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
            <button onClick={()=>navigate(-1)} style={{
              background:T.bgCard,border:`1px solid ${T.border}`,
              color:T.textSub,cursor:"pointer",borderRadius:7,
              padding:"5px 10px",fontSize:14,flexShrink:0,
            }}>&#8249;</button>
            <div style={{
              fontFamily:"'Libre Baskerville',Georgia,serif",
              fontSize:isMobile?14:15,color:T.text,
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
          </div>
          {/* Row 2: 뷰 선택 + 추가 */}
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            padding:isMobile?"0 12px 10px":"0 20px 12px",
            justifyContent:"space-between",
          }}>
            <div style={{display:"flex",background:T.bgCard,borderRadius:8,padding:2,gap:1,border:`1px solid ${T.border}`}}>
              {VIEWS.map(v=>(
                <button key={v} onClick={()=>setView(v)} style={{
                  padding:isMobile?"6px 16px":"5px 14px",
                  borderRadius:6,fontSize:isMobile?13:12,cursor:"pointer",
                  background:view===v?T.accent:"transparent",
                  border:"none",color:view===v?"white":T.textSub,
                  fontWeight:view===v?600:400,
                }}>{v}</button>
              ))}
            </div>
            <button onClick={()=>setShowModal(true)} style={{
              padding:isMobile?"8px 20px":"8px 18px",
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
          <button onClick={()=>{setFilterCat("all");setShowBriefing(false);}} style={{
            padding:"4px 14px",borderRadius:20,fontSize:11,cursor:"pointer",flexShrink:0,
            background:filterCat==="all"&&!showBriefing?T.text:T.bgCard,
            border:`1px solid ${filterCat==="all"&&!showBriefing?T.text:T.border}`,
            color:filterCat==="all"&&!showBriefing?"white":T.textSub,
            fontWeight:filterCat==="all"&&!showBriefing?600:400,
          }}>전체</button>
          {CATS.map(c=>{
            const active=filterCat===c.id&&!showBriefing;
            return (
              <button key={c.id} onClick={()=>{setFilterCat(c.id);setShowBriefing(false);}} style={{
                padding:"4px 13px",borderRadius:20,fontSize:11,cursor:"pointer",flexShrink:0,
                background:active?c.bg:T.bgCard,
                border:`1px solid ${active?c.color+"88":T.border}`,
                color:active?c.text:T.textSub,
                fontWeight:active?600:400,transition:"all .12s",
              }}>{c.label}</button>
            );
          })}
        </div>}

        {/* View content */}
        <div style={{flex:1,padding:"16px 20px",overflow:"hidden"}}>
          {showBriefing ? (
            <BriefingView/>
          ) : (
            <>
              {view==="주" && <WeekView date={curDate} filterCat={filterCat} onOpen={setShowDetail}/>}
              {view==="월" && <MonthView date={curDate} filterCat={filterCat} onDayClick={d=>{setCurDate(d);setView("주");}} onOpen={setShowDetail}/>}
              {view==="년" && <YearView date={curDate} filterCat={filterCat} onOpen={setShowDetail}/>}
            </>
          )}
        </div>
      </main>

      {showModal && <AddModal onClose={()=>setShowModal(false)}/>}
      {showDetail && <DetailModal ev={showDetail} onClose={()=>setShowDetail(null)}/>}
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
