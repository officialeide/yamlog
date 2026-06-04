// netlify/functions/daily-briefing.mjs
// 매일 KST 08:50 자동 실행 (UTC 23:50)

const SYSTEM_PROMPT = `당신은 매일 아침 간결한 주식·경제 브리핑을 제공하는 애널리스트입니다.

[출력 형식 — 반드시 아래 JSON 구조로만 응답. JSON 외 텍스트 절대 금지]
{
  "headline": "오늘 핵심 한 줄 (100자 이내)",
  "sections": [
    { "title": "세계정세",       "summary": "두괄식 요약 한 문장 50자 이내", "lines": ["항목1", "항목2", "항목3"] },
    { "title": "한국 증시",      "summary": "...", "lines": ["...", "...", "..."] },
    { "title": "미장 지수",      "summary": "...", "lines": ["...", "...", "..."] },
    { "title": "선물·파생",      "summary": "...", "lines": ["...", "...", "..."] },
    { "title": "금리·환율·유가", "summary": "...", "lines": ["...", "...", "..."] },
    { "title": "포트폴리오 영향","summary": "...", "lines": ["...", "...", "...", "...", "...", "...", "..."] }
  ]
}

[규칙]
- 각 섹션 summary: 50자 이내 두괄식 한 문장
- 각 섹션 lines: 항목당 30~60자, 섹션당 3개 (포트폴리오만 7개)
- headline: 반드시 100자 이내
- "결론:" 절대 쓰지 말 것
- 과도한 낙관 금지, 비판적 시각 유지
- 분석이 틀리면 솔직하게 인정
- 질문 정교함이 판단에 영향을 주지 말 것
- JSON 외 다른 텍스트 절대 출력 금지 (마크다운 백틱도 금지)

[포트폴리오]
삼성전자 4주 / 삼성전자우 4주 / KODEX 200 30주 / 현대건설 4주
한화에어로스페이스 2주 / 한화시스템 15주
TIGER 코리아AI전력기기TOP3플러스 90주
SOL 한국원자력SMR 10주 / TIGER 코리아원자력 40주
버크셔 해서웨이 B 0.3956주 / 예수금 약 210만원
한독 69주 — 장기보유, 절대 언급 금지

[추가 체크 항목]
- 삼성전자·SK하이닉스 레버리지 ETF 수급 (전날 변동 클 때)
- 국민연금 리밸런싱 동향 (주 1회)
- KS200 선물 외인 포지션 및 베이시스

[기타 규칙]
- 한화시스템 추가 매수 중단
- 원전 ETF 추가 매수 신중하게`;

export default async () => {
  try {
    // ── KST 오늘 날짜 (YYYY-MM-DD) ──────────────────────
    const kstDate = new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    });

    const kstDateKR = new Date().toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    console.log(`브리핑 생성 시작: ${kstDate}`);

    // ── 1. Claude API 호출 ──────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `오늘 날짜: ${kstDateKR}\n오늘의 경제·증시 브리핑을 JSON 형식으로 작성해줘.`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content[0].text.trim();

    // ── 2. JSON 파싱 ─────────────────────────────────────
    const clean = rawText.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
    let briefing;
    try {
      briefing = JSON.parse(clean);
    } catch (e) {
      throw new Error(`JSON 파싱 실패: ${e.message}\n원문: ${clean.slice(0, 200)}`);
    }

    // ── 3. 글자 수 검증 ──────────────────────────────────
    const totalChars =
      (briefing.headline?.length || 0) +
      (briefing.sections || [])
        .map((s) => (s.summary || "") + (s.lines || []).join(""))
        .join("").length;

    console.log(`글자 수: ${totalChars}자`);
    if (totalChars > 1000) {
      console.warn(`글자 수 초과: ${totalChars}자`);
    }

    // ── 4. Supabase 저장 ─────────────────────────────────
    const supabaseRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/briefings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          Prefer: "resolution=merge-duplicates",  // 같은 날짜면 덮어쓰기
        },
        body: JSON.stringify({
          date: kstDate,
          headline: briefing.headline,
          sections: briefing.sections,
          created_at: new Date().toISOString(),
        }),
      }
    );

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      throw new Error(`Supabase error ${supabaseRes.status}: ${errText}`);
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
  schedule: "50 23 * * *", // UTC 23:50 = KST 08:50
};
