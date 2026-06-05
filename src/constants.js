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
  { id:"health",  label:"건강", color:"#2E6FA5", bg:"#E8F2FA", text:"#1A4E7A" },
  { id:"economy", label:"경제", color:"#3A52A0", bg:"#EAECF8", text:"#243580" },
  { id:"review",  label:"리뷰", color:"#7E4FA0", bg:"#F3EBF8", text:"#5A2E80" },
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

// ── View constants ──────────────────────────────────
export const VIEWS     = ["주","월","년"];
export const WEEKDAYS  = ["일","월","화","수","목","금","토"];
export const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
export const HOURS     = Array.from({length:24},(_,i)=>i);

// ── Today (module load time) ────────────────────────
export const today = new Date();

// ── Helper functions ────────────────────────────────
/** 로컬 타임존 기준 YYYY-MM-DD 문자열 */
export const dateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

/** 카테고리/서브카테고리로 색상 객체 반환 */
export const allCatOf = (category, sub_category) => {
  if (category === "archive" && sub_category) {
    return ARCHIVE_SUBS.find(s => s.id === sub_category)
        || CATS.find(c => c.id === "archive")
        || CATS[0];
  }
  return CATS.find(c => c.id === category) || CATS[0];
};
export const catOf = (category, sub) => allCatOf(category, sub);

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

