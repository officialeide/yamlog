// netlify/functions/daily-briefing.mjs
// 매일 KST 08:50 자동 실행 (UTC 23:50)

const SYSTEM_PROMPT = `You are a Korean stock market briefing analyst. Respond ONLY with a single valid JSON object. No markdown, no backticks, no explanation, no newlines inside string values.

Output this exact JSON structure:
{"headline":"string","sections":[{"title":"string","summary":"string","lines":["string","string","string"]},{"title":"string","summary":"string","lines":["string","string","string"]},{"title":"string","summary":"string","lines":["string","string","string"]},{"title":"string","summary":"string","lines":["string","string","string"]},{"title":"string","summary":"string","lines":["string","string","string"]},{"title":"string","summary":"string","lines":["string","string","string","string","string","string","string"]}]}

Rules:
- headline: max 80 chars in Korean
- Each summary: max 40 chars in Korean, no comma inside
- Each line: max 50 chars in Korean, no newline, no unescaped quotes
- Section titles must be exactly: 세계정세, 한국증시, 미장지수, 선물파생, 금리환율유가, 포트폴리오
- Do NOT use special chars like · / — inside JSON strings. Use space instead.
- No 결론: prefix
- Be critical, no excessive optimism

Portfolio (DO NOT mention 한독):
삼성전자4주 삼성전자우4주 KODEX200 30주 현대건설4주
한화에어로2주 한화시스템15주(추가매수중단)
TIGER코리아AI전력기기90주 SOL원자력SMR10주 TIGER원자력40주(신중)
버크셔B 0.3956주 예수금210만원`;

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
        messages: [{
          role: "user",
          content: `오늘 날짜: ${kstDateKR}. 브리핑 JSON을 출력해줘.`,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const e = await claudeRes.text();
      throw new Error(`Claude API error ${claudeRes.status}: ${e}`);
    }

    const claudeData = await claudeRes.json();
    let rawText = claudeData.content[0].text.trim();

    // ── 2. JSON 추출 — { } 사이만 뽑기 ─────────────────
    const jsonStart = rawText.indexOf("{");
    const jsonEnd   = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`JSON 괄호 없음. 원문: ${rawText.slice(0, 150)}`);
    }
    const clean = rawText.slice(jsonStart, jsonEnd + 1);

    let briefing;
    try {
      briefing = JSON.parse(clean);
    } catch (e) {
      throw new Error(`JSON 파싱 실패: ${e.message} | 원문: ${clean.slice(0, 200)}`);
    }

    // ── 3. 글자 수 ───────────────────────────────────────
    const totalChars =
      (briefing.headline?.length || 0) +
      (briefing.sections || []).flatMap(s => [s.summary || "", ...(s.lines || [])]).join("").length;
    console.log(`글자 수: ${totalChars}자`);
    if (totalChars > 1000) console.warn(`글자 수 초과: ${totalChars}자`);

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
