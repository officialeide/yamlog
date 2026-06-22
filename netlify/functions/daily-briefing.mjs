// netlify/functions/daily-briefing.mjs
// 매일 KST 08:55 자동 실행 (UTC 23:55 전날)

const SYSTEM_PROMPT = `You are a Korean news and financial analyst. Use web search to find major overnight events (wars, accidents, political developments, economic news) that happened since yesterday evening KST, and analyze their market impact. Output ONLY a JSON object.

CRITICAL: Your entire response must be parseable by JSON.parse(). 

JSON structure:
{"headline":"...","sections":[{"title":"세계정세","summary":"...","lines":["...","...","..."]},{"title":"한국증시","summary":"...","lines":["...","...","..."]},{"title":"미장지수","summary":"...","lines":["...","...","..."]},{"title":"금리환율유가","summary":"...","lines":["...","...","..."]},{"title":"포트폴리오","summary":"...","lines":["...","...","...","...","...","...","..."]}]}

SECTION GUIDANCE:
- 세계정세: 밤사이 주요 세계 정세(전쟁, 외교, 사고, 정치경제 이슈) 요약
- 한국증시: 위 정세가 오늘 국장(코스피/코스닥)에 미칠 영향 예상 (예상 방향, 주목 섹터 등)
- 미장지수: 간밤 선물시장 동향 및 미국 주요 지수 흐름
- 금리환율유가: 금리, 환율, 유가 주요 변동
- 포트폴리오: 보유 종목별 오늘 영향 예상

RULES FOR JSON STRINGS (violations will break parsing):
- Use ONLY plain Korean and numbers in string values
- FORBIDDEN characters inside strings: " (quote) \\ (backslash) newline tab
- FORBIDDEN symbols: % · — $ + * [ ] { } | < > ^ ~
- Safe alternatives: % -> 퍼센트, — -> 에서, · -> 와, / -> 대비, + -> 플러스
- headline: max 50 chars, summary: max 35 chars, each line: max 45 chars
- SPACING: Always put spaces between words. Never concatenate Korean words without spaces (e.g. "미국 이란 재공격" not "미국이란재공격", "중동 긴장 고조" not "중동긴장고조")
- Each line must be a complete readable sentence with proper spacing
- No 결론: prefix. Numbers only with Korean units (조 억 만 원)

Portfolio (do not mention 한독):
삼성전자4주 삼성전자우4주 KODEX200 30주 현대건설4주 에이피알2주
한화에어로2주 한화시스템15주(매수중단) TIGER코리아AI전력기기90주
SOL원자력SMR10주 TIGER원자력40주(신중) 버크셔B 0.3956주 예수금133만원

Search today's data then respond with ONLY the JSON object. No markdown, no explanation.`;

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

// Claude API 호출 (재시도 포함)
async function callClaude(kstDateKR, attempt = 1) {
  console.log(`Claude 호출 시도 ${attempt}회`);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `${kstDateKR} 기준으로 (1) 간밤 선물시장 동향, (2) 어제 저녁~오늘 새벽 사이 발생한 주요 세계 정세(전쟁, 외교, 사고, 정치경제 이슈)를 검색하고, 이것이 오늘 국장에 미칠 영향을 예상해서 JSON으로 응답해.`,
      }],
    }),
  });

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
    throw new Error(`Supabase ${res.status}: ${e}`);
  }
}

export default async () => {
  try {
    const kstDate   = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    const kstDateKR = new Date().toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long",
    });
    console.log(`브리핑 생성 시작: ${kstDate}`);

    // Claude 호출 — 실패 시 1회 자동 재시도
    let rawText;
    try {
      rawText = await callClaude(kstDateKR, 1);
    } catch (e1) {
      console.warn(`1차 실패: ${e1.message} — 재시도`);
      rawText = await callClaude(kstDateKR, 2);
    }

    // JSON 파싱
    const briefing = extractJSON(rawText);

    // 검증
    if (!briefing.headline || !Array.isArray(briefing.sections) || briefing.sections.length < 3) {
      throw new Error(`구조 오류: headline=${!!briefing.headline}, sections=${briefing.sections?.length}`);
    }

    const chars = (briefing.headline?.length || 0) +
      (briefing.sections || []).flatMap(s => [s.summary||"", ...(s.lines||[])]).join("").length;
    console.log(`글자 수: ${chars}자, 섹션: ${briefing.sections.length}개`);

    // 저장 (중복 시 덮어쓰기)
    await saveBriefing(kstDate, briefing);
    console.log(`브리핑 저장 완료: ${kstDate}`);

    return new Response(
      JSON.stringify({ ok: true, date: kstDate, chars }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("브리핑 생성 실패:", err.message);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { schedule: "55 23 * * *" };