// ── TOEIC Word Bank (100개) ─────────────────────────
export const TOEIC_WORDS = [
  {word:"abandon",       meaning:"포기하다, 버리다"},
  {word:"accelerate",    meaning:"가속하다, 촉진하다"},
  {word:"accommodate",   meaning:"수용하다, 편의를 제공하다"},
  {word:"accomplish",    meaning:"성취하다, 완수하다"},
  {word:"acquire",       meaning:"획득하다, 습득하다"},
  {word:"adjacent",      meaning:"인접한, 근접한"},
  {word:"allocate",      meaning:"할당하다, 배분하다"},
  {word:"anticipate",    meaning:"예상하다, 기대하다"},
  {word:"apparent",      meaning:"명백한, 외견상의"},
  {word:"appreciate",    meaning:"감사하다, 가치를 인정하다"},
  {word:"appropriate",   meaning:"적절한, 알맞은"},
  {word:"approximately", meaning:"대략, 약"},
  {word:"authorize",     meaning:"승인하다, 권한을 부여하다"},
  {word:"available",     meaning:"이용 가능한, 구할 수 있는"},
  {word:"beneficial",    meaning:"유익한, 이로운"},
  {word:"brief",         meaning:"간단한, 짧은; 요약하다"},
  {word:"budget",        meaning:"예산; 예산을 세우다"},
  {word:"calculate",     meaning:"계산하다, 추정하다"},
  {word:"candidate",     meaning:"후보자, 지원자"},
  {word:"capacity",      meaning:"수용력, 능력, 용량"},
  {word:"category",      meaning:"범주, 분류"},
  {word:"circumstances", meaning:"상황, 환경"},
  {word:"collaborate",   meaning:"협력하다, 공동 작업하다"},
  {word:"communicate",   meaning:"의사소통하다, 전달하다"},
  {word:"compensation",  meaning:"보상, 급여, 보수"},
  {word:"competitive",   meaning:"경쟁적인, 경쟁력 있는"},
  {word:"complete",      meaning:"완료하다, 완성하다; 완전한"},
  {word:"comply",        meaning:"따르다, 준수하다"},
  {word:"concentrate",   meaning:"집중하다, 농축하다"},
  {word:"confirm",       meaning:"확인하다, 확정하다"},
  {word:"considerable",  meaning:"상당한, 중요한"},
  {word:"consistently",  meaning:"일관되게, 꾸준히"},
  {word:"contract",      meaning:"계약(서); 계약을 맺다"},
  {word:"contribute",    meaning:"기여하다, 공헌하다"},
  {word:"convenient",    meaning:"편리한, 간편한"},
  {word:"coordinate",    meaning:"조율하다, 조정하다"},
  {word:"corporate",     meaning:"기업의, 법인의"},
  {word:"currently",     meaning:"현재, 지금"},
  {word:"deadline",      meaning:"마감일, 기한"},
  {word:"decrease",      meaning:"감소하다, 줄다; 감소"},
  {word:"delegate",      meaning:"위임하다; 대표, 대리인"},
  {word:"demonstrate",   meaning:"증명하다, 시연하다"},
  {word:"determine",     meaning:"결정하다, 판단하다"},
  {word:"develop",       meaning:"개발하다, 발전시키다"},
  {word:"diverse",       meaning:"다양한, 여러 종류의"},
  {word:"document",      meaning:"문서; 기록하다"},
  {word:"efficient",     meaning:"효율적인, 능률적인"},
  {word:"eligible",      meaning:"자격이 있는, 적합한"},
  {word:"emphasize",     meaning:"강조하다, 역설하다"},
  {word:"enable",        meaning:"가능하게 하다, 허용하다"},
  {word:"enhance",       meaning:"향상시키다, 높이다"},
  {word:"ensure",        meaning:"보장하다, 확실히 하다"},
  {word:"establish",     meaning:"설립하다, 확립하다"},
  {word:"evaluate",      meaning:"평가하다, 검토하다"},
  {word:"exceed",        meaning:"초과하다, 능가하다"},
  {word:"expand",        meaning:"확장하다, 늘리다"},
  {word:"expertise",     meaning:"전문 지식, 전문성"},
  {word:"facilitate",    meaning:"용이하게 하다, 촉진하다"},
  {word:"flexible",      meaning:"유연한, 융통성 있는"},
  {word:"forecast",      meaning:"예측하다; 예보, 전망"},
  {word:"generate",      meaning:"생성하다, 일으키다"},
  {word:"genuine",       meaning:"진짜의, 진정한"},
  {word:"guarantee",     meaning:"보장하다; 보증"},
  {word:"identify",      meaning:"확인하다, 파악하다"},
  {word:"implement",     meaning:"실행하다, 이행하다"},
  {word:"improve",       meaning:"개선하다, 향상시키다"},
  {word:"indicate",      meaning:"나타내다, 표시하다"},
  {word:"initiative",    meaning:"주도권, 계획, 솔선수범"},
  {word:"integrate",     meaning:"통합하다, 합치다"},
  {word:"inventory",     meaning:"재고, 목록"},
  {word:"investigate",   meaning:"조사하다, 수사하다"},
  {word:"maintain",      meaning:"유지하다, 관리하다"},
  {word:"mandatory",     meaning:"의무적인, 필수의"},
  {word:"manufacture",   meaning:"제조하다; 제조업"},
  {word:"maximize",      meaning:"극대화하다, 최대화하다"},
  {word:"negotiate",     meaning:"협상하다, 교섭하다"},
  {word:"objective",     meaning:"목표, 목적; 객관적인"},
  {word:"obtain",        meaning:"얻다, 획득하다"},
  {word:"operate",       meaning:"운영하다, 작동하다"},
  {word:"organize",      meaning:"조직하다, 정리하다"},
  {word:"participate",   meaning:"참가하다, 참여하다"},
  {word:"perform",       meaning:"수행하다, 공연하다"},
  {word:"potential",     meaning:"잠재적인; 가능성, 잠재력"},
  {word:"priority",      meaning:"우선순위, 최우선 사항"},
  {word:"procedure",     meaning:"절차, 과정"},
  {word:"productivity",  meaning:"생산성, 생산력"},
  {word:"promote",       meaning:"촉진하다, 승진시키다"},
  {word:"proposal",      meaning:"제안, 제의"},
  {word:"qualify",       meaning:"자격을 갖추다, 적합하다"},
  {word:"recommend",     meaning:"추천하다, 권장하다"},
  {word:"recruit",       meaning:"채용하다; 신입, 신병"},
  {word:"relevant",      meaning:"관련된, 적절한"},
  {word:"require",       meaning:"필요로 하다, 요구하다"},
  {word:"revenue",       meaning:"수익, 수입"},
  {word:"schedule",      meaning:"일정; 계획하다, 예정하다"},
  {word:"significant",   meaning:"중요한, 상당한"},
  {word:"strategy",      meaning:"전략, 방략"},
  {word:"sufficient",    meaning:"충분한, 족한"},
  {word:"sustainable",   meaning:"지속 가능한"},
  {word:"thoroughly",    meaning:"철저히, 완전히"},
  {word:"transfer",      meaning:"이전하다, 옮기다; 이전"},
];
