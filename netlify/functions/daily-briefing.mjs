// netlify/functions/daily-briefing.mjs
// 매일 KST 08:50 자동 실행 (UTC 23:50)

const SYSTEM_PROMPT = `You are a Korean financial analyst. Use web search to find today's market data, then output ONLY a JSON object.

CRITICAL: Your entire response must be parseable by JSON.parse(). 

JSON structure:
{"headline":"...","sections":[{"title":"세계정세","summary":"...","lines":["...","...","..."]},{"title":"한국증시","summary":"...","lines":["...","...","..."]},{"title":"미장지수","summary":"...","lines":["...","...","..."]},{"title":"선물파생","summary":"...","lines":["...","...","..."]},{"title":"금리환율유가","summary":"...","lines":["...","...","..."]},{"title":"포트폴리오","summary":"...","lines":["...","...","...","...","...","...","..."]}]}

RULES FOR JSON STRINGS (violations will break parsing):
- Use ONLY plain Korean and numbers in string values
- FORBIDDEN characters inside strings: " (quote) \\ (backslash) newline tab
- FORBIDDEN symbols: % · — $ + * [ ] { } | < > ^ ~
- Use these SAFE alternatives: % -> 퍼센트, — -> 에서, · -> 와, / -> 대비, + -> 플러스
- headline: max 50 chars
- summary: max 35 chars  
- each line: max 40 chars
- No 결론: prefix
- Numbers only: use digits and Korean units (조 억 만 원)

Portfolio to analyze (do not mention 한독):
삼성전자4주 삼성전자우4주 KODEX200 30주 현대건설4주
한화에어로2주 한화시스템15주(매수중단) TIGER코리아AI전력기기90주
SOL원자력SMR10주 TIGER원자력40주(신중) 버크셔B 0.3956주 예수금210만원

Search today's data then respond with ONLY the JSON object. No markdown, no explanation.`;

// JSON 문자열 값 내 위험 문자 제거
function sanitizeJsonStrings(raw) {
  // JSON string 값 내부만 정리 (키는 건드리지 않음)
  return raw.replace(/:\s*"((?:[^"\\]|\\.)*)"/g, (match, val) => {
    const safe = val
      .replace(/\\/g, '')           // 백슬래시 제거
      .replace(/[\n\r\t]/g, ' ')    // 개행/탭 → 공백
      .replace(/[\u0000-\u001F\u007F]/g, '')  // 제어문자 제거
      .replace(/"/g, '')            // 따옴표 제거
      .replace(/\s+/g, ' ')         // 연속 공백 정리
      .trim();
    return `: "${safe}"`;
  });
}

export default async () => {
  try {
    const kstDate = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    const kstDateKR = new Date().toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long",
    });

    console.log(`브리핑 생성 시작: ${kstDate}`);

    // ── 1. Claude API ────────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2500,        // 1200 → 2500: web_search 토큰 소비 후에도 충분한 여유
        system: SYSTEM_PROMPT,
        tools: [{
          type: "web_search_20250305",
          name: "web_search",
        }],
        messages: [{
          role: "user",
          content: `${kstDateKR} 오늘의 한국 미국 주식시장 데이터를 검색하고 JSON으로 응답해.`,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const e = await claudeRes.text();
      throw new Error(`Claude API error ${claudeRes.status}: ${e}`);
    }

    const claudeData = await claudeRes.json();

    // max_tokens 도달 시 JSON이 잘려서 파싱 불가 → 명확한 오류 처리
    if (claudeData.stop_reason === "max_tokens") {
      throw new Error("응답이 max_tokens에서 잘림. 토큰을 더 늘리거나 섹션을 줄여야 합니다.");
    }

    // web_search 사용 시 text 블록만 추출
    const rawText = claudeData.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    console.log(`원문 길이: ${rawText.length}자`);

    // ── 2. JSON 추출 ─────────────────────────────────────
    const jsonStart = rawText.indexOf("{");
    const jsonEnd   = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`JSON 없음. 원문 앞부분: ${rawText.slice(0, 150)}`);
    }

    let clean = rawText.slice(jsonStart, jsonEnd + 1);

    // ── 3. JSON 파싱 (3단계 시도) ────────────────────────
    let briefing;

    // 1차: 기본 정리 후 파싱
    try {
      const pass1 = clean
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\n|\r|\t/g, ' ');
      briefing = JSON.parse(pass1);
    } catch (_) {
      // 2차: 문자열 값 내부 sanitize 후 파싱
      try {
        const pass2 = sanitizeJsonStrings(
          clean.replace(/[\u0000-\u001F\u007F]/g, ' ')
        );
        briefing = JSON.parse(pass2);
      } catch (_2) {
        // 3차: 모든 비ASCII 아닌 특수문자 제거 후 파싱
        try {
          const pass3 = clean
            .replace(/[\u0000-\u001F\u007F]/g, ' ')
            .replace(/\\(?!["\\/bfnrtu])/g, '')   // 잘못된 이스케이프 제거
            .replace(/([^\\])"/g, (m, p) => p === ':' || p === ',' || p === '[' || p === '{' ? m : p + '\\"');
          briefing = JSON.parse(pass3);
        } catch (e3) {
          throw new Error(`JSON 파싱 3회 모두 실패: ${e3.message} | 원문(0~300): ${clean.slice(0, 300)}`);
        }
      }
    }

    // ── 4. 검증 ──────────────────────────────────────────
    if (!briefing.headline || !Array.isArray(briefing.sections)) {
      throw new Error("JSON 구조 오류: headline 또는 sections 없음");
    }
    if (briefing.sections.length < 3) {
      throw new Error(`섹션 수 부족: ${briefing.sections.length}개`);
    }

    const totalChars =
      (briefing.headline?.length || 0) +
      (briefing.sections || []).flatMap(s => [s.summary||"", ...(s.lines||[])]).join("").length;
    console.log(`글자 수: ${totalChars}자, 섹션: ${briefing.sections.length}개`);

    // ── 5. Supabase 저장 ─────────────────────────────────
    const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const supabaseRes = await fetch(`${baseUrl}/rest/v1/briefings`, {
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

    if (!supabaseRes.ok) {
      const e = await supabaseRes.text();
      throw new Error(`Supabase error ${supabaseRes.status}: ${e}`);
    }

    console.log(`브리핑 저장 완료: ${kstDate}`);
    return new Response(
      JSON.stringify({ ok: true, date: kstDate, chars: totalChars }),
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

export const config = {
  schedule: "50 23 * * *",
};
