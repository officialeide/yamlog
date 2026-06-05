/* ─────────────────────────────────────────────────────
   CONSTANTS.JS — 디자인 토큰, 카테고리, 헬퍼, 단어장
───────────────────────────────────────────────────── */

// ── Design Tokens ──────────────────────────────────
export const T = {
  bg:        "#F7F4EF",
  bgCard:    "#FFFFFF",
  bgSub:     "#F0EDE7",
  border:    "#E4DDD3",
  borderMid: "#CEC5B8",
  text:      "#2C2825",
  textSub:   "#8C8077",
  textMute:  "#B8AFA5",
  accent:    "#6B7C3A",
};

// ── Categories ─────────────────────────────────────
export const CATS = [
  { id:"schedule", label:"일정",    icon:"o", color:"#C0443A", bg:"#FDECEA", text:"#9B2E25" },
  { id:"event",    label:"이벤트",  icon:"o", color:"#B09520", bg:"#FBF8E3", text:"#7A6A10" },
  { id:"archive",  label:"아카이브", icon:"o", color:"#4A8A5A", bg:"#EBF5EE", text:"#2E6640" },
];

export const ARCHIVE_SUBS = [
  { id:"health",  label:"건강", color:"#4A8A5A", bg:"#EBF5EE", text:"#2E6640" },
  { id:"economy", label:"경제", color:"#2E6FA5", bg:"#E8F2FA", text:"#1A4E7A" },
  { id:"review",  label:"리뷰", color:"#1A4080", bg:"#E5EAF5", text:"#0F2A60" },
  { id:"etc",     label:"기타", color:"#7E4FA0", bg:"#F3EBF8", text:"#5A2E80" },
];

export const HEALTH_SUBS = [
  { id:"weight",          label:"체중" },
  { id:"diet",            label:"식단" },
  { id:"weight_training", label:"웨이트" },
  { id:"cardio",          label:"카디오" },
];

export const REVIEW_SUBS = [
  { id:"book",   label:"책" },
  { id:"wine",   label:"와인" },
  { id:"coffee", label:"커피" },
];

// 아카이브 서브카테고리 ID 목록 — App.jsx, components.jsx 공통 참조용
export const KNOWN_SUBS = [
  "weight","diet","weight_training","cardio",
  "economy",
  "book","wine","coffee",
];

// ── View constants ──────────────────────────────────
export const VIEWS     = ["주","월","년"];
export const WEEKDAYS  = ["일","월","화","수","목","금","토"];
export const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
export const HOURS     = Array.from({length:24},(_,i)=>i);

// ── Helper functions ────────────────────────────────
/** 로컬 타임존 기준 YYYY-MM-DD 문자열 */
export const dateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const _HEALTH_SUBS = ["weight","diet","weight_training","cardio"];
const _REVIEW_SUBS = ["book","wine","coffee"];

/** 카테고리/서브카테고리로 색상 객체 반환 */
export const catOf = (category, sub_category) => {
  if (category === "archive") {
    if (!sub_category) return CATS.find(c=>c.id==="archive") || CATS[0];
    if (_HEALTH_SUBS.includes(sub_category)) return ARCHIVE_SUBS.find(s=>s.id==="health")  || CATS[2];
    if (_REVIEW_SUBS.includes(sub_category)) return ARCHIVE_SUBS.find(s=>s.id==="review")  || CATS[2];
    if (sub_category === "economy")          return ARCHIVE_SUBS.find(s=>s.id==="economy") || CATS[2];
    return ARCHIVE_SUBS.find(s=>s.id===sub_category) || CATS.find(c=>c.id==="archive") || CATS[0];
  }
  return CATS.find(c=>c.id===category) || CATS[0];
};

/** 해당 날짜가 속한 주의 7일 배열 (일~토) */
export function getWeekDays(date) {
  const d = new Date(date), day = d.getDay();
  return Array.from({length:7}, (_, i) => {
    const x = new Date(d);
    x.setDate(x.getDate() - day + i);
    return x;
  });
}

/** 월 캘린더 셀 배열 (앞 빈칸 null, 날짜 Date 객체) */
export function getMonthCells(date) {
  const year = date.getFullYear(), month = date.getMonth();
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  return cells;
}

