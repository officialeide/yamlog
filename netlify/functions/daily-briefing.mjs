// netlify/functions/daily-briefing.mjs
// 매일 KST 08:55 자동 실행 (UTC 23:55 전날)

const SYSTEM_PROMPT = `You are a Korean news and financial analyst. Use web search to find major overnight events (wars, accidents, political developments, economic news) that happened since yesterday evening KST, and analyze their market impact. Output ONLY a JSON object.

CRITICAL: Your entire response must be parseable by JSON.parse(). 

JSON structure:
{"headline":"...","sections":[{"title":"세계정세","summary":"...","lines":["...","...","..."]},{"title":"한국증시","summary":"...","lines":["...","...","..."]},{"title":"미장지수","summary":"...","lines":["...","...","..."]},{"title":"선물파생","summary":"...","lines":["...","...","..."]},{"title":"금리환율유가","summary":"...","lines":["...","...","..."]},{"title":"포트폴리오","summary":"...","lines":["...","...","...","...","...","...","..."]},{"title":"요약","summary":"...","lines":["...","...","...","..."]}]}

SECTION GUIDANCE:
- 세계정세: 밤사이 주요 세계 정세(전쟁, 외교, 사고, 정치경제 이슈) 요약
- 한국증시: 위 정세가 오늘 국장(코스피/코스닥)에 미칠 영향 예상 (예상 방향, 주목 섹터 등)
- 미장지수: 간밤 미국 주요 지수 흐름 (나스닥 다우 S&P500 중심)
- 선물파생: 간밤 선물시장 동향 및 야간 선물 흐름 (반드시 "선물파생" 타이틀 그대로 사용)
- 금리환율유가: 금리, 환율, 유가 주요 변동
- 포트폴리오: 보유 종목별 오늘 영향 예상
- 요약: 오늘 날짜 기준으로 보유 종목을 섹터별(반도체, 방산, 에너지 원자력, 지수 ETF 등)로 나누고, 세계 정세와 시장 동향에 근거해 각 섹터가 오를지 내릴지 미래지향적으로 전망. 각 line은 "섹터명 ▲ 근거" 또는 "섹터명 ▼ 근거" 또는 "섹터명 - 보합 근거" 형식. ▲는 상승 전망, ▼는 하락 전망. 반드시 "요약" 타이틀 그대로 사용

RULES FOR JSON STRINGS (violations will break parsing):
- Use ONLY plain Korean and numbers in string values
- FORBIDDEN characters inside strings: " (quote) \\ (backslash) newline tab
- FORBIDDEN symbols: % · — $ + * [ ] { } | < > ^ ~
- Safe alternatives: % -> 퍼센트, — -> 에서, · -> 와, / -> 대비, + -> 플러스
- EXCEPTION: ▲ and ▼ are ALLOWED only in the 요약 section lines for direction marks
- headline: max 50 chars, summary: max 35 chars, each line: max 45 chars
- THESE LIMITS ARE HARD LIMITS. Count characters before finishing each string. If a sentence would exceed the limit, shorten it — do NOT let any string exceed the limit under any circumstance
- SPACING: Always put spaces between words. Never concatenate Korean words without spaces (e.g. "미국 이란 재공격" not "미국이란재공격", "중동 긴장 고조" not "중동긴장고조")
- Each line must be a complete readable sentence with proper spacing
- No 결론: prefix. Numbers only with Korean units (조 억 만 원)

Portfolio (do not mention 한독):
삼성전자4주 삼성전자우4주 KODEX200 30주 현대건설4주 에이피알2주
한화에어로2주 한화시스템15주(매수중단) TIGER코리아AI전력기기90주
SOL원자력SMR10주 TIGER원자력40주(신중) 버크셔B 0.3956주 예수금133만원

Search today's data then respond with ONLY the JSON object. No markdown, no explanation.`;

// 글자수 하드 리밋 강제 (모델이 규칙을 어겨도 서버에서 반드시 잘라냄)
const LIMITS = { headline: 50, summary: 35, line: 45 };
function clip(str, max) {
  if (typeof str !== "string") return str;
  return str.length > max ? str.slice(0, max - 1).trim() + "…" : str;
}
function enforceCharLimits(briefing) {
  briefing.headline = clip(briefing.headline, LIMITS.headline);
  (briefing.sections || []).forEach(s => {
    s.summary = clip(s.summary, LIMITS.summary);
    s.lines = (s.lines || []).map(l => clip(l, LIMITS.line));
  });
  return briefing;
}

// JSON 문자열 값 내부 위험 문자 정리
function sanitizeJsonStrings(raw) {
  return raw.replace(/:\s*"((?:[^"\\]|\\.)*)"/g, (_, val) => {
    const safe = val
      .replace(/\\/g, '').replace(/[\n\r\t]/g, ' ')
      .replace(/[\u0000-\u001F\u007F]/g, '').replace(/"/g, '')
      .replace(/\s+/g, ' ').trim();
    return `: "${safe}"`;
  });
}

