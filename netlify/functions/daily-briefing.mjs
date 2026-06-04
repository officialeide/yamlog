// netlify/functions/daily-briefing.mjs
// 매일 KST 08:50 자동 실행 (UTC 23:50)

const SYSTEM_PROMPT = `You are a Korean stock market analyst. Output ONLY a valid JSON object. No markdown, no backticks, no explanation text.

EXACT JSON format (copy this structure):
{"headline":"string","sections":[{"title":"세계정세","summary":"string","lines":["string","string","string"]},{"title":"한국증시","summary":"string","lines":["string","string","string"]},{"title":"미장지수","summary":"string","lines":["string","string","string"]},{"title":"선물파생","summary":"string","lines":["string","string","string"]},{"title":"금리환율유가","summary":"string","lines":["string","string","string"]},{"title":"포트폴리오","summary":"string","lines":["string","string","string","string","string","string","string"]}]}

STRICT RULES:
1. Output ONLY the JSON. Nothing before or after.
2. No newlines inside string values.
3. No special characters inside strings: no · no — no / no quotes. Use space instead.
4. headline: max 60 chars
5. summary: max 40 chars, one sentence
6. lines: max 45 chars each
7. Do NOT write 결론:
8. Be critical. No excessive optimism.

Portfolio (never mention 한독):
삼성전자4주 삼성전자우4주 KODEX200 30주 현대건설4주
한화에어로2주 한화시스템15주(매수중단)
TIGER코리아AI전력기기90주
SOL원자력SMR10주 TIGER원자력40주(신중)
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
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Date: ${kstDateKR}. Output the briefing JSON now.`,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const e = await claudeRes.text();
      throw new Error(`Claude API error ${claudeRes.status}: ${e}`);
    }

    const claudeData = await claudeRes.json();
    let rawText = claudeData.content[0].text.trim();

    // ── 2. { } 사이만 추출 ───────────────────────────────
    const jsonStart = rawText.indexOf("{");
    const jsonEnd   = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`JSON 없음: ${rawText.slice(0, 100)}`);
    }
    const clean = rawText.slice(jsonStart, jsonEnd + 1);

    let briefing;
    try {
      briefing = JSON.parse(clean);
    } catch (e) {
      throw new Error(`JSON 파싱 실패: ${e.message} | ${clean.slice(0, 150)}`);
    }

    // ── 3. 글자 수 ───────────────────────────────────────
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
