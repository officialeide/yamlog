// netlify/functions/daily-briefing.mjs
// 매일 KST 08:50 자동 실행 (UTC 23:50)

const SYSTEM_PROMPT = `You are a Korean financial analyst. Use web search to find today's market data, then output ONLY a JSON object.

CRITICAL: Your entire response must be parseable by JSON.parse(). 

JSON structure:
{"headline":"...","sections":[{"title":"세계정세","summary":"...","lines":["...","...","..."]},{"title":"한국증시","summary":"...","lines":["...","...","..."]},{"title":"미장지수","summary":"...","lines":["...","...","..."]},{"title":"선물파생","summary":"...","lines":["...","...","..."]},{"title":"금리환율유가","summary":"...","lines":["...","...","..."]},{"title":"포트폴리오","summary":"...","lines":["...","...","...","...","...","...","..."]}]}

RULES FOR JSON STRINGS (violations will break parsing):
- Use ONLY plain Korean and numbers in string values
- FORBIDDEN characters inside strings: " (quote) \ (backslash) newline tab
- FORBIDDEN symbols: · — % $ + * [ ] { } | < > ^ ~
- Use these SAFE alternatives: % -> 퍼센트, — -> 에서, · -> 와, / -> 대비
- headline: max 50 chars
- summary: max 35 chars  
- each line: max 40 chars
- No 결론: prefix

Portfolio to analyze (do not mention 한독):
삼성전자4주 삼성전자우4주 KODEX200 30주 현대건설4주
한화에어로2주 한화시스템15주(매수중단) TIGER코리아AI전력기기90주
SOL원자력SMR10주 TIGER원자력40주(신중) 버크셔B 0.3956주 예수금210만원

Search today's data then respond with ONLY the JSON object.`;

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
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1200,
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

    // web_search 사용 시 text 블록만 추출
    const rawText = claudeData.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    // ── 2. JSON 추출 및 파싱 ─────────────────────────────
    const jsonStart = rawText.indexOf("{");
    const jsonEnd   = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`JSON 없음: ${rawText.slice(0, 100)}`);
    }

    let clean = rawText.slice(jsonStart, jsonEnd + 1);

    // 위험한 제어문자 제거
    clean = clean
      .replace(/[\u0000-\u001F\u007F]/g, ' ')  // 제어문자
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ');

    let briefing;
    try {
      briefing = JSON.parse(clean);
    } catch (e1) {
      // 2차 시도: JSON 문자열 안의 따옴표 이스케이프
      try {
        const fixed = clean.replace(/"([^"]*)":/g, (match) => match)
          .replace(/:\s*"([^"]*)"/g, (match, p1) => {
            const escaped = p1.replace(/"/g, '\\"');
            return `: "${escaped}"`;
          });
        briefing = JSON.parse(fixed);
      } catch (e2) {
        throw new Error(`JSON 파싱 실패: ${e1.message} | 원문: ${clean.slice(0, 200)}`);
      }
    }

    // ── 3. 검증 ──────────────────────────────────────────
    if (!briefing.headline || !Array.isArray(briefing.sections)) {
      throw new Error("JSON 구조 오류: headline 또는 sections 없음");
    }

    const totalChars =
      (briefing.headline?.length || 0) +
      (briefing.sections || []).flatMap(s => [s.summary||"", ...(s.lines||[])]).join("").length;
    console.log(`글자 수: ${totalChars}자`);

    // ── 4. Supabase 저장 ─────────────────────────────────
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