// Claude 호출 1건당 최대 대기 시간 (ms) — 이 시간을 넘기면 즉시 포기하고 재시도로 넘어감
const CALL_TIMEOUT_MS = 25000;

// Claude API 호출 (재시도 포함)
async function callClaude(kstDateKR, attempt = 1) {
  console.log(`Claude 호출 시도 ${attempt}회`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `${kstDateKR} 기준으로 (1) 간밤 선물시장 동향, (2) 어제 저녁~오늘 새벽 사이 발생한 주요 세계 정세(전쟁, 외교, 사고, 정치경제 이슈)를 검색하고, 이것이 오늘 국장에 미칠 영향을 예상해서 JSON으로 응답해.`,
        }],
      }),
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(`Claude 호출 타임아웃 (${CALL_TIMEOUT_MS}ms 초과)`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const e = await res.text();
    throw new Error(`Claude API ${res.status}: ${e}`);
  }

  const data = await res.json();

  if (data.stop_reason === "max_tokens") {
    throw new Error("max_tokens 초과 — 응답 잘림");
  }

  const rawText = data.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("").trim();

  console.log(`원문 길이: ${rawText.length}자`);
  return rawText;
}

// JSON 추출 및 파싱 (4단계)
function extractJSON(rawText) {
  // 0단계: 마크다운 코드블록 감싸기 제거 (```json ... ``` 또는 ``` ... ```)
  let text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  const jsonStart = text.indexOf("{");
  const jsonEnd   = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`JSON 없음. 원문: ${text.slice(0, 100)}`);
  }
  let clean = text.slice(jsonStart, jsonEnd + 1);

  // 1차: 기본 제어문자 제거
  try {
    return JSON.parse(clean.replace(/[\u0000-\u001F\u007F]/g, ' '));
  } catch(_) {}

  // 2차: 문자열 값 내부 sanitize
  try {
    return JSON.parse(sanitizeJsonStrings(clean.replace(/[\u0000-\u001F\u007F]/g, ' ')));
  } catch(_) {}

  // 3차: 잘못된 이스케이프 제거
  try {
    return JSON.parse(
      clean.replace(/[\u0000-\u001F\u007F]/g, ' ')
           .replace(/\\(?!["\\/bfnrtu])/g, '')
    );
  } catch(e) {
    throw new Error(`JSON 파싱 실패 (3회): ${e.message} | 원문(0~200): ${clean.slice(0,200)}`);
  }
}

// Supabase upsert (on_conflict=date 로 중복 덮어쓰기)
async function saveBriefing(kstDate, briefing) {
  const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  // ?on_conflict=date 파라미터 + merge-duplicates 헤더로 upsert 처리
  const res = await fetch(`${baseUrl}/rest/v1/briefings?on_conflict=date`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      date: kstDate,
      headline: briefing.headline,
      sections: briefing.sections,
      created_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const e = await res.text();
    const hint = res.status === 401
      ? " (SUPABASE_SERVICE_KEY가 anon key로 잘못 설정됐거나 RLS 정책에 service_role bypass가 없을 가능성 — Netlify 환경변수와 Supabase RLS 정책 확인 필요)"
      : "";
    throw new Error(`Supabase ${res.status}: ${e}${hint}`);
  }
}

export default async () => {
  const t0 = Date.now();
  try {
    const kstDate   = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    const kstDateKR = new Date().toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long",
    });
    console.log(`브리핑 생성 시작: ${kstDate}`);

    // Claude 호출 — 최대 3회 시도 (호출당 타임아웃 있어 전체 지연 방지)
    const MAX_ATTEMPTS = 3;
    let rawText;
    let lastErr;
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      try {
        rawText = await callClaude(kstDateKR, i);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        console.warn(`${i}차 실패: ${e.message}${i < MAX_ATTEMPTS ? " — 재시도" : ""}`);
      }
    }
    if (lastErr) throw lastErr;

    // JSON 파싱
    let briefing = extractJSON(rawText);

    // 검증
    if (!briefing.headline || !Array.isArray(briefing.sections) || briefing.sections.length < 3) {
      throw new Error(`구조 오류: headline=${!!briefing.headline}, sections=${briefing.sections?.length}`);
    }

    // 글자수 하드 리밋 강제 적용 (모델 응답과 무관하게 서버에서 보장)
    briefing = enforceCharLimits(briefing);

    const chars = (briefing.headline?.length || 0) +
      (briefing.sections || []).flatMap(s => [s.summary||"", ...(s.lines||[])]).join("").length;
    console.log(`글자 수: ${chars}자, 섹션: ${briefing.sections.length}개`);

    // 저장 (중복 시 덮어쓰기)
    await saveBriefing(kstDate, briefing);
    console.log(`브리핑 저장 완료: ${kstDate}, 총 소요: ${Date.now() - t0}ms`);

    return new Response(
      JSON.stringify({ ok: true, date: kstDate, chars }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(`브리핑 생성 실패 (총 소요: ${Date.now() - t0}ms):`, err.message);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { schedule: "55 23 * * *" };