// ── Word Bank (중복 제거) ───────────────────────────
export const TOEIC_WORDS = [
  // A
  {word:"abandon",        meaning:"포기하다, 버리다"},
  {word:"accelerate",     meaning:"가속하다, 촉진하다"},
  {word:"accommodate",    meaning:"수용하다, 편의를 제공하다"},
  {word:"accomplish",     meaning:"성취하다, 완수하다"},
  {word:"accurate",       meaning:"정확한, 정밀한"},
  {word:"acclimate",      meaning:"적응하다"},
  {word:"accumulate",     meaning:"축적하다, 모으다"},
  {word:"acquire",        meaning:"획득하다, 습득하다"},
  {word:"adjacent",       meaning:"인접한, 근접한"},
  {word:"adjourn",        meaning:"휴회하다, 연기하다"},
  {word:"adjunct",        meaning:"부가물, 보조"},
  {word:"adjustment",     meaning:"조정, 수정"},
  {word:"advent",         meaning:"도래, 출현"},
  {word:"advocacy",       meaning:"지지, 옹호"},
  {word:"aggregate",      meaning:"합계, 총액"},
  {word:"agenda",         meaning:"의제, 안건"},
  {word:"allocation",     meaning:"배분, 할당"},
  {word:"allocate",       meaning:"할당하다, 배분하다"},
  {word:"amend",          meaning:"수정하다, 개정하다"},
  {word:"analyze",        meaning:"분석하다"},
  {word:"annotation",     meaning:"주석, 메모"},
  {word:"anticipate",     meaning:"예상하다, 기대하다"},
  {word:"apparent",       meaning:"명백한, 외견상의"},
  {word:"applicable",     meaning:"적용 가능한, 해당되는"},
  {word:"appoint",        meaning:"임명하다, 지정하다"},
  {word:"appreciate",     meaning:"감사하다, 가치를 인정하다"},
  {word:"appropriate",    meaning:"적절한, 알맞은"},
  {word:"approximately",  meaning:"대략, 약"},
  {word:"arbitration",    meaning:"중재, 조정"},
  {word:"asset",          meaning:"자산, 재산"},
  {word:"assess",         meaning:"평가하다, 산정하다"},
  {word:"assign",         meaning:"할당하다, 배정하다"},
  {word:"assumption",     meaning:"가정, 전제"},
  {word:"attain",         meaning:"달성하다, 이루다"},
  {word:"audit",          meaning:"감사; 감사하다"},
  {word:"authorize",      meaning:"승인하다, 권한을 부여하다"},
  {word:"available",      meaning:"이용 가능한, 구할 수 있는"},
  // B
  {word:"benchmark",      meaning:"기준, 척도; 기준으로 삼다"},
  {word:"beneficial",     meaning:"유익한, 이로운"},
  {word:"board",          meaning:"이사회; 탑승하다"},
  {word:"bond",           meaning:"채권; 유대, 결합"},
  {word:"brainstorm",     meaning:"브레인스토밍하다"},
  {word:"breakeven",      meaning:"손익 분기점"},
  {word:"brief",          meaning:"간단한; 요약하다"},
  {word:"budget",         meaning:"예산; 예산을 세우다"},
  // C
  {word:"calculate",      meaning:"계산하다, 추정하다"},
  {word:"calibrate",      meaning:"보정하다, 맞추다"},
  {word:"candidate",      meaning:"후보자, 지원자"},
  {word:"capacity",       meaning:"수용력, 능력, 용량"},
  {word:"cascade",        meaning:"연속 효과; 흘러내리다"},
  {word:"catalyst",       meaning:"촉매, 촉진제"},
  {word:"category",       meaning:"범주, 분류"},
  {word:"certify",        meaning:"증명하다, 인증하다"},
  {word:"charter",        meaning:"설립 허가서; 전세하다"},
  {word:"circulate",      meaning:"순환하다, 배포하다"},
  {word:"clarify",        meaning:"명확히 하다, 설명하다"},
  {word:"co-author",      meaning:"공동 저자"},
  {word:"coherent",       meaning:"일관된, 논리적인"},
  {word:"collaborate",    meaning:"협력하다, 공동 작업하다"},
  {word:"commodity",      meaning:"상품, 일용품"},
  {word:"compile",        meaning:"편집하다, 수집하다"},
  {word:"comply",         meaning:"따르다, 준수하다"},
  {word:"comprehensive",  meaning:"포괄적인, 종합적인"},
  {word:"concentrate",    meaning:"집중하다, 농축하다"},
  {word:"concession",     meaning:"양보, 특허권"},
  {word:"concur",         meaning:"동의하다, 일치하다"},
  {word:"confiscate",     meaning:"몰수하다, 압수하다"},
  {word:"confirm",        meaning:"확인하다, 확정하다"},
  {word:"considerable",   meaning:"상당한, 중요한"},
  {word:"consistently",   meaning:"일관되게, 꾸준히"},
  {word:"consolidate",    meaning:"통합하다, 강화하다"},
  {word:"consortium",     meaning:"컨소시엄, 협회"},
  {word:"contingency",    meaning:"우발 상황"},
  {word:"contingent",     meaning:"우발적인; 조건부"},
  {word:"contract",       meaning:"계약(서); 계약을 맺다"},
  {word:"contribute",     meaning:"기여하다, 공헌하다"},
  {word:"convenient",     meaning:"편리한, 간편한"},
  {word:"convene",        meaning:"소집하다, 소환하다"},
  {word:"coordinate",     meaning:"조율하다, 조정하다"},
  {word:"copyright",      meaning:"저작권"},
  {word:"corporate",      meaning:"기업의, 법인의"},
  {word:"correspond",     meaning:"일치하다, 서신 왕래하다"},
  {word:"credential",     meaning:"자격증, 신임장"},
  {word:"currently",      meaning:"현재, 지금"},
  // D
  {word:"deadline",       meaning:"마감일, 기한"},
  {word:"decrease",       meaning:"감소하다, 줄다; 감소"},
  {word:"deficit",        meaning:"결손, 부족"},
  {word:"delegate",       meaning:"위임하다; 대표, 대리인"},
  {word:"demonstrate",    meaning:"증명하다, 시연하다"},
  {word:"depreciation",   meaning:"감가상각, 가치 하락"},
  {word:"derivative",     meaning:"파생 상품; 파생된"},
  {word:"determine",      meaning:"결정하다, 판단하다"},
  {word:"deter",          meaning:"단념시키다, 억제하다"},
  {word:"develop",        meaning:"개발하다, 발전시키다"},
  {word:"discretion",     meaning:"재량권, 분별력"},
  {word:"dispatch",       meaning:"발송하다; 급파"},
  {word:"disposition",    meaning:"처분, 성향"},
  {word:"diverse",        meaning:"다양한, 여러 종류의"},
  {word:"document",       meaning:"문서; 기록하다"},
  {word:"downsize",       meaning:"규모를 축소하다"},
  {word:"draft",          meaning:"초안; 초안을 작성하다"},
  // E
  {word:"efficient",      meaning:"효율적인, 능률적인"},
  {word:"eligible",       meaning:"자격이 있는, 적합한"},
  {word:"emphasize",      meaning:"강조하다, 역설하다"},
  {word:"enable",         meaning:"가능하게 하다, 허용하다"},
  {word:"endorse",        meaning:"서명하다, 보증하다"},
  {word:"enhance",        meaning:"향상시키다, 높이다"},
  {word:"ensure",         meaning:"보장하다, 확실히 하다"},
  {word:"equity",         meaning:"지분, 자기 자본; 공정"},
  {word:"escalate",       meaning:"단계적으로 높아지다"},
  {word:"establish",      meaning:"설립하다, 확립하다"},
  {word:"evaluate",       meaning:"평가하다, 검토하다"},
  {word:"exceed",         meaning:"초과하다, 능가하다"},
  {word:"execute",        meaning:"실행하다, 처형하다"},
  {word:"exemplary",      meaning:"모범적인"},
  {word:"exhaustive",     meaning:"철저한, 완전한"},
  {word:"expedite",       meaning:"촉진하다, 신속히 처리하다"},
  {word:"expand",         meaning:"확장하다, 늘리다"},
  {word:"expertise",      meaning:"전문 지식, 전문성"},
  {word:"expose",         meaning:"노출시키다, 드러내다"},
  // F
  {word:"facilitate",     meaning:"용이하게 하다, 촉진하다"},
  {word:"feasibility",    meaning:"타당성, 실현 가능성"},
  {word:"feasible",       meaning:"실현 가능한, 타당한"},
  {word:"finalize",       meaning:"마무리하다, 확정하다"},
  {word:"fluctuation",    meaning:"변동, 파동"},
  {word:"forthcoming",    meaning:"곧 있을, 다가오는"},
  {word:"franchise",      meaning:"프랜차이즈; 선거권"},
  // G
  {word:"gauge",          meaning:"측정하다; 계기"},
  {word:"ground",         meaning:"근거; 기반으로 하다"},
  // I
  {word:"initiative",     meaning:"주도권, 계획"},
  {word:"intangible",     meaning:"무형의, 눈에 보이지 않는"},
  {word:"integral",       meaning:"필수적인, 완전한"},
  {word:"interim",        meaning:"중간의, 임시의"},
  {word:"intrinsic",      meaning:"본질적인, 고유한"},
  // L
  {word:"lapse",          meaning:"경과, 실수; 실효되다"},
  {word:"lucrative",      meaning:"수익성이 좋은"},
  // M
  {word:"meticulous",     meaning:"꼼꼼한, 세심한"},
  // N
  {word:"nominal",        meaning:"명목상의, 미미한"},
  // O
  {word:"obsolete",       meaning:"구식의, 더 이상 쓸모없는"},
  // P
  {word:"paramount",      meaning:"가장 중요한, 최고의"},
  {word:"parity",         meaning:"동등, 균형"},
  {word:"perpetual",      meaning:"영구적인, 지속적인"},
  {word:"preliminary",    meaning:"예비의, 준비의"},
  {word:"premise",        meaning:"전제; 구내"},
  {word:"proactive",      meaning:"능동적인, 사전 예방적인"},
  {word:"proficiency",    meaning:"능숙함, 유창함"},
  {word:"prohibit",       meaning:"금지하다"},
  {word:"projection",     meaning:"예측, 전망, 투영"},
  {word:"proofread",      meaning:"교정하다"},
  {word:"proprietary",    meaning:"소유권의, 독점적인"},
  {word:"prototype",      meaning:"원형, 시제품"},
  {word:"provision",      meaning:"조항, 규정; 공급"},
  {word:"proximity",      meaning:"근접성, 인접"},
  {word:"pursue",         meaning:"추구하다, 쫓다"},
  // Q
  {word:"quantify",       meaning:"정량화하다"},
  {word:"query",          meaning:"질문; 질의하다"},
  {word:"quota",          meaning:"할당량, 쿼터"},
  // R
  {word:"ratify",         meaning:"비준하다, 승인하다"},
  {word:"reallocation",   meaning:"재배분, 재할당"},
  {word:"receipt",        meaning:"영수증, 수령"},
  {word:"reconcile",      meaning:"조화시키다, 화해시키다"},
  {word:"redundancy",     meaning:"중복, 잉여, 정리해고"},
  {word:"refund",         meaning:"환불; 환불하다"},
  {word:"reimburse",      meaning:"상환하다, 변제하다"},
  {word:"reinforce",      meaning:"강화하다, 보강하다"},
  {word:"relocate",       meaning:"이전하다, 이동하다"},
  {word:"remittance",     meaning:"송금, 입금"},
  {word:"remunerate",     meaning:"보수를 주다"},
  {word:"replenish",      meaning:"보충하다, 다시 채우다"},
  {word:"replicate",      meaning:"복제하다, 반복하다"},
  {word:"report",         meaning:"보고하다; 보고서"},
  {word:"represent",      meaning:"대표하다, 나타내다"},
  {word:"reschedule",     meaning:"일정을 변경하다"},
  {word:"resilient",      meaning:"회복력 있는, 탄력적인"},
  {word:"restrict",       meaning:"제한하다, 규제하다"},
  {word:"restructure",    meaning:"구조 조정하다"},
  {word:"retain",         meaning:"유지하다, 보유하다"},
  {word:"retrospective",  meaning:"소급적인; 회고"},
  {word:"rigorous",       meaning:"엄격한, 철저한"},
  {word:"robust",         meaning:"강건한, 견고한"},
  // S
  {word:"sanction",       meaning:"제재; 승인하다"},
  {word:"scalable",       meaning:"확장 가능한"},
  {word:"scrutinize",     meaning:"면밀히 검토하다"},
  {word:"scrutiny",       meaning:"면밀한 검토, 조사"},
  {word:"seamless",       meaning:"원활한, 매끄러운"},
  {word:"sector",         meaning:"분야, 부문"},
  {word:"segment",        meaning:"구분하다; 구분, 세그먼트"},
  {word:"sequential",     meaning:"순차적인"},
  {word:"settlement",     meaning:"해결, 정산, 결제"},
  {word:"shareholder",    meaning:"주주"},
  {word:"shortage",       meaning:"부족, 결핍"},
  {word:"simulate",       meaning:"모의 실험하다, 모방하다"},
  {word:"solicitation",   meaning:"권유, 청원"},
  {word:"specification",  meaning:"명세서, 사양"},
  {word:"stakeholder",    meaning:"이해관계자"},
  {word:"standardize",    meaning:"표준화하다"},
  {word:"statute",        meaning:"법령, 규정"},
  {word:"streamline",     meaning:"간소화하다, 효율화하다"},
  {word:"stringent",      meaning:"엄격한, 까다로운"},
  {word:"subordinate",    meaning:"부하, 하위의"},
  {word:"subsidize",      meaning:"보조금을 주다"},
  {word:"substantial",    meaning:"상당한, 실질적인"},
  {word:"succession",     meaning:"연속, 승계"},
  {word:"successively",   meaning:"연속해서, 잇달아"},
  {word:"surplus",        meaning:"잉여, 흑자"},
  {word:"suspend",        meaning:"중단하다, 정지시키다"},
  {word:"synergy",        meaning:"시너지, 상승효과"},
  {word:"systematic",     meaning:"체계적인, 조직적인"},
  // T
  {word:"tactical",       meaning:"전술적인"},
  {word:"tangible",       meaning:"유형의, 실제적인"},
  {word:"tariff",         meaning:"관세, 요금표"},
  {word:"taskforce",      meaning:"특별팀, 태스크포스"},
  {word:"technical",      meaning:"기술적인, 전문적인"},
  {word:"tenure",         meaning:"재직 기간, 임기"},
  {word:"threshold",      meaning:"임계값, 한계점"},
  {word:"timeline",       meaning:"일정표, 연대표"},
  {word:"transaction",    meaning:"거래, 처리"},
  {word:"transition",     meaning:"전환, 이행"},
  {word:"transparent",    meaning:"투명한, 솔직한"},
  {word:"turnaround",     meaning:"방향 전환, 회복"},
  {word:"turnover",       meaning:"이직률, 매출액"},
  // U
  {word:"unanimous",      meaning:"만장일치의"},
  {word:"undermine",      meaning:"약화시키다, 훼손하다"},
  {word:"uniform",        meaning:"균일한, 통일된; 제복"},
  {word:"unilateral",     meaning:"일방적인"},
  {word:"unprecedented",  meaning:"전례 없는"},
  {word:"update",         meaning:"업데이트하다; 최신 정보"},
  {word:"upgrade",        meaning:"업그레이드하다, 향상시키다"},
  {word:"urgency",        meaning:"긴급함, 시급성"},
  // V
  {word:"vacancy",        meaning:"공석, 빈자리"},
  {word:"variance",       meaning:"차이, 변동"},
  {word:"vendor",         meaning:"판매자, 공급업체"},
  {word:"venture",        meaning:"모험; 벤처 사업"},
  {word:"versatile",      meaning:"다재다능한, 다용도의"},
  {word:"vested",         meaning:"기득권이 있는, 확정된"},
  {word:"viable",         meaning:"실행 가능한"},
  {word:"visibility",     meaning:"가시성, 인지도"},
  {word:"vital",          meaning:"필수적인, 생명의"},
  {word:"volume",         meaning:"양, 용량, 권"},
  {word:"vulnerability",  meaning:"취약성, 약점"},
  // W
  {word:"waive",          meaning:"포기하다, 면제하다"},
  {word:"warranty",       meaning:"보증, 품질 보증"},
  {word:"wholesale",      meaning:"도매; 대규모의"},
  {word:"workforce",      meaning:"노동력, 인력"},
  {word:"workload",       meaning:"업무량, 작업 부하"},
  // Y
  {word:"yield",          meaning:"산출량; 양보하다, 생산하다"},
];
