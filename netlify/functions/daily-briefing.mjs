import React, { useState, useMemo, useRef, useEffect } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 오행·간지 기초
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const OC={木:{bg:"#e8f5e0",text:"#2d6a2d",border:"#a5d6a7",chart:"#66bb6a",name:"목(木)"},火:{bg:"#fdecea",text:"#b71c1c",border:"#ef9a9a",chart:"#ef5350",name:"화(火)"},土:{bg:"#fff8e1",text:"#7b5800",border:"#ffe082",chart:"#ffb300",name:"토(土)"},金:{bg:"#f3f3f3",text:"#424242",border:"#cfd8dc",chart:"#90a4ae",name:"금(金)"},水:{bg:"#e3f2fd",text:"#0d47a1",border:"#90caf9",chart:"#42a5f5",name:"수(水)"}};
const GD={갑:{o:"木",y:"양"},을:{o:"木",y:"음"},병:{o:"火",y:"양"},정:{o:"火",y:"음"},무:{o:"土",y:"양"},기:{o:"土",y:"음"},경:{o:"金",y:"양"},신:{o:"金",y:"음"},임:{o:"水",y:"양"},계:{o:"水",y:"음"}};
const JD={자:{o:"水",y:"양"},축:{o:"土",y:"음"},인:{o:"木",y:"양"},묘:{o:"木",y:"음"},진:{o:"土",y:"양"},사:{o:"火",y:"음"},오:{o:"火",y:"양"},미:{o:"土",y:"음"},신:{o:"金",y:"양"},유:{o:"金",y:"음"},술:{o:"土",y:"양"},해:{o:"水",y:"음"}};
const GL=["갑","을","병","정","무","기","경","신","임","계"];
const JL=["자","축","인","묘","진","사","오","미","신","유","술","해"];
const GH=["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const JH=["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const gc=ko=>OC[GD[ko]?.o||"土"];
const jc=ko=>OC[JD[ko]?.o||"土"];
const yyE=(ko,isG)=>(isG?GD:JD)[ko]?.y==="양"?"☀️":"🌙";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 검증된 일주 엔진 BASE=2451551 (2000-01-07=甲子 확정)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BASE=2451551;
function toJDN(y,m,d){const a=Math.floor((14-m)/12),yr=y+4800-a,mo=m+12*a-3;return d+Math.floor((153*mo+2)/5)+365*yr+Math.floor(yr/4)-Math.floor(yr/100)+Math.floor(yr/400)-32045;}
function calcIlju(y,m,d){let i=(toJDN(y,m,d)-BASE)%60;if(i<0)i+=60;return{idx:i,ko:GL[i%10]+JL[i%12],hanja:GH[i%10]+JH[i%12],gan:{ko:GL[i%10],hanja:GH[i%10]},ji:{ko:JL[i%12],hanja:JH[i%12]}};}
function calcBnd(y,m,d,h,min){const std=calcIlju(y,m,d),nd=new Date(y,m-1,d+1),mid=calcIlju(nd.getFullYear(),nd.getMonth()+1,nd.getDate()),tm=h*60+min,inB=tm>=22*60+50&&tm<=23*60+59;return{std,mid,inBoundary:inB&&std.ko!==mid.ko};}

// 세운 계산
function yearToGJ(y){let i=(y-1984)%60;if(i<0)i+=60;return{ko:GL[i%10]+JL[i%12],hanja:GH[i%10]+JH[i%12],gan:{ko:GL[i%10],hanja:GH[i%10]},ji:{ko:JL[i%12],hanja:JH[i%12]}};}
const WB=[2,4,6,8,0,2,4,6,8,0];
function mToGJ(y,m){const yg=yearToGJ(y),b=WB[GL.indexOf(yg.gan.ko)],ji=(m+1)%12,mm=(ji-2+12)%12,g=(b+mm)%10;return{ko:GL[g]+JL[ji],hanja:GH[g]+JH[ji],gan:{ko:GL[g],hanja:GH[g]},ji:{ko:JL[ji],hanja:JH[ji]}};}
const TODAY=new Date(),CY=TODAY.getFullYear(),CM=TODAY.getMonth()+1,CD=TODAY.getDate();
const bYS=()=>Array.from({length:6},(_,i)=>({year:CY+i,...yearToGJ(CY+i),isThis:i===0}));
const bMS=()=>Array.from({length:12},(_,i)=>{const r=CM-1+i,m=(r%12)+1,y=CY+Math.floor(r/12);return{year:y,month:m,...mToGJ(y,m),isThis:i===0};});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 해석 텍스트 DB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// fortuneyam 사주 해석 텍스트 DB
// buildSajuData()에서 참조하는 규칙 기반 텍스트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━ 일간별 성격 기본 설명 ━━
const ILGAN_DESC = {
  갑: {
    core: "甲木(갑목) — 곧게 뻗은 나무처럼 성장 지향적이고 리더십이 강한 타입이에요.",
    strong: "신강 甲木 — 자기 주관이 뚜렷하고 추진력이 강해요. 때로는 고집으로 보이지만 그게 결국 큰 성과를 만들어요.",
    weak: "신약 甲木 — 유연하고 공감력이 높아요. 혼자보다 팀에서 진가가 드러나는 타입이에요.",
    day: { impression: "첫눈에 '이 사람 뭔가 다르다' 싶은 사람이에요. 말이 많지 않아도 존재감이 있어요.", mask: "사회에서는 목표 지향적이고 책임감 강한 사람으로 보여요. 실제로도 그렇지만, 내면의 섬세함은 잘 드러내지 않아요." },
    night: { desire: "지장간에 숨겨진 욕망 — 인정받고 싶은 마음이 강해요. 겉으론 독립적으로 보이지만 깊이 신뢰하는 사람에게는 기대고 싶어해요.", desire2: "목(木)의 재성(財星) 구조 — 내가 먼저 다가가지 않아요. 상대가 먼저 알아봐 주기를 기다리는 타입이에요.", triggers: ["내가 오래 공들인 것을 알아봐 줄 때", "한 번 허락한 사람을 상대가 기억하고 다시 찾을 때", "혼자 해낸 것을 드디어 완성했을 때"], attraction: "방향성이 뚜렷한 사람이에요. 말수는 적지만 행동에 무게가 있어요. 한 번 정하면 끝까지 가는 모습이 매력이에요.", idealType: "강렬하고 자기 세계가 뚜렷한 사람. 나를 자극하고 성장하게 만드는 에너지.", idealType2: "따뜻하고 나의 방향을 지지해주는 사람. 함께 나아가는 파트너십을 원해요." }
  },
  을: {
    core: "乙木(을목) — 바람에 휘어도 부러지지 않는 덩굴처럼 유연하고 생명력이 강한 타입이에요.",
    strong: "신강 乙木 — 자기 페이스가 분명하고 어떤 환경에도 적응하는 능력이 뛰어나요.",
    weak: "신약 乙木 — 감수성이 풍부하고 공감 능력이 탁월해요. 사람들 사이에서 자연스럽게 연결고리가 되는 타입이에요.",
    day: { impression: "부드럽고 친근한 첫인상이에요. 말을 걸기 쉽고 편안한 분위기를 풍겨요.", mask: "사회에서는 협력적이고 조화를 중시하는 사람으로 보여요. 갈등보다 해결을 선택하는 타입이에요." },
    night: { desire: "지장간의 욕망 — 안정적인 관계 속에서 충분히 사랑받고 싶어요. 겉으로는 독립적으로 보여도 내면엔 따뜻한 연결을 갈망해요.", desire2: "을목(乙木)의 재성 구조 — 조용히 다가가지만 한번 마음을 열면 깊이 헌신하는 타입이에요.", triggers: ["오랫동안 내 곁에 있어준 사람이 '고마워'라고 할 때", "내가 만든 것이 누군가의 삶에 실제로 도움이 됐을 때", "혼자만의 공간에서 충분히 쉬고 나서"], attraction: "은은하지만 기억에 남는 매력이에요. 처음엔 평범해 보이지만 알수록 독특한 감성과 세계관이 드러나요.", idealType: "나를 있는 그대로 받아들이는 사람. 강요하지 않고 기다려주는 사람.", idealType2: "함께 있으면 편안하고 대화가 자연스러운 사람. 일상을 함께 쌓아가는 관계를 원해요." }
  },
  병: {
    core: "丙火(병화) — 태양처럼 밝고 따뜻하며, 주변을 환하게 만드는 에너지를 가진 타입이에요.",
    strong: "신강 丙火 — 카리스마가 넘치고 어디서든 중심이 돼요. 에너지가 넘쳐서 주변을 이끄는 자연스러운 리더예요.",
    weak: "신약 丙火 — 따뜻하고 감성적이에요. 사람들에게 온기를 주는 존재지만, 혼자만의 충전 시간도 꼭 필요해요.",
    day: { impression: "환하고 밝은 첫인상이에요. 처음 만나도 오래 알던 사람처럼 편하게 만들어주는 에너지가 있어요.", mask: "사회에서는 긍정적이고 활기찬 사람으로 보여요. 실제로도 그렇지만, 아무도 모르는 고민을 혼자 안고 있는 경우도 많아요." },
    night: { desire: "지장간의 욕망 — 특별한 사람에게 특별한 존재가 되고 싶어요. 모두에게 밝은 태양이지만, 단 한 사람에게만큼은 달이 되고 싶은 마음이에요.", desire2: "병화(丙火)의 재성 구조 — 먼저 다가가지만 진심은 천천히 꺼내요. 성급하게 보이지만 실제로는 매우 신중하게 사람을 선택해요.", triggers: ["내가 특별하게 대해준 사람이 나를 특별하게 대해줄 때", "오랫동안 준비한 것이 빛을 발하는 순간", "믿었던 사람이 나의 기대를 뛰어넘을 때"], attraction: "밝고 따뜻한 에너지 자체가 매력이에요. 함께 있으면 기분이 좋아지고, 세상이 조금 더 활기차게 느껴져요.", idealType: "진지하고 깊이 있는 사람. 나의 밝음 속에 있는 진심을 알아봐 주는 사람.", idealType2: "안정적이고 나를 중심 잡아주는 사람. 에너지가 과해질 때 부드럽게 잡아주는 파트너." }
  },
  정: {
    core: "丁火(정화) — 촛불처럼 작지만 꾸준하고 따뜻한 빛을 내는 타입이에요. 섬세함과 집중력이 강해요.",
    strong: "신강 丁火 — 자기만의 세계가 뚜렷하고 창의성이 풍부해요. 한 가지에 깊이 몰입하는 전문가 기질이에요.",
    weak: "신약 丁火 — 감수성과 직관이 예민해요. 예술·음악·글쓰기 등 창작 영역에서 남다른 재능을 보여요.",
    day: { impression: "조용하지만 인상 깊은 첫인상이에요. 눈빛이 영리하고 말 한 마디에 깊이가 있어요.", mask: "사회에서는 조용하고 신중한 사람으로 보여요. 나서지 않지만 결정적인 순간에 핵심을 짚는 능력이 있어요." },
    night: { desire: "지장간의 욕망 — 완전히 이해받고 싶어요. 표면적인 관계보다 깊고 진짜인 연결을 원해요.", desire2: "정화(丁火)의 감성 구조 — 마음을 여는 데 오래 걸리지만, 한번 열리면 정말 깊이 연결돼요.", triggers: ["내 말의 행간을 읽어주는 사람을 만났을 때", "오랫동안 혼자 간직했던 생각을 드디어 꺼냈을 때", "완성한 작업이 누군가의 마음을 움직였을 때"], attraction: "조용한 카리스마예요. 말수는 적지만 한 마디 한 마디에 무게가 있어요. 오래 알수록 더 매력적인 타입이에요.", idealType: "깊이 있고 진지한 사람. 피상적인 대화보다 진짜 이야기를 나눌 수 있는 사람.", idealType2: "나의 조용함을 편하게 여기는 사람. 침묵도 함께 즐길 수 있는 관계를 원해요." }
  },
  무: {
    core: "戊土(무토) — 큰 산처럼 묵직하고 포용력이 강한 타입이에요. 한번 결심한 것은 끝까지 가요.",
    strong: "신강 戊土 — 압박 속에서 더욱 강해지는 구조예요. 외부 자극이 실력을 끌어올리는 타입이에요.",
    weak: "신약 戊土 — 따뜻하고 배려심이 깊어요. 사람들에게 든든한 지지대가 되어주는 존재예요.",
    day: { impression: "첫눈에 '이 사람 뭔가 있다' 싶은 사람이에요. 말이 많지 않아도 존재감이 있고, 분위기가 차분하고 신뢰감을 줘요.", mask: "사회에서 쓰는 가면은 '차분하고 유능한 사람'. 실제로는 내면에서 많은 것이 요동치고 있지만, 밖으로는 큰 산처럼 안정적으로 보여요." },
    night: { desire: "지장간(地藏干)에 숨겨진 욕망 — 술(戌) 속 정화(丁火)와 신금(辛金). 화(火)가 없는 사주라면 내면 깊숙이 '뜨겁게 인정받고 싶은' 욕구가 있어요. 하지만 먼저 달라붙거나 필요해 보이는 게 싫어서 절대 티를 안 내요.", desire2: "토(土) 일간의 재성 구조 — 내가 먼저 가지러 가지 않아요. 상대가 와야 해요. 그게 나의 방식이에요.", triggers: ["나를 오래 지켜봐 온 사람이 구체적으로 '이 부분이 대단하다'고 알아줄 때", "기대 없이 줬는데 상대가 그걸 기억하고 돌려줄 때", "혼자 오래 붙들고 있던 프로젝트가 드디어 완성됐을 때"], attraction: "상황마다 온도가 달라요. 어떨 땐 따뜻하게 챙겨주다가, 다음 순간엔 아무것도 아닌 것처럼 있어요. 이 낙차(落差)가 상대를 혼란스럽게 만들고, 더 다가오게 만들어요.", idealType: "강렬하고 자기 세계가 뚜렷한 사람. 나를 자극하고 때로는 불편하게 만드는 강한 에너지.", idealType2: "따뜻하고 감정적으로 성숙한 사람. 나의 기복을 담아줄 수 있는 넉넉함. 화(火) 일간(병·정)이 찰떡 궁합이에요." }
  },
  기: {
    core: "己土(기토) — 습토(濕土)처럼 포용력과 공감력이 극도로 높은 타입이에요. 물 위에 뜬 섬처럼 유연하게 중심을 잡아요.",
    strong: "신강 己土 — 자기 페이스를 유지하면서도 주변과 자연스럽게 어우러져요. 조직의 접착제 역할을 해요.",
    weak: "신약 己土 — 공감 능력이 탁월하고 타인의 감정을 빠르게 읽어요. 관계 속에서 에너지를 얻는 타입이에요.",
    day: { impression: "부드럽고 따뜻한 첫인상이에요. 어딘가 편안하고 믿음직한 분위기가 있어요.", mask: "사회에서는 조화롭고 배려심 깊은 사람으로 보여요. 갈등 상황에서 중재자 역할을 자연스럽게 맡는 타입이에요." },
    night: { desire: "지장간의 욕망 — 완전히 편안한 관계를 원해요. 아무것도 연기하지 않아도 되는, 진짜 나를 보여줄 수 있는 사람.", desire2: "기토(己土)의 관계 구조 — 조직·파트너십 속에서 진가가 드러나요. 함께할 때 빛나는 타입이에요.", triggers: ["아무 이유 없이 그냥 좋다고 말해주는 사람", "내가 힘들 때 먼저 알아채 주는 사람", "함께 있을 때 아무것도 안 해도 편안한 관계"], attraction: "편안하고 자연스러운 매력이에요. 함께 있으면 시간 가는 줄 모르고, 헤어지고 나면 또 보고 싶어지는 사람이에요.", idealType: "나를 편하게 해주는 사람. 무거운 이야기도 가볍게 들어줄 수 있는 사람.", idealType2: "안정적이고 믿을 수 있는 사람. 함께 일상을 만들어가는 관계를 원해요." }
  },
  경: {
    core: "庚金(경금) — 단단한 쇠처럼 원칙과 정의를 중시하고, 불의에 타협하지 않는 타입이에요.",
    strong: "신강 庚金 — 추진력과 결단력이 강해요. 목표가 생기면 거침없이 나아가는 실행력이 무기예요.",
    weak: "신약 庚金 — 섬세하고 분석적이에요. 겉은 강해 보여도 속은 매우 예민한 감수성을 가지고 있어요.",
    day: { impression: "날카롭고 카리스마 있는 첫인상이에요. 말 한 마디에 힘이 있고, 존재감이 분명해요.", mask: "사회에서는 원칙적이고 공정한 사람으로 보여요. 규칙을 중시하고 불합리한 것에 쉽게 넘어가지 않는 타입이에요." },
    night: { desire: "지장간의 욕망 — 완벽하게 사랑받고 싶어요. 흠결 없이 받아들여지는 경험을 원해요.", desire2: "경금(庚金)의 감정 구조 — 감정 표현이 서툴지만 그만큼 진심이에요. 표현하기까지 오래 걸릴 뿐이에요.", triggers: ["내 원칙을 존중해주는 사람을 만났을 때", "오래 준비한 것이 드디어 인정받을 때", "믿었던 사람이 끝까지 옆에 있어줄 때"], attraction: "강렬하고 확고한 매력이에요. 흔들리지 않는 중심이 오히려 상대를 끌어당겨요.", idealType: "부드럽고 나의 날카로움을 감싸줄 수 있는 사람. 나와 반대되는 온기를 가진 사람.", idealType2: "신뢰할 수 있고 약속을 지키는 사람. 한번 믿으면 끝까지 가는 관계를 원해요." }
  },
  신: {
    core: "辛金(신금) — 세공된 보석처럼 예민하고 아름다움을 추구하는 타입이에요. 섬세한 감각과 날카로운 통찰력이 있어요.",
    strong: "신강 辛金 — 자기 미학이 뚜렷하고 타협하지 않는 완벽주의자 기질이에요.",
    weak: "신약 辛金 — 감수성이 극도로 예민해요. 아름다운 것에 깊이 감동하고, 추한 것에 깊이 상처받아요.",
    day: { impression: "세련되고 매력적인 첫인상이에요. 무엇인가 특별하고 고급스러운 분위기가 있어요.", mask: "사회에서는 완벽하고 우아한 사람으로 보여요. 실제로는 그 완벽함 뒤에 예민한 감수성이 숨어있어요." },
    night: { desire: "지장간의 욕망 — 완벽하게 아름다운 것을 원해요. 관계도, 일도, 삶도 — 흠 없이 아름답기를 바라는 이상주의적 면이 있어요.", desire2: "신금(辛金)의 감성 구조 — 상처를 쉽게 받지만 그만큼 깊이 사랑해요.", triggers: ["내 감각과 취향을 완전히 이해해주는 사람을 만났을 때", "오랫동안 추구해온 아름다움이 실현됐을 때", "예상치 못한 섬세한 배려를 받았을 때"], attraction: "독특하고 감각적인 매력이에요. 다른 사람들이 놓치는 디테일을 포착하는 눈이 매력이에요.", idealType: "나의 감수성을 이해하고 존중해주는 사람. 함께 아름다운 것을 발견하는 사람.", idealType2: "안정적이고 나의 예민함을 감당해주는 사람. 폭풍 같은 감정도 흔들리지 않고 받아주는 파트너." }
  },
  임: {
    core: "壬水(임수) — 큰 강처럼 흐르며 모든 것을 담는 포용력과 지혜를 가진 타입이에요.",
    strong: "신강 壬水 — 통찰력과 직관이 탁월해요. 전체를 보는 눈이 있고, 큰 그림을 그리는 능력이 있어요.",
    weak: "신약 壬水 — 공감 능력이 깊고 타인의 마음을 잘 읽어요. 섬세한 감수성으로 많은 사람에게 위로가 돼요.",
    day: { impression: "깊고 차분한 첫인상이에요. 말이 많지 않지만 듣고 있다는 느낌을 주고, 함께 있으면 편안해요.", mask: "사회에서는 지적이고 침착한 사람으로 보여요. 감정보다 이성이 앞서는 것처럼 보이지만, 실제로는 매우 감성적이에요." },
    night: { desire: "지장간의 욕망 — 깊이 연결되고 싶어요. 피상적인 관계보다 진짜 이해받는 관계를 원해요.", desire2: "임수(壬水)의 재성 구조 — 흐르듯 자연스럽게 다가가요. 억지가 없고, 관계가 자연스럽게 깊어지는 걸 선호해요.", triggers: ["나의 말 이면을 읽어주는 사람을 만났을 때", "오랫동안 혼자 간직했던 통찰이 현실에서 맞아떨어질 때", "진짜 대화가 되는 순간"], attraction: "깊고 신비로운 매력이에요. 알수록 더 알고 싶어지는, 끝을 알 수 없는 깊이가 있어요.", idealType: "나와 깊은 대화가 되는 사람. 지적인 자극과 감성적인 교감이 동시에 되는 사람.", idealType2: "나의 복잡함을 이해해주는 사람. 함께 있어도 각자의 공간이 존재하는 관계를 원해요." }
  },
  계: {
    core: "癸水(계수) — 이슬처럼 섬세하고 스며드는 방식으로 세상을 이해하는 타입이에요. 직관과 감수성이 극도로 예민해요.",
    strong: "신강 癸水 — 직관력과 통찰력이 뛰어나요. 사람의 마음을 읽는 능력이 탁월해요.",
    weak: "신약 癸水 — 감수성이 매우 풍부해요. 예술·창작·치유 분야에서 남다른 재능을 보여요.",
    day: { impression: "조용하고 신비로운 첫인상이에요. 어딘가 파악이 안 되는 묘한 매력이 있어요.", mask: "사회에서는 조용하고 신중한 사람으로 보여요. 실제로는 내면에서 엄청난 감정과 생각의 파도가 치고 있어요." },
    night: { desire: "지장간의 욕망 — 완전히 이해받고 싶어요. 설명하지 않아도 알아주는 사람, 내 감정의 결을 느끼는 사람.", desire2: "계수(癸水)의 감성 구조 — 천천히, 조용히 스며드는 방식으로 관계를 맺어요. 급하게 가까워지는 것보다 서서히 깊어지는 걸 선호해요.", triggers: ["아무것도 설명하지 않아도 알아주는 사람", "혼자만의 감성 세계를 공유했을 때 진심으로 공감받는 경험", "오랫동안 담아뒀던 감정이 자연스럽게 흘러나왔을 때"], attraction: "신비롭고 잡힐 듯 잡히지 않는 매력이에요. 조용하지만 한번 사로잡히면 헤어나올 수 없는 깊이가 있어요.", idealType: "나의 감성을 섬세하게 받아주는 사람. 말하지 않아도 느끼는 사람.", idealType2: "안정적이고 나의 예민함을 이해하는 사람. 내 변덕스러운 감정을 흔들리지 않고 담아주는 파트너." }
  },
};

// ━━ 오행별 신강/신약 용신 희신 기신 ━━
const YONGSIN_TABLE = {
  木: { strong: { yongsin:"금(金)·화(火)", huisin:"수(水)", gisin:"목(木)·토(土)" }, weak: { yongsin:"수(水)·목(木)", huisin:"화(火)", gisin:"금(金)·토(土)" } },
  火: { strong: { yongsin:"수(水)·토(土)", huisin:"금(金)", gisin:"화(火)·목(木)" }, weak: { yongsin:"목(木)·화(火)", huisin:"토(土)", gisin:"수(水)·금(金)" } },
  土: { strong: { yongsin:"목(木)·수(水)", huisin:"금(金)", gisin:"토(土)·화(火)" }, weak: { yongsin:"화(火)·토(土)", huisin:"목(木)", gisin:"수(水)·금(金)" } },
  金: { strong: { yongsin:"화(火)·수(水)", huisin:"목(木)", gisin:"금(金)·토(土)" }, weak: { yongsin:"토(土)·금(金)", huisin:"화(火)", gisin:"목(木)·수(水)" } },
  水: { strong: { yongsin:"토(土)·목(木)", huisin:"금(金)", gisin:"수(水)·금(金)" }, weak: { yongsin:"금(金)·수(水)", huisin:"토(土)", gisin:"목(木)·화(火)" } },
};

// ━━ 일주 60갑자 특성 ━━
const ILJU_CHAR = {
  갑자:"甲子 일주 — 지혜롭고 활동적이에요. 새로운 시작을 두려워하지 않는 선구자 기질이에요.",
  갑인:"甲寅 일주 — 리더십이 강하고 직설적이에요. 행동이 말보다 앞서는 타입이에요.",
  갑진:"甲辰 일주 — 창의적이고 다재다능해요. 용처럼 거침없이 나아가는 에너지가 있어요.",
  갑오:"甲午 일주 — 열정적이고 카리스마가 넘쳐요. 빠른 판단력과 실행력이 강점이에요.",
  갑신:"甲申 일주 — 영리하고 분석적이에요. 번뜩이는 아이디어와 언변이 뛰어나요.",
  갑술:"甲戌 일주 — 원칙적이고 책임감이 강해요. 한번 결심하면 절대 포기하지 않아요.",
  을축:"乙丑 일주 — 끈기와 인내력이 탁월해요. 느리지만 확실하게 목표를 달성하는 타입이에요.",
  을묘:"乙卯 일주 — 감성이 풍부하고 예술적 재능이 있어요. 섬세하고 우아한 스타일이에요.",
  을사:"乙巳 일주 — 직관력이 예리하고 실용적이에요. 핵심을 빠르게 파악하는 능력이 있어요.",
  을미:"乙未 일주 — 온화하고 배려심이 깊어요. 사람들과 자연스럽게 어울리는 사교적 기질이에요.",
  을유:"乙酉 일주 — 섬세하고 완벽주의 기질이 있어요. 아름다움을 추구하는 심미안이 뛰어나요.",
  을해:"乙亥 일주 — 직관적이고 창의적이에요. 틀에 얽매이지 않는 자유로운 영혼이에요.",
  병자:"丙子 일주 — 활기차고 사교적이에요. 어디서든 분위기를 밝게 만드는 에너지가 있어요.",
  병인:"丙寅 일주 — 도전적이고 패기가 넘쳐요. 새로운 길을 개척하는 것을 즐기는 타입이에요.",
  병진:"丙辰 일주 — 창의력과 카리스마가 공존해요. 넓은 시야로 큰 그림을 그리는 타입이에요.",
  병오:"丙午 일주 — 열정과 에너지가 최고조예요. 화려하고 강렬한 존재감이 있어요.",
  병신:"丙申 일주 — 영리하고 말재주가 뛰어나요. 빠른 두뇌회전으로 상황을 장악하는 타입이에요.",
  병술:"丙戌 일주 — 원칙적이고 의리가 강해요. 한번 맺은 인연을 소중히 여기는 타입이에요.",
  정축:"丁丑 일주 — 묵묵하고 성실해요. 화려하진 않지만 꾸준히 성과를 쌓는 타입이에요.",
  정묘:"丁卯 일주 — 감성적이고 예민해요. 창작과 예술 분야에서 두각을 나타내는 타입이에요.",
  정사:"丁巳 일주 — 지혜롭고 통찰력이 있어요. 보이지 않는 것을 꿰뚫어 보는 능력이 있어요.",
  정미:"丁未 일주 — 따뜻하고 포용력이 있어요. 주변 사람들에게 안정감을 주는 존재예요.",
  정유:"丁酉 일주 — 섬세하고 완벽을 추구해요. 날카로운 분석력과 심미안이 강점이에요.",
  정해:"丁亥 일주 — 직관적이고 감성이 풍부해요. 깊은 내면세계를 가진 타입이에요.",
  무자:"戊子 일주 — 안정 속에서도 끊임없이 움직이는 에너지가 있어요. 현실적이지만 꿈도 크어요.",
  무인:"戊寅 일주 — 추진력과 리더십이 뛰어나요. 도전을 즐기고 위기에서 강해지는 타입이에요.",
  무진:"戊辰 일주 — 카리스마와 포용력을 겸비했어요. 대인 관계가 넓고 영향력이 커요.",
  무오:"戊午 일주 — 열정적이고 강인해요. 어떤 상황에서도 포기하지 않는 강한 의지력이 있어요.",
  무신:"戊申 일주 — 영리하고 임기응변이 탁월해요. 어떤 환경에서도 살아남는 적응력이 있어요.",
  무술:"戊戌 일주 — 묵직하고 강인한 에너지예요. 한번 결심한 것은 산처럼 흔들리지 않아요.",
  기축:"己丑 일주 — 성실하고 끈기 있어요. 천천히 하지만 가장 높은 곳까지 올라가는 타입이에요.",
  기묘:"己卯 일주 — 유연하고 감성적이에요. 사람들 사이에서 자연스럽게 중심을 잡는 타입이에요.",
  기사:"己巳 일주 — 지혜롭고 현실적이에요. 직관과 실용성이 조화를 이루는 타입이에요.",
  기미:"己未 일주 — 따뜻하고 배려심이 깊어요. 주변을 편안하게 만드는 포용력이 있어요.",
  기유:"己酉 일주 — 섬세하고 분석적이에요. 완벽을 추구하며 세부사항에 강한 타입이에요.",
  기해:"己亥 일주 — 직관적이고 포용력이 깊어요. 물처럼 유연하게 상황에 적응하는 타입이에요.",
  경자:"庚子 일주 — 지적이고 활동적이에요. 빠른 판단력과 추진력이 강점이에요.",
  경인:"庚寅 일주 — 도전적이고 강인해요. 두려움 없이 새로운 길을 개척하는 타입이에요.",
  경진:"庚辰 일주 — 카리스마가 넘치고 통솔력이 있어요. 타고난 리더 기질이에요.",
  경오:"庚午 일주 — 열정적이고 직선적이에요. 말과 행동이 일치하는 신뢰감 있는 타입이에요.",
  경신:"庚申 일주 — 날카롭고 결단력이 있어요. 어떤 문제든 핵심을 빠르게 파악하는 능력이에요.",
  경술:"庚戌 일주 — 원칙적이고 의지가 강해요. 정의감이 강하고 불의에 타협하지 않아요.",
  신축:"辛丑 일주 — 인내심이 강하고 착실해요. 꾸준한 노력으로 빛나는 보석이 되는 타입이에요.",
  신묘:"辛卯 일주 — 감성적이고 섬세해요. 예술적 감각과 창의성이 뛰어난 타입이에요.",
  신사:"辛巳 일주 — 지혜롭고 직관적이에요. 번뜩이는 영감과 예리한 통찰력이 있어요.",
  신미:"辛未 일주 — 따뜻하고 세심해요. 주변 사람들의 마음을 잘 읽는 공감 능력이 있어요.",
  신유:"辛酉 일주 — 완벽주의적이고 미적 감각이 뛰어나요. 자기 기준이 높은 타입이에요.",
  신해:"辛亥 일주 — 자유롭고 창의적이에요. 관습에 얽매이지 않는 독창적인 사고를 해요.",
  임자:"壬子 일주 — 지혜롭고 통찰력이 깊어요. 세상의 흐름을 읽는 능력이 탁월해요.",
  임인:"壬寅 일주 — 진취적이고 에너지가 넘쳐요. 새로운 도전을 즐기는 모험가 기질이에요.",
  임진:"壬辰 일주 — 포용력이 크고 카리스마가 있어요. 큰 꿈을 꾸고 실현하는 타입이에요.",
  임오:"壬午 일주 — 열정적이고 매력적이에요. 감성과 이성이 공존하는 복잡한 내면이에요.",
  임신:"壬申 일주 — 영리하고 다재다능해요. 어떤 분야든 빠르게 흡수하는 학습 능력이 있어요.",
  임술:"壬戌 일주 — 신중하고 깊이 있어요. 겉으론 조용하지만 내면에 강한 의지를 품고 있어요.",
  계축:"癸丑 일주 — 꾸준하고 성실해요. 이슬처럼 천천히 스며들어 결국 큰 것을 이루는 타입이에요.",
  계묘:"癸卯 일주 — 감성적이고 창의적이에요. 아름다운 것에 끌리고 예술적 감각이 뛰어나요.",
  계사:"癸巳 일주 — 직관적이고 통찰력이 있어요. 눈에 보이지 않는 것을 감지하는 능력이 있어요.",
  계미:"癸未 일주 — 온화하고 배려심이 깊어요. 자연스럽게 사람들의 마음을 여는 능력이 있어요.",
  계유:"癸酉 일주 — 섬세하고 예민해요. 아름다움과 완벽함을 추구하는 심미안이 있어요.",
  계해:"癸亥 일주 — 깊고 신비로워요. 끝없는 감성의 깊이를 가진, 마지막 수(水)의 완성이에요.",
};

// ━━ 당사주 별성 (전통 표준) ━━
const BYEOLSEONG = {
  자:{name:"귀문성(貴門星)",desc:"총명하고 귀인과 연결되는 문(門)의 별이에요. 사교성이 뛰어나고 도화 기운으로 자연스럽게 인연이 찾아와요."},
  축:{name:"안명성(安命星)",desc:"성실·인내·우직함의 별이에요. 한 우물을 깊이 파는 지구력으로 묵묵히 일하고 천천히 성공하는 기운이에요."},
  인:{name:"천인성(天印星)",desc:"하늘의 도장처럼 권위와 인정을 상징해요. 학문·자격·명예 분야에서 두각을 나타내는 기운이에요."},
  묘:{name:"복성(福星)",desc:"복이 많은 별이에요. 귀인의 도움이 끊이지 않고, 예상치 못한 행운이 찾아오는 기운이에요."},
  진:{name:"문창성(文昌星)",desc:"글과 학문의 별이에요. 언어·글쓰기·공부에서 두각을 나타내고 시험운이 강해요."},
  사:{name:"역마성(驛馬星)",desc:"이동·변화·역동성의 별이에요. 한 곳에 오래 머물기보다 움직이며 성장하는 기운이에요."},
  오:{name:"도화성(桃花星)",desc:"매력과 인기의 별이에요. 타고난 흡인력으로 주변 사람들을 자연스럽게 끌어당기는 기운이에요."},
  미:{name:"화개성(華蓋星)",desc:"예술·종교·철학의 별이에요. 창의적 감성과 영적 직관이 뛰어난 기운이에요."},
  신:{name:"총명성(聰明星)",desc:"뛰어난 지혜와 임기응변, 다재다능함의 별이에요. 손재주와 창의적 문제 해결력이 탁월해요."},
  유:{name:"고독성(孤獨星)",desc:"독립과 자립의 별이에요. 혼자만의 시간에서 에너지를 얻고, 전문성을 쌓는 기운이에요."},
  술:{name:"망신성(亡神星)",desc:"변동·관재·이동의 에너지예요. 예상치 못한 변화가 생기기 쉬운 구조이지만, 그 변화가 성장으로 이어져요."},
  해:{name:"복덕성(福德星)",desc:"가장 복이 많은 별이에요. 순수하고 선량하며 풍요를 가져오는 기운으로, 주변을 이롭게 하는 사람이에요."},
};

// ━━ 십이운성 (일간 무토 기준 예시 → 실제는 일간별 계산) ━━
// 일간별 장생지 기준
const JANGSSAENG = { 갑:"해",을:"오",병:"인",정:"유",무:"인",기:"유",경:"사",신:"자",임:"신",계:"묘" };
const STAGES = ["장생(長生)","목욕(沐浴)","관대(冠帶)","건록(建祿)","제왕(帝旺)","쇠(衰)","병(病)","사(死)","묘(墓)","절(絶)","태(胎)","양(養)"];
const JI_ORDER = ["자","축","인","묘","진","사","오","미","신","유","술","해"];

function getStage(ilgan, ji) {
  const start = JI_ORDER.indexOf(JANGSSAENG[ilgan]);
  const pos = JI_ORDER.indexOf(ji);
  if(start<0||pos<0) return "";
  // 양간은 순행, 음간은 역행
  const isYang = ["갑","병","무","경","임"].includes(ilgan);
  let diff = isYang ? (pos - start + 12) % 12 : (start - pos + 12) % 12;
  return STAGES[diff] || "";
}

// ━━ 주역 64괘 DB ━━
const ICHING_64 = {
  // 상괘_하괘 형태로 키 관리 (팔괘번호: 坎1,坤2,震3,巽4,中5,乾6,兌7,艮8,離9)
  // key: "상괘오행_하괘오행" 형태
  "水_木": { name:"水雷屯(수뢰둔)", num:3, symbol:"䷂", nature:"어려운 탄생·씨앗·고통 뒤의 성장", desc:"64괘 중 세 번째 괘. 하늘과 땅의 교합 이후 처음 탄생하는 생명의 고통을 상징해요. 봄은 왔으나 씨앗이 아직 얼어붙은 땅 속에 있는 이미지예요. 시작은 험하지만 반드시 싹이 트는 형국이에요.", strategy:["팀과 협력자를 꼭 구하세요 — 이 시기에 혼자 다 하려는 게 가장 큰 실수예요.","베풀고 나누는 게 진짜 이익이에요 — 줄수록 더 돌아오는 풍뢰익의 이치예요.","서두르지는 말되, 기회가 오면 즉각 움직여요 — 준비된 사람이 때를 놓치는 것도 비극이에요."], currentGae:"風雷益(풍뢰익)", currentDesc:"협력·팀워크·귀인의 도움을 통해 혼자서는 불가능했던 일들이 이루어지는 시기예요." },
  "水_火": { name:"水火旣濟(수화기제)", num:63, symbol:"䷾", nature:"완성·성취·균형의 유지", desc:"이미 이루어진 형상이에요. 재능과 노력이 만나 결실을 맺는 명국이에요. 단, 완성 이후의 방심이 가장 위험해요.", strategy:["완성된 것을 지키는 것도 노력이에요.","균형을 유지하는 것이 새로운 도전보다 중요한 시기예요.","작은 것부터 점검하고 기반을 다지세요."], currentGae:"火水未濟(화수미제)", currentDesc:"미완성의 에너지 — 새로운 도전을 향해 나아가는 시기예요." },
  "水_土": { name:"水地比(수지비)", num:8, symbol:"䷇", nature:"연대·협력·친밀한 관계", desc:"물이 땅 위에 있는 형상 — 서로 가깝고 친밀한 연대의 괘예요. 혼자보다 함께가 훨씬 강한 구조예요.", strategy:["신뢰할 수 있는 사람들과 연대하세요.","먼저 손 내미는 것이 더 큰 것을 돌려받는 방법이에요.","가까운 관계를 소중히 하세요."], currentGae:"地水師(지수사)", currentDesc:"조직과 리더십의 에너지 — 이끄는 역할이 어울리는 시기예요." },
  "水_金": { name:"水天需(수천수)", num:5, symbol:"䷄", nature:"기다림·준비·때를 기다리는 지혜", desc:"하늘 위에 물이 있는 형상 — 때를 기다리는 괘예요. 섣불리 움직이지 않고 기다리면 반드시 기회가 찾아오는 구조예요.", strategy:["지금은 준비하는 시간이에요 — 행동보다 준비가 먼저예요.","조급함을 내려놓으면 더 큰 기회가 와요.","실력을 쌓는 것이 가장 빠른 길이에요."], currentGae:"天水訟(천수송)", currentDesc:"갈등·분쟁 주의 — 말보다 침묵이 유리한 시기예요." },
  "水_水": { name:"坎爲水(감위수)", num:29, symbol:"䷜", nature:"위험·도전·거듭되는 시련", desc:"위아래 모두 물 — 험난함이 거듭되는 괘예요. 두려움 없이 흐르는 물처럼, 어떤 장애물도 결국 돌아서 나아가는 의지가 핵심이에요.", strategy:["두려움을 인정하되, 멈추지 마세요.","물처럼 길이 막히면 돌아가는 유연함이 필요해요.","신뢰할 수 있는 한 사람에게만이라도 의지하세요."], currentGae:"水風井(수풍정)", currentDesc:"근원으로 돌아가는 시간 — 본질을 다시 찾는 시기예요." },
  "土_木": { name:"地雷復(지뢰복)", num:24, symbol:"䷗", nature:"회복·새 출발·본래로 돌아감", desc:"땅 아래 우레가 움직이는 형상 — 겨울 끝에 봄이 시작되는 첫 번째 양의 기운이에요. 오래 잠들었던 것이 다시 깨어나는 새 출발의 괘예요.", strategy:["지금이 다시 시작할 적기예요.","작은 것부터 되살리세요 — 큰 것은 나중에 따라와요.","과거의 실패를 자양분으로 삼는 것이 복(復)의 지혜예요."], currentGae:"雷地豫(뇌지예)", currentDesc:"기쁨과 열정의 에너지 — 즐기면서 나아가는 시기예요." },
  "土_火": { name:"地火明夷(지화명이)", num:36, symbol:"䷣", nature:"빛이 가려짐·인내·내면의 빛을 지킴", desc:"빛이 땅 속에 숨겨진 형상이에요. 재능을 숨기고 때를 기다리는 것이 지혜인 시기예요. 드러내지 않아도 내면의 빛은 반드시 빛날 때가 와요.", strategy:["지금은 드러내기보다 숨기는 것이 현명해요.","내면의 빛을 꺼뜨리지 마세요 — 때가 되면 빛날 거예요.","불필요한 갈등을 피하고 실력을 쌓으세요."], currentGae:"火地晉(화지진)", currentDesc:"빛이 드러나는 시간 — 숨겨두었던 것이 인정받는 시기예요." },
  "土_土": { name:"坤爲地(곤위지)", num:2, symbol:"䷁", nature:"포용·수용·대지의 힘", desc:"위아래 모두 땅 — 완전한 포용과 수용의 괘예요. 하늘의 뜻을 받아 만물을 길러내는 대지처럼, 모든 것을 품는 넉넉함이 핵심이에요.", strategy:["리드하기보다 따르면서 더 큰 힘을 발휘하는 시기예요.","포용하고 기다리는 것이 가장 강한 전략이에요.","사람들의 지지를 모으는 것이 중요해요."], currentGae:"地天泰(지천태)", currentDesc:"하늘과 땅이 교통하는 형통의 시기 — 막혔던 것이 뚫리는 때예요." },
  "土_金": { name:"地天泰(지천태)", num:11, symbol:"䷊", nature:"형통·소통·막힘이 뚫림", desc:"하늘과 땅이 서로 통하는 형통의 괘예요. 위와 아래가 교류하고, 음양이 조화를 이루는 가장 이상적인 상태예요.", strategy:["지금이 나아갈 때예요 — 때를 놓치지 마세요.","소통하고 나누세요 — 받은 것을 흘려보내야 더 들어와요.","관계를 넓히고 협력을 강화하세요."], currentGae:"天地否(천지비)", currentDesc:"막힘과 단절의 시기 — 내실을 다지며 기다리는 지혜가 필요해요." },
  "土_水": { name:"地水師(지수사)", num:7, symbol:"䷆", nature:"조직·리더십·군중을 이끄는 힘", desc:"땅 아래 물이 흐르는 형상 — 조직을 이끄는 리더십의 괘예요. 올바른 지도자가 군중을 이끄는 에너지예요.", strategy:["리더십을 발휘하되 원칙을 지키세요.","혼자가 아닌 조직의 힘을 활용하세요.","신뢰를 먼저 쌓고 그다음 이끄세요."], currentGae:"水地比(수지비)", currentDesc:"연대와 협력의 에너지 — 혼자보다 함께가 강한 시기예요." },
  "木_水": { name:"雷水解(뇌수해)", num:40, symbol:"䷧", nature:"해방·풀림·막혔던 것이 해소", desc:"우레가 물 위에 있는 형상 — 오래 막혔던 것이 드디어 풀리는 괘예요. 긴장이 해소되고 새로운 에너지가 흐르기 시작하는 시기예요.", strategy:["지금이 새로운 시작을 할 적기예요.","과거의 얽힘을 과감히 정리하세요.","용서와 내려놓음이 더 큰 자유를 가져다줘요."], currentGae:"水雷屯(수뢰둔)", currentDesc:"새로운 씨앗이 싹트는 시기 — 어렵지만 희망이 있어요." },
  "木_土": { name:"雷地豫(뇌지예)", num:16, symbol:"䷏", nature:"기쁨·열정·준비된 행동", desc:"우레가 땅 위에서 울려 퍼지는 형상 — 기쁨과 열정의 괘예요. 충분히 준비됐을 때 행동하면 모든 것이 순탄하게 흘러가요.", strategy:["즐기면서 하는 것이 가장 빠른 성공이에요.","열정을 잃지 마세요 — 그게 당신의 가장 큰 무기예요.","함께 기뻐할 사람을 만드세요."], currentGae:"地雷復(지뢰복)", currentDesc:"회복과 새 출발의 에너지 — 다시 시작하기 좋은 시기예요." },
  "木_木": { name:"震爲雷(진위뢰)", num:51, symbol:"䷲", nature:"충격·각성·위기를 통한 성장", desc:"위아래 모두 우레 — 예상치 못한 충격과 각성의 괘예요. 두려운 상황에서도 평정심을 유지하는 자에게만 이 괘의 진짜 힘이 열려요.", strategy:["예상치 못한 일에 흔들리지 마세요 — 폭풍이 지나면 고요가 와요.","위기를 성장의 기회로 보는 시각이 필요해요.","평정심을 유지하는 것이 가장 강한 무기예요."], currentGae:"雷山小過(뇌산소과)", currentDesc:"작은 것을 조심하는 시기 — 사소한 것에서 문제가 생길 수 있어요." },
  "木_火": { name:"雷火豐(뇌화풍)", num:55, symbol:"䷶", nature:"풍요·번성·절정의 에너지", desc:"우레와 불이 함께하는 풍요의 괘예요. 최고조에 달한 에너지와 번성함을 상징해요. 단, 정점은 곧 하강을 의미하기도 해요.", strategy:["지금이 최고의 시기예요 — 두려워하지 말고 누리세요.","나누면 더 커지는 풍요의 법칙을 기억하세요.","정점 이후를 준비하는 지혜도 필요해요."], currentGae:"火雷噬嗑(화뢰서합)", currentDesc:"결단의 에너지 — 장애물을 제거하고 돌파하는 시기예요." },
  "木_金": { name:"雷天大壯(뇌천대장)", num:34, symbol:"䷡", nature:"강한 에너지·돌파·용기", desc:"우레가 하늘 위에 있는 대장(大壯)의 괘예요. 강한 에너지로 앞으로 나아가는 힘이 있어요. 다만 지나친 과신은 금물이에요.", strategy:["지금 가진 에너지를 올바른 방향으로 사용하세요.","강함을 과시하기보다 현명하게 활용하세요.","목표를 명확히 하고 집중하세요."], currentGae:"天雷無妄(천뢰무망)", currentDesc:"순수한 의도의 행동 — 바른 마음으로 움직이면 반드시 좋은 결과가 와요." },
  "火_水": { name:"離爲火(이위화)", num:30, symbol:"☲", nature:"빛·밝음·의존·화려함", desc:"위아래 모두 불 — 밝게 타오르는 빛의 괘예요. 화려하게 빛나지만 연료가 필요한 불처럼, 중심을 잡아줄 무언가에 의존하는 구조예요.", strategy:["빛나는 자리를 찾되 혼자 타오르지 않기.","관계 속에서 나를 빛낼 것.","화려함 뒤의 공허함을 채우는 내면 작업이 필요해요."], currentGae:"水火旣濟(수화기제)", currentDesc:"이미 이루어진 형상 — 완성의 시기이자 다음 준비의 시간이에요." },
  "火_土": { name:"火地晉(화지진)", num:35, symbol:"䷢", nature:"나아감·상승·빛이 드러남", desc:"태양이 땅 위로 올라오는 형상 — 점점 높아지는 상승의 괘예요. 숨겨두었던 재능과 능력이 드디어 세상에 드러나는 시기예요.", strategy:["지금이 앞으로 나아갈 때예요.","자신감을 가지고 드러내세요.","빛을 나누면 더 밝아져요."], currentGae:"地火明夷(지화명이)", currentDesc:"빛이 가려지는 시기 — 드러내기보다 내실을 다지는 지혜가 필요해요." },
  "火_金": { name:"火天大有(화천대유)", num:14, symbol:"䷍", nature:"큰 소유·풍요·빛과 하늘의 만남", desc:"태양이 하늘 높이 빛나는 대유(大有)의 괘예요. 큰 것을 소유하고 모두와 나누는 풍요의 에너지예요.", strategy:["가진 것을 나누는 것이 더 큰 풍요를 만들어요.","감사함을 잊지 마세요 — 오만함이 가장 큰 적이에요.","지금의 풍요를 지속하려면 덕(德)을 쌓아야 해요."], currentGae:"天火同人(천화동인)", currentDesc:"함께하는 사람들의 에너지 — 연대와 공동체의 힘이 중요한 시기예요." },
  "火_木": { name:"火雷噬嗑(화뢰서합)", num:21, symbol:"䷔", nature:"결단·장애물 제거·돌파", desc:"입 안에 장애물이 있는 형상 — 걸림돌을 과감하게 제거해야 하는 결단의 괘예요. 우유부단함을 버리고 명확한 결단이 필요한 시기예요.", strategy:["결정을 미루지 마세요 — 지금이 행동할 때예요.","장애물을 정면으로 돌파하세요.","정의롭고 올바른 방법으로 해결하세요."], currentGae:"雷火豐(뇌화풍)", currentDesc:"풍요와 번성의 에너지 — 노력의 결실이 나타나는 시기예요." },
  "火_火": { name:"離爲火(이위화)", num:30, symbol:"☲", nature:"빛·밝음·의존·화려함", desc:"위아래 모두 불 — 밝게 타오르는 빛의 괘예요. 중심을 잡아줄 것이 필요한 구조예요.", strategy:["빛나되 소진되지 않도록 조심하세요.","중심을 잃지 마세요.","나를 지지해줄 사람을 찾으세요."], currentGae:"水火旣濟(수화기제)", currentDesc:"완성과 균형의 에너지예요." },
  "金_水": { name:"兌爲澤(태위택)", num:58, symbol:"䷹", nature:"기쁨·설득·소통의 달인", desc:"위아래 모두 연못 — 기쁨과 소통의 괘예요. 말과 표현으로 세상을 움직이는 에너지예요.", strategy:["소통하고 나누는 것이 가장 큰 힘이에요.","기쁨을 주변과 나누세요.","말 한 마디의 힘을 믿으세요."], currentGae:"水澤節(수택절)", currentDesc:"절도와 절제의 에너지 — 감정과 욕망을 조절하는 시기예요." },
  "金_土": { name:"澤地萃(택지췌)", num:45, symbol:"䷬", nature:"모임·집결·에너지의 축적", desc:"연못이 땅 위에 있는 형상 — 많은 것이 모여드는 괘예요. 사람이 모이고 에너지가 집중되는 시기예요.", strategy:["사람들을 모으고 연결하세요.","지금이 네트워크를 강화할 때예요.","중심이 되어 이끌어 나가세요."], currentGae:"地澤臨(지택임)", currentDesc:"다가서는 에너지 — 적극적으로 나서면 좋은 결과가 와요." },
  "金_金": { name:"乾爲天(건위천)", num:1, symbol:"☰", nature:"창조·하늘·순수한 양의 에너지", desc:"위아래 모두 하늘 — 가장 강한 양의 에너지예요. 창조와 시작, 리더십의 근원이에요.", strategy:["하늘처럼 관대하고 강인하게 나아가세요.","리더십을 발휘하되 겸손함을 잃지 마세요.","창의적인 아이디어를 실행에 옮기세요."], currentGae:"天風姤(천풍구)", currentDesc:"만남의 에너지 — 예상치 못한 좋은 인연이 찾아오는 시기예요." },
  "金_木": { name:"澤雷隨(택뢰수)", num:17, symbol:"䷐", nature:"따름·유연함·흐름을 타는 지혜", desc:"연못 아래 우레가 있는 형상 — 흐름을 따르는 것이 지혜인 괘예요. 고집 없이 시대의 흐름에 맞게 유연하게 변하는 것이 핵심이에요.", strategy:["흐름에 저항하지 마세요 — 타고 가는 것이 더 빨라요.","유연하게 변화에 적응하세요.","함께 가는 것이 혼자 가는 것보다 더 멀리 가요."], currentGae:"雷澤歸妹(뇌택귀매)", currentDesc:"관계와 변화의 에너지 — 중요한 선택의 시기예요." },
  "金_火": { name:"澤火革(택화혁)", num:49, symbol:"䷰", nature:"혁명·변화·과거를 청산", desc:"연못 안에 불이 있는 형상 — 근본적인 변화와 혁신의 괘예요. 더 이상 유지할 수 없는 것을 과감하게 바꾸는 에너지예요.", strategy:["변화를 두려워하지 마세요 — 혁신이 필요한 시기예요.","과거의 낡은 것을 과감히 버리세요.","변화는 때를 맞춰서 해야 해요 — 적기를 놓치지 마세요."], currentGae:"火澤睽(화택규)", currentDesc:"분리와 차이의 에너지 — 다름 속에서 공통점을 찾는 시기예요." },
};

function getIching(ilO, relO) {
  const key = `${ilO}_${relO}`;
  return ICHING_64[key] || ICHING_64["水_木"]; // 기본값
}

// export

// 3. 사주 계산 엔진 — buildSajuData(input)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GAN_OE={갑:"木",을:"木",병:"火",정:"火",무:"土",기:"土",경:"金",신:"金",임:"水",계:"水"};
const JI_OE={자:"水",축:"土",인:"木",묘:"木",진:"土",사:"火",오:"火",미:"土",신:"金",유:"金",술:"土",해:"水"};
const isYang=g=>["갑","병","무","경","임"].includes(g);
const isYangJ=j=>["자","인","진","오","신","술"].includes(j);
const normO=o=>({Fire:"火",Water:"水"}[o]||o);

function getSibsong(ilgan,target,isGan=true){
  const ilO=normO(GAN_OE[ilgan]);
  const tO=normO(isGan?GAN_OE[target]:JI_OE[target]);
  const same=isGan?isYang(ilgan)===isYang(target):isYang(ilgan)===isYangJ(target);
  const gen={木:"火",火:"土",土:"金",金:"水",水:"木"};
  const kek={木:"土",土:"水",水:"火",火:"金",金:"木"};
  if(ilO===tO) return same?"비견":"겁재";
  if(gen[ilO]===tO) return same?"식신":"상관";
  if(kek[ilO]===tO) return same?"편재":"정재";
  if(kek[tO]===ilO) return same?"편관":"정관";
  if(gen[tO]===ilO) return same?"편인":"정인";
  return "?";
}

function calcWolju(yearGan,monthJi){
  const yNum={갑:1,을:2,병:3,정:4,무:5,기:6,경:7,신:8,임:9,계:10}[yearGan]||1;
  const jNum={자:11,축:12,인:1,묘:2,진:3,사:4,오:5,미:6,신:7,유:8,술:9,해:10}[monthJi]||1;
  const r=(yNum*2+jNum)%10;
  const gIdx=r===0?9:r-1;
  const jIdx=JL.indexOf(monthJi);
  return{ko:GL[gIdx]+JL[jIdx],hanja:GH[gIdx]+JH[jIdx],gan:{ko:GL[gIdx],hanja:GH[gIdx]},ji:{ko:JL[jIdx],hanja:JH[jIdx]}};
}

function calcSiju(ilgan,siJi){
  const startG={갑:0,기:0,을:2,경:2,병:4,신:4,정:6,임:6,무:8,계:8}[ilgan]||0;
  const jiIdx=JL.indexOf(siJi);
  const gIdx=(startG+jiIdx)%10;
  return{ko:GL[gIdx]+JL[jiIdx],hanja:GH[gIdx]+JH[jiIdx],gan:{ko:GL[gIdx],hanja:GH[gIdx]},ji:{ko:JL[jiIdx],hanja:JH[jiIdx]}};
}

function calcYeonju(year,month,day){
  const y=(month<2||(month===2&&day<4))?year-1:year;
  const idx=((y-1984)%60+600)%60;
  return{ko:GL[idx%10]+JL[idx%12],hanja:GH[idx%10]+JH[idx%12],gan:{ko:GL[idx%10],hanja:GH[idx%10]},ji:{ko:JL[idx%12],hanja:JH[idx%12]}};
}

function getMonthJi(month,day){
  const T=[[1,6,"축"],[2,4,"인"],[3,6,"묘"],[4,5,"진"],[5,6,"사"],[6,6,"오"],[7,7,"미"],[8,8,"신"],[9,8,"유"],[10,8,"술"],[11,7,"해"],[12,7,"자"]];
  let ji="자";
  for(const[m,d,j]of T){if(month>m||(month===m&&day>=d))ji=j;}
  return ji;
}

function getTimeJi(h){
  const T=[[0,1,"자"],[1,3,"축"],[3,5,"인"],[5,7,"묘"],[7,9,"진"],[9,11,"사"],[11,13,"오"],[13,15,"미"],[15,17,"신"],[17,19,"유"],[19,21,"술"],[21,23,"해"],[23,24,"자"]];
  for(const[s,e,j]of T){if(h>=s&&h<e)return j;}
  return "자";
}

function calcOhaengDist(pillars){
  const dist={木:0,火:0,土:0,金:0,水:0};
  pillars.forEach(p=>{
    const go=normO(GAN_OE[p.gan.ko]);
    const jo=normO(JI_OE[p.ji.ko]);
    if(dist[go]!==undefined)dist[go]++;
    if(dist[jo]!==undefined)dist[jo]++;
  });
  return dist;
}

function calcSinsal(ilgan,yearJi,monthJi,dayJi,timeJi){
  const result=[];
  const taeul={갑:["축","미"],무:["축","미"],경:["축","미"],을:["자","신"],기:["자","신"],병:["해","유"],정:["해","유"],임:["묘","사"],계:["묘","사"],신:["오","인"]};
  const tj=taeul[ilgan]||[];
  const tf=[yearJi,monthJi,dayJi,timeJi].filter(j=>tj.includes(j));
  if(tf.length>0)result.push({name:"천을귀인",hanja:"天乙貴人",found:tf.join("·"),easy:"귀인이 곁에 있는 축복받은 구조예요.",desc:`${ilgan} 일간의 천을귀인 — 위기마다 반드시 조력자가 나타나요.`});
  const mc={갑:"사",을:"오",병:"신",정:"유",무:"신",기:"유",경:"해",신:"자",임:"인",계:"묘"};
  if(mc[ilgan]&&[yearJi,monthJi,dayJi,timeJi].includes(mc[ilgan]))result.push({name:"문창귀인",hanja:"文昌貴人",found:mc[ilgan],easy:"학문·글·시험에서 두각을 나타내는 에너지예요.",desc:"글재주와 언변이 타고난 편이에요."});
  const dh={해:"자",묘:"자",미:"자",신:"유",자:"유",진:"유",인:"묘",오:"묘",술:"묘",사:"오",유:"오",축:"오"};
  if(dh[dayJi]&&[yearJi,monthJi,timeJi].includes(dh[dayJi]))result.push({name:"도화살",hanja:"桃花殺",found:dh[dayJi],easy:"타고난 자연스러운 흡인력이 있어요.",desc:"자신도 모르게 눈에 띄고 기억에 남는 사람이에요."});
  const ym={신:"인",자:"인",진:"인",인:"신",오:"신",술:"신",사:"해",유:"해",축:"해",해:"사",묘:"사",미:"사"};
  if(ym[yearJi]&&[monthJi,dayJi,timeJi].includes(ym[yearJi]))result.push({name:"역마살",hanja:"驛馬殺",found:ym[yearJi],easy:"이동·변화·해외 에너지가 강해요.",desc:"한 곳에 오래 머물면 답답함을 느끼기 쉬운 타입이에요."});
  return result;
}

function calcLifePath(y,m,d){
  const s=[...String(y),...String(m).padStart(2,"0"),...String(d).padStart(2,"0")].map(Number).reduce((a,b)=>a+b,0);
  let n=s;
  while(n>9&&![11,22,33].includes(n))n=String(n).split("").reduce((a,b)=>a+parseInt(b),0);
  return{lp:n,calc:`${[...String(y),...String(m).padStart(2,"0"),...String(d).padStart(2,"0")].join("+")}=${s}→${n}`};
}

const CITY_OFFSET={"서울":-2,"부산":3,"대구":0,"인천":-3,"광주":-11,"대전":-5,"울산":4,"세종":-5,"경기":-2,"강원":4,"충북":-4,"충남":-7,"전북":-10,"전남":-12,"경북":2,"경남":1,"제주":-19,"경북 경산":-25,"경북 포항":5,"경북 구미":-3,"경북 안동":0,"경남 창원":0,"경남 진주":-4,"전남 순천":-10,"전북 전주":-10};
const ANIMALS={자:"쥐",축:"소",인:"호랑이",묘:"토끼",진:"용",사:"뱀",오:"말",미:"양",신:"원숭이",유:"닭",술:"개",해:"돼지"};
const ANIMAL_DESC={자:"영리한",축:"성실한",인:"용감한",묘:"우아한",진:"카리스마 있는",사:"지혜로운",오:"활기찬",미:"온화한",신:"총명한",유:"섬세한",술:"충직한",해:"복덕 있는"};

function buildSajuData(input){
  const{name,year:ys,month:ms,day:ds,hour:hs,minute:mns="0",gender,city}=input;
  const y=parseInt(ys),m=parseInt(ms),d=parseInt(ds);
  const rawH=parseInt(hs),rawM=parseInt(mns);
  const offset=CITY_OFFSET[city]||0;
  const totalMin=rawH*60+rawM+offset;
  const h=Math.floor(((totalMin%1440)+1440)%1440/60);

  const yeonju=calcYeonju(y,m,d);
  const monthJi=getMonthJi(m,d);
  const wolju=calcWolju(yeonju.gan.ko,monthJi);
  const bnd=calcBnd(y,m,d,h,totalMin%60);
  const ilju=bnd.std;
  const iljuB=bnd.mid;
  const siJi=getTimeJi(h);
  const siju=calcSiju(ilju.gan.ko,siJi);
  const sijuB=calcSiju(iljuB.gan.ko,siJi);

  const mkG=(gko,ghanja,ilg)=>({ko:gko,hanja:ghanja,sibsong:getSibsong(ilg,gko,true)});
  const mkJ=(jko,jhanja,ilg)=>({ko:jko,hanja:jhanja,sibsong:getSibsong(ilg,jko,false)});
  const ilgan=ilju.gan.ko,ilganB=iljuB.gan.ko;

  const pillars=[
    {name:"연주",gan:mkG(yeonju.gan.ko,yeonju.gan.hanja,ilgan),ji:mkJ(yeonju.ji.ko,yeonju.ji.hanja,ilgan)},
    {name:"월주",gan:mkG(wolju.gan.ko,wolju.gan.hanja,ilgan),ji:mkJ(wolju.ji.ko,wolju.ji.hanja,ilgan)},
    {name:"일주",gan:{ko:ilgan,hanja:ilju.gan.hanja,sibsong:"일간"},ji:mkJ(ilju.ji.ko,ilju.ji.hanja,ilgan)},
    {name:"시주",gan:mkG(siju.gan.ko,siju.gan.hanja,ilgan),ji:mkJ(siju.ji.ko,siju.ji.hanja,ilgan)},
  ];
  const pillarsB=[
    {name:"연주",gan:mkG(yeonju.gan.ko,yeonju.gan.hanja,ilganB),ji:mkJ(yeonju.ji.ko,yeonju.ji.hanja,ilganB)},
    {name:"월주",gan:mkG(wolju.gan.ko,wolju.gan.hanja,ilganB),ji:mkJ(wolju.ji.ko,wolju.ji.hanja,ilganB)},
    {name:"일주",gan:{ko:ilganB,hanja:iljuB.gan.hanja,sibsong:"일간"},ji:mkJ(iljuB.ji.ko,iljuB.ji.hanja,ilganB)},
    {name:"시주",gan:mkG(sijuB.gan.ko,sijuB.gan.hanja,ilganB),ji:mkJ(sijuB.ji.ko,sijuB.ji.hanja,ilganB)},
  ];

  const ohaengDist=calcOhaengDist(pillars);
  const ilO=normO(GAN_OE[ilgan]);
  const monthO=normO(JI_OE[wolju.ji.ko]);
  const genCycle={木:"火",火:"土",土:"金",金:"水",水:"木"};
  const monthHelps=(monthO===ilO)||(genCycle[monthO]===ilO);
  const singang=monthHelps?"신강(身强)":"신약(身弱)";
  const domO=Object.entries(ohaengDist).sort((a,b)=>b[1]-a[1])[0][0];

  const sinsal=calcSinsal(ilgan,yeonju.ji.ko,wolju.ji.ko,ilju.ji.ko,siJi);

  const yearGanYang=isYang(yeonju.gan.ko);
  const forward=(yearGanYang&&gender==="남")||(!yearGanYang&&gender==="여");
  const startAge=4;
  const wGi=GL.indexOf(wolju.gan.ko),wJi=JL.indexOf(wolju.ji.ko);
  const daeun=Array.from({length:6},(_,i)=>{
    const gi=forward?(wGi+i+1)%10:((wGi-i-1+10)%10);
    const ji=forward?(wJi+i+1)%12:((wJi-i-1+12)%12);
    const age=startAge+i*10;
    const ohaeng=normO(GAN_OE[GL[gi]])||normO(JI_OE[JL[ji]]);
    return{label:GL[gi]+JL[ji],hanja:GH[gi]+JH[ji],period:`만 ${age}~${age+9}세`,ohaeng,cur:CY>=y+age&&CY<y+age+10,desc:`${GH[gi]+JH[ji]}(${GL[gi]+JL[ji]}) 대운 — ${normO(GAN_OE[GL[gi]])} 기운이 주도하는 시기예요.`};
  });

  const{lp,calc}=calcLifePath(y,m,d);
  // MBTI 일간 기반 추정
  const MBTI_BY_ILGAN={갑:"ENTJ",을:"ENFP",병:"ESFP",정:"INFP",무:"ESTJ",기:"ESFJ",경:"INTJ",신:"ISFJ",임:"INTP",계:"INFJ"};
  const MBTI_DESC={갑:"목(木)의 리더십 + 강한 추진력 — 전략적 사고와 실행력이 강한 타입이에요.",을:"목(木)의 유연함 + 공감력 — 사람과 가능성에서 에너지를 얻는 타입이에요.",병:"화(火)의 열정 + 외향성 — 활기차고 현재를 즐기는 에너지가 넘치는 타입이에요.",정:"화(火)의 섬세함 + 내향성 — 깊은 감성과 이상을 추구하는 타입이에요.",무:"토(土)의 안정 + 원칙 — 책임감과 조직력이 강한 현실적인 리더 타입이에요.",기:"토(土)의 포용 + 관계 — 따뜻한 배려와 협력으로 빛나는 타입이에요.",경:"금(金)의 날카로움 + 독립 — 전략적이고 독립적인 완벽주의자 타입이에요.",신:"금(金)의 섬세함 + 배려 — 헌신적이고 실용적인 지원자 타입이에요.",임:"수(水)의 통찰 + 분석 — 논리적이고 독창적인 사상가 타입이에요.",계:"수(水)의 공감 + 직관 — 깊은 통찰과 사명감을 가진 타입이에요."};
  const mbtiType=MBTI_BY_ILGAN[ilgan]||"분석 중";
  const mbtiDesc=MBTI_DESC[ilgan]||"사주 교차 분석 중이에요.";
  const mbtiAxes=[
    {axis:`${mbtiType[0]==="E"?"E (외향)":"I (내향)"}`,score:mbtiType[0]==="E"?65:70,basis:`${ilO} 일간의 ${mbtiType[0]==="E"?"외향적":"내향적"} 에너지예요.`},
    {axis:`${mbtiType[1]==="N"?"N (직관)":"S (감각)"}`,score:mbtiType[1]==="N"?68:65,basis:`${mbtiType[1]==="N"?"직관과 가능성에 집중하는 타입이에요.":"현실과 구체적인 것에 집중하는 타입이에요."}`},
    {axis:`${mbtiType[2]==="F"?"F (감정)":"T (사고)"}`,score:60,basis:"사주와 MBTI 교차 분석 결과예요."},
    {axis:`${mbtiType[3]==="J"?"J (판단)":"P (인식)"}`,score:mbtiType[3]==="J"?75:60,basis:`${mbtiType[3]==="J"?"계획적이고 체계적인 타입이에요.":"유연하고 즉흥적인 타입이에요."}`},
  ];
  // 타로 연도별 개인연도수
  function getPersonalYear(yr){
    const bd=`0101`; // 생일 간소화 (01월01일 기준)
    const digits=[...String(yr),...String(m).padStart(2,"0"),...String(d).padStart(2,"0")].map(Number);
    let s=digits.reduce((a,b)=>a+b,0);
    while(s>9&&![11,22,33].includes(s))s=String(s).split("").reduce((a,b)=>a+parseInt(b),0);
    return s;
  }
  const TAROT_CARDS_MAP={1:"마법사",2:"고위여사제",3:"황후",4:"황제",5:"교황",6:"연인",7:"전차",8:"힘",9:"은둔자",10:"운명의 수레바퀴",11:"정의",22:"위대한 건축가(마스터 22)"};
  const TAROT_DESC_MAP={1:"새로운 시작과 의지의 해예요.",2:"직관과 내면의 목소리를 따르는 해예요.",3:"창조와 풍요의 해예요.",4:"기반을 다지고 체계를 세우는 해예요.",5:"배움과 멘토의 해예요.",6:"선택과 관계의 해예요.",7:"의지와 승리의 해예요.",8:"내면의 힘을 발휘하는 해예요.",9:"내면을 돌아보는 해예요.",10:"예상치 못한 전환의 해예요.",11:"균형과 공정의 해예요.",22:"대각성의 해 — 큰 꿈이 현실이 돼요."};

  // 5년 운세 점수 (용신/기신 세운 기반)
  const yongsinOList = yongsinA_val.replace(/[^가-힣]/g,"").split("").filter(o=>["목","화","토","금","수"].includes(o));
  const gisinOList = gisinA_val.replace(/[^가-힣]/g,"").split("").filter(o=>["목","화","토","금","수"].includes(o));
  const KOR_O={갑:"목",을:"목",병:"화",정:"화",무:"토",기:"토",경:"금",신:"금",임:"수",계:"수"};
  function yearScore(yr){
    const yg=yearToGJ(yr);
    const yO=KOR_O[yg.gan.ko]||"";
    const vs=singang==="신강(身强)"?"strong":"weak";
    let base=68;
    if(yongsinOList.some(o=>yO.includes(o))) base+=18;
    else if(gisinOList.some(o=>yO.includes(o))) base-=12;
    // 대운과의 조화
    const curD=daeun.find(d=>d.cur);
    if(curD){
      const dO=normO(GAN_OE[curD.label[0]])||"";
      if(yongsinOList.some(o=>dO.toLowerCase().includes(o))) base+=8;
    }
    return Math.min(97,Math.max(52,base));
  }
  const YEAR_SUMMARIES={
    high:"용신 에너지가 활성화되는 해예요. 준비한 것이 결실을 맺는 시기예요.",
    mid:"흐름이 무난한 해예요. 꾸준히 나아가는 것이 중요해요.",
    low:"기신 에너지가 강한 해예요. 무리한 확장보다 내실을 다지는 시기예요."
  };
  const yearForecast=[CY,CY+1,CY+2,CY+3,CY+4].map(yr=>{
    const sc=yearScore(yr);
    return{year:yr,score:sc,summary:sc>=78?YEAR_SUMMARIES.high:sc>=62?YEAR_SUMMARIES.mid:YEAR_SUMMARIES.low};
  });
  const yearCards=[CY,CY+1,CY+2,CY+3,CY+4,CY+5].map((yr,i)=>{
    const py=getPersonalYear(yr);
    const score=Math.min(90,Math.max(55,65+(py===22?25:py===11?15:py===lp?10:0)+(i<2?5:0)));
    return{year:yr,num:py,card:TAROT_CARDS_MAP[py]||String(py),score,desc:TAROT_DESC_MAP[py]||`${py}번 에너지의 해예요.`};
  });
  // 생명경로수 타로 카드
  const LP_CARDS={1:"마법사(The Magician)",2:"고위여사제(High Priestess)",3:"황후(The Empress)",4:"황제(The Emperor)",5:"교황(The Hierophant)",6:"연인(The Lovers)",7:"전차(The Chariot)",8:"힘(Strength)",9:"은둔자(The Hermit)",11:"정의(Justice)",22:"위대한 건축가"};
  const LP_DESC={1:"의지와 실행의 에너지예요. 아이디어를 현실로 만드는 마법사예요.",2:"직관과 신비의 에너지예요. 보이지 않는 것을 보는 능력이 있어요.",3:"창조와 표현의 에너지예요. 무언가를 낳고 키우는 것이 삶의 핵심이에요.",4:"질서와 체계의 에너지예요. 꾸준히 쌓아 탑을 만드는 황제예요.",5:"자유와 변화의 에너지예요. 경험을 통해 성장하는 모험가예요.",6:"책임과 사랑의 에너지예요. 관계 속에서 꽃피는 타입이에요.",7:"탐구와 지혜의 에너지예요. 깊이 파고드는 분석가예요.",8:"힘과 성취의 에너지예요. 현실적인 성공을 향해 나아가요.",9:"완성과 봉사의 에너지예요. 세상에 나눠주는 사람이에요.",11:"영감과 이상의 에너지예요. 마스터 넘버 — 특별한 사명이 있어요.",22:"대건축가의 에너지예요. 마스터 넘버 22 — 꿈을 현실로 만드는 사람이에요."};
  const lifePathCard=LP_CARDS[lp]||`${lp}번 카드`;
  const lifePathDesc=LP_DESC[lp]||`생명경로수 ${lp}번의 에너지예요.`;
  const currentAge=CY-y+1;
  const sang=(y%100)%8||8,jung=currentAge%6||6,ha=8;
  const animal=ANIMALS[yeonju.ji.ko]||"";
  const animalDesc=ANIMAL_DESC[yeonju.ji.ko]||"";

  // ━━ DB에서 텍스트 가져오기 ━━
  const ilganDB = ILGAN_DESC[ilgan] || ILGAN_DESC["무"];
  const iljuKey = ilju.ko; // 갑자, 무술 등
  const iljuCharDesc = ILJU_CHAR[iljuKey] || `${ilju.hanja}(${ilju.ko}) 일주예요.`;
  const vsKey = singang==="신강(身强)"?"strong":"weak";
  const yongDB = YONGSIN_TABLE[ilO] || YONGSIN_TABLE["土"];
  const yongsinA_val = yongDB[vsKey].yongsin;
  const huisinA_val = yongDB[vsKey].huisin;
  const gisinA_val = yongDB[vsKey].gisin;

  // 당사주 별성
  const dansajuPillars = [
    {ji:yeonju.ji.ko,palace:"년주(조상궁)"},
    {ji:wolju.ji.ko,palace:"월주(부모궁)"},
    {ji:ilju.ji.ko,palace:"일주(배우자궁)"},
    {ji:siJi,palace:"시주(자녀궁)"},
  ].map(({ji,palace})=>{
    const bs = BYEOLSEONG[ji] || {name:"분석 중",desc:""};
    const stage = getStage(ilgan,ji);
    return {ji,byeolseong:bs.name,stage,palace,desc:bs.desc};
  });

  // 주역 본명괘 (사주 최다오행→상괘, 일간 관성오행→하괘)
  const kek2={木:"土",土:"水",水:"火",火:"金",金:"木"};
  const relO = kek2[ilO] || "木"; // 관성 오행 (나를 극하는 것)
  const ichingData = getIching(domO, relO);

  // 낮과 밤 텍스트
  const dn_day = ilganDB.day || {impression:"분석 중",mask:"분석 중"};
  const dn_night = ilganDB.night || {desire:"분석 중",desire2:"",triggers:[],attraction:"분석 중",idealType:"분석 중",idealType2:"분석 중"};

  // 일주 특성으로 headline
  const headline_text = iljuCharDesc;

  // 성격 요약 persona
  const persona = [
    {icon:"🔮",title:`${ilju.hanja}(${ilju.ko}) 일주`,desc:iljuCharDesc},
    {icon:singang==="신강(身强)"?"💪":"🌱",title:singang,desc:`${ilO} 기운의 일간이에요. ${ilganDB[vsKey]}`},
    {icon:"⭐",title:"월령",desc:`${wolju.hanja}(${wolju.ko})월 출생 — ${monthHelps?"득령(得令)하여 일간이 힘을 얻은 구조":"실령(失令)하여 균형 조절이 중요한 구조"}예요.`},
    {icon:"🌟",title:"신살",desc:sinsal.length>0?sinsal.map(s=>s.name).join("·")+" 발동":"특별한 신살이 없는 안정적 구조예요."},
  ];

  return{
    name,birth:`양력 ${y}년 ${m}월 ${d}일 ${rawH}시 ${String(rawM).padStart(2,"0")}분 ${city}`,gender,
    animal,animalDesc,
    boundary:{...bnd,isBoundary:bnd.inBoundary,
      standardDesc:`${ilju.hanja}(${ilju.ko}) — ${ilO} 기운의 일간이에요. ${ilganDB.core}`,
      midnightDesc:`${iljuB.hanja}(${iljuB.ko}) — 야자시 기준 경계 일주예요. ${(ILGAN_DESC[ilganB]||ILGAN_DESC["기"]).core}`,
    },
    pillars,pillarsB,
    ohaengDist,singang,
    yongsinA:yongsinA_val, yongsinB:"분석 중",
    huisinA:huisinA_val, huisinB:"분석 중",
    gisinA:gisinA_val, gisinB:"분석 중", gisin:gisinA_val,
    ohaengNote:`${Object.entries(ohaengDist).map(([k,v])=>`${k}:${v}개`).join(" · ")} — 일간 ${ilju.hanja}(${ilgan})는 ${monthHelps?"월령 득령":"월령 실령"}하여 ${singang}이에요.`,
    headline:headline_text,
    summary:{
      persona,
      yearForecast,
      sixSystems:[
        {system:"사주",key:`${ilju.hanja} 일주`,desc:`${ilO} 기운의 일간 — ${singang}이에요.`,insight:ilganDB.core},
        {system:"토정비결",key:`상${sang}·중${jung}·하${ha}`,desc:"토정비결 괘수 자동 산출이에요.",insight:""},
        {system:"주역",key:ichingData.name,desc:ichingData.nature,insight:""},
        {system:"당사주",key:dansajuPillars.map(p=>p.byeolseong.split("(")[0]).join("·"),desc:"지지별 별성 자동 분석이에요.",insight:""},
        {system:"점성술",key:"출생 차트",desc:"출생 시각 기반 행성 배치예요.",insight:""},
        {system:"타로수비학",key:`생명경로수 ${lp}`,desc:`생명경로수 ${lp}번의 에너지예요.`,insight:""},
        {system:"MBTI",key:"분석 중",desc:"사주와 교차 분석 중이에요.",insight:""},
      ],
      sevenInsight:`${name}님의 사주를 분석했어요. 일간 ${ilju.hanja}(${ilju.ko})는 ${ilO} 기운으로 ${singang} 구조예요. ${ilganDB.core} ${singang==="신강(身强)"?"에너지가 넘치는 만큼, 용신인 "+yongsinA_val+"을 통해 균형을 맞추는 것이 핵심이에요.":"내면의 에너지를 키우는 것이 중요해요. 용신인 "+yongsinA_val+"이 도움이 돼요."}`,
    },
    sinsal,hap:[],hyeong:[],chung:[],
    daeun,daeunStart:startAge,daeunDir:forward?"순행(順行)":"역행(逆行)",
    dansaju:{pillars:dansajuPillars,overall:`${dansajuPillars.map(p=>p.byeolseong.split("(")[0]).join("·")} — 지지별 별성이 담고 있는 삶의 에너지예요.`,yearFlow:[]},
    iching:{bonmyeonggae:ichingData.name,gaeSymbol:ichingData.symbol||"☯",gaeNum:ichingData.num||0,gaeUpper:`${domO}(최다오행)`,gaeLower:`${relO}(관성오행)`,gaeDesc:ichingData.desc,gaeNature:ichingData.nature,currentGae:ichingData.currentGae||"분석 중",currentYear:`${CY}년`,currentDesc:ichingData.currentDesc||"",strategy:ichingData.strategy||[],yearFlow:[]},
    tojung:{sang,jung,ha,bonun:"분석 중",bonunDesc:"토정비결 상세 분석은 준비 중이에요.",saja:"분석 중",sajaDesc:"",yearFlow:[],month2026:[]},
    astro:{sun:"분석 중",moon:"분석 중",asc:"분석 중",mercury:"분석 중",venus:"분석 중",mars:"분석 중",sunMeaning:"태양(☉)은 의식적 자아",moonMeaning:"달(☽)은 감정·본능",ascMeaning:"ASC는 첫인상",sunDesc:"점성술 분석 중이에요.",moonDesc:"점성술 분석 중이에요.",ascDesc:"점성술 분석 중이에요.",mercuryDesc:"분석 중",venusDesc:"분석 중",marsDesc:"분석 중",triangle:"",stellium:"",yearTransit:[]},
    tarot:{lifePath:lp,isMaster:[11,22,33].includes(lp),lifePathCard,lifePathCardNum:String(lp),lifePathDesc,soulCard:LP_CARDS[lp]||"분석 중",achieveCard:LP_CARDS[(lp+1)>9?1:lp+1]||"분석 중",soulDesc:LP_DESC[lp]||"분석 중",achieveDesc:"성취 에너지 분석 중이에요.",calc,yearCards},
    daynight:{overview:`${ilganDB.core} ${singang==="신강(身强)"?"강한 에너지를 가진 만큼, 그것을 흘려보내는 방법을 찾는 것이 중요해요.":"내면의 에너지를 충전하는 루틴이 필요해요."}`,
      day:{impression:dn_day.impression||"",mask:dn_day.mask||"",styling:{hair:"",fashion:"",color:"",makeup:"",perfume:""}},
      night:{desire:dn_night.desire||"",desire2:dn_night.desire2||"",triggers:dn_night.triggers||[],attraction:dn_night.attraction||"",idealType:dn_night.idealType||"",idealType2:dn_night.idealType2||""}},
    mbti:{estimated:mbtiType,estType:mbtiType,esType:"",basis:mbtiDesc,axes:mbtiAxes,borderline:`${mbtiType[2]==='F'?'F':'T'}↔${mbtiType[2]==='F'?'T':'F'} 경계: 상황에 따라 유연하게 전환돼요.`,strengths:[`${ilO} 일간의 강점이 발휘되는 환경에서 최고의 실력이 나와요.`,`${singang} 구조로 에너지가 충분해요.`],challenges:[`${yongsinA_val} 기운이 부족하면 균형이 깨질 수 있어요.`],bestEnv:`${ilO} 에너지가 잘 발휘되는 환경이에요.`,recovery:`용신인 ${yongsinA_val}를 활용한 루틴이 도움이 돼요.`},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 전체 데이터 — 독립앵커 교차검증 최종 확정 (윤정님 샘플)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 공통 UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GT=({children})=><p style={{fontSize:13,color:"#666",lineHeight:1.78,margin:"8px 0 0",borderLeft:"3px solid #e8e8e8",paddingLeft:10}}>{children}</p>;
const ST=({icon,title,sub})=><div style={{marginBottom:6}}><div style={{fontSize:16,fontWeight:800,color:"#1a1a1a",display:"flex",alignItems:"center",gap:6}}><span>{icon}</span><span>{title}</span></div>{sub&&<div style={{fontSize:11,color:"#aaa",marginTop:1}}>{sub}</div>}</div>;
const Ring=({score,size=52})=>{const r=18,c2=2*Math.PI*r,col=score>=75?"#4caf50":score>=60?"#ffb300":"#ef5350";return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eee" strokeWidth={3.5}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={3.5} strokeDasharray={`${(score/100)*c2} ${c2}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/><text x={size/2} y={size/2+4} textAnchor="middle" fontSize={size<=44?10:12} fontWeight={800} fill={col}>{score}</text></svg>;};
const sc=s=>s>=75?"#2e7d32":s>=60?"#e65100":"#b71c1c";
const scBg=s=>s>=75?"#e8f5e0":s>=60?"#fff8e1":"#fdecea";
function GCard({g,s}){
  const c=gc(g.ko);
  return <div style={{width:"100%",borderRadius:11,padding:"11px 4px 8px",border:`1.5px solid ${c.border}`,background:c.bg,color:c.text,textAlign:"center",position:"relative",boxSizing:"border-box"}}>
    <span style={{position:"absolute",top:3,right:4,fontSize:14}}>{yyE(g.ko,true)}</span>
    <div style={{fontSize:9,opacity:.6,fontWeight:600,marginBottom:1}}>{s}</div>
    <div style={{fontSize:24,fontWeight:900,lineHeight:1.1}}>{g.hanja}</div>
    <div style={{fontSize:10,fontWeight:700,marginTop:2}}>{g.ko}</div>
  </div>;
}
function JCard({j,s}){
  const c=jc(j.ko);
  return <div style={{width:"100%",borderRadius:11,padding:"11px 4px 8px",border:`1.5px solid ${c.border}`,background:c.bg,color:c.text,textAlign:"center",position:"relative",boxSizing:"border-box"}}>
    <span style={{position:"absolute",top:3,right:4,fontSize:14}}>{yyE(j.ko,false)}</span>
    <div style={{fontSize:9,opacity:.6,fontWeight:600,marginBottom:1}}>{s}</div>
    <div style={{fontSize:24,fontWeight:900,lineHeight:1.1}}>{j.hanja}</div>
    <div style={{fontSize:10,fontWeight:700,marginTop:2}}>{j.ko}</div>
  </div>;
}
function Acc({items}){
  const [o,setO]=useState(null);
  return <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
    {items.map((item,i)=>{
      const op=o===i;
      return <div key={i} style={{borderRadius:12,border:"1px solid #eee",overflow:"hidden"}}>
        <button onClick={()=>setO(op?null:i)}
          style={{width:"100%",background:"#fafafa",border:"none",padding:"12px 14px",cursor:"pointer",textAlign:"left",display:"block"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              {item.badge&&<span style={{fontSize:10,background:item.badge.bg,color:item.badge.text,padding:"2px 7px",borderRadius:99,fontWeight:700,marginRight:6,display:"inline-block",marginBottom:3}}>{item.badge.label}</span>}
              <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:2}}>
                <span style={{fontSize:14,fontWeight:800,color:"#111"}}>{item.title}</span>
                {item.sub&&<span style={{fontSize:11,color:"#bbb"}}>({item.sub})</span>}
              </div>
              {item.easy&&<div style={{fontSize:12,color:"#e65100",fontWeight:600}}>{item.easy}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8}}>
              {item.tag&&<span style={{fontSize:10,color:"#e65100",background:"#fff3e0",padding:"2px 8px",borderRadius:99,fontWeight:700,whiteSpace:"nowrap"}}>{item.tag}</span>}
              <span style={{fontSize:13,color:"#ccc"}}>{op?"▲":"▼"}</span>
            </div>
          </div>
        </button>
        {op&&<div style={{padding:"12px 14px",background:"#fff",fontSize:13,color:"#444",lineHeight:1.85,borderTop:"1px solid #f0f0f0"}}>{item.desc}</div>}
      </div>;
    })}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. 요약 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TabSummary({d,changeTab}){return <>
  <section style={{...S.card,background:"linear-gradient(135deg,#fffde7,#fff3e0)",borderColor:"#ffe082"}}>
    <div style={{fontSize:11,color:"#7b5800",fontWeight:600,marginBottom:4}}>{d.name}님은</div>
    <div style={{fontSize:20,fontWeight:900,color:"#e65100",lineHeight:1.4,marginBottom:10}}>{d.animalDesc} {d.animal}</div>
    <p style={{margin:0,fontSize:13,color:"#5d4037",lineHeight:1.85}}>{d.headline||""}</p>
    <p style={{margin:"10px 0 0",fontSize:13,color:"#7b5800",lineHeight:1.85,borderTop:"1px solid #ffe08244",paddingTop:10}}>{d.daynight.overview}</p>
  </section>
  <section style={S.card}>
    <ST icon="🔮" title="사주 성격 요약"/>
    <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
      {(d.summary?.persona||[]).map((p,i)=><div key={i} style={{display:"flex",gap:10,padding:"11px 13px",background:"#fafafa",borderRadius:11,border:"1px solid #f0f0f0"}}><span style={{fontSize:20,flexShrink:0}}>{p.icon}</span><div><div style={{fontSize:13,fontWeight:800,color:"#111",marginBottom:2}}>{p.title}</div><div style={{fontSize:12,color:"#555",lineHeight:1.75}}>{p.desc}</div></div></div>)}
    </div>
  </section>
  <section style={S.card}>
    <ST icon="🌐" title="7체계 종합 분석" sub="사주·토정비결·주역·당사주·점성술·타로수비학·MBTI"/>
    <GT>일곱 가지 운명 분석 체계가 공통으로 가리키는 핵심 주제입니다.</GT>
    <div style={{marginTop:10,padding:"14px 16px",background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:12,marginBottom:10}}>
      <p style={{fontSize:13,color:"#e0e7ff",lineHeight:1.9,margin:0}}>{d.summary?.sevenInsight||""}</p>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {(d.summary?.sixSystems||[]).map((s,i)=>(
        <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:"#fafafa",borderRadius:10,border:"1px solid #eee"}}>
          <div style={{width:60,fontSize:10,fontWeight:700,color:"#e65100",background:"#fff3e0",padding:"3px 5px",borderRadius:6,textAlign:"center",flexShrink:0,lineHeight:1.5}}>{s.system}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:800,color:"#111",marginBottom:2}}>{s.key}</div>
            <div style={{fontSize:12,color:"#666",lineHeight:1.5}}>{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  </section>
  <section style={S.card}>
    <ST icon="📆" title={`향후 5년 흐름 (${CY}~${CY+4})`}/>
    <GT>6체계 교차 분석 종합 운기 점수입니다.</GT>
    <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
      {(d.summary?.yearForecast||[]).map((yf,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:scBg(yf.score),borderRadius:11}}><Ring score={yf.score} size={46}/><div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}><span style={{fontSize:14,fontWeight:900,color:yf.year===CY?"#2e7d32":"#111"}}>{yf.year}년</span>{yf.year===CY&&<span style={{fontSize:10,background:"#4caf50",color:"#fff",padding:"2px 6px",borderRadius:99,fontWeight:700}}>올해</span>}</div><div style={{fontSize:12,color:"#444",lineHeight:1.6}}>{yf.summary}</div></div></div>)}
    </div>
  </section>
  <section style={S.card}>
    <ST icon="🗂️" title="상세 분석 바로가기"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
      {[["사주","📋","명식·신살·대운·세운"],["낮과 밤","🌙","심층 심리·욕망"],["토정·주역","📜","토정비결·주역·당사주"],["별자리·타로","✨","점성술·타로수비학"],["MBTI","🧠","성격 분석"]].map(([t,ic,desc])=><button key={t} onClick={()=>changeTab(t)} style={{padding:"12px",background:"#fafafa",border:"1px solid #eee",borderRadius:12,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}><div style={{fontSize:18,marginBottom:4}}>{ic}</div><div style={{fontSize:13,fontWeight:800,color:"#111"}}>{t}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{desc}</div></button>)}
    </div>
  </section>
</>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. 사주 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function BndBanner({b}){
  if(!b?.isBoundary) return null;
  return <div style={{background:"#fff8e1",border:"1.5px solid #ffb300",borderRadius:12,padding:"12px 14px"}}>
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
      <span>⚠️</span><span style={{fontSize:13,fontWeight:800,color:"#7b5800"}}>경계 일주 감지</span>
      <span style={{fontSize:9,background:"#e65100",color:"#fff",padding:"2px 7px",borderRadius:99,fontWeight:700,marginLeft:"auto"}}>자시(子時) 경계</span>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:8}}>
      {[{l:"자정 기준",g:b.std,c:"#1565c0",bg:"#e3f2fd"},{l:"야자시 기준",g:b.mid,c:"#7b5800",bg:"#fff8e1"}].map(({l,g,c,bg})=><div key={l} style={{flex:1,padding:"8px 10px",background:bg,borderRadius:9}}><div style={{fontSize:10,color:"#888",marginBottom:2}}>{l}</div><div style={{fontSize:15,fontWeight:900,color:c}}>{g.hanja}({g.ko})</div></div>)}
    </div>
    <p style={{fontSize:12,color:"#7b5800",margin:0,lineHeight:1.75}}>23:38 출생 — 자시(子時) 경계 구간. 두 일주 에너지를 모두 가진 복합형으로, 상황에 따라 번갈아 발동해요.</p>
  </div>;
}

function Manseryeok({d}){
  const [w,setW]=useState("A");
  const active=[...(w==="A"?d.pillars:d.pillarsB)].reverse();
  const b=d.boundary;
  return <section style={S.card}>
    <ST icon="📋" title="사주 명식" sub="태어난 연·월·일·시의 네 기둥"/>
    <GT>사주는 태어난 연·월·일·시 — 네 개의 기둥으로 이루어집니다. 이 중 <strong>일주</strong>가 나 자신을 나타내는 중심이에요.</GT>
    {b.isBoundary&&<div style={{display:"flex",gap:6,marginTop:10}}>{[{k:"A",l:`자정 ${b.std.hanja}`},{k:"B",l:`야자시 ${b.mid.hanja}`}].map(o=><button key={o.k} onClick={()=>setW(o.k)} style={{flex:1,padding:"7px 6px",borderRadius:9,border:"1.5px solid #ffb300",fontSize:11,fontWeight:700,cursor:"pointer",background:w===o.k?"#7b5800":"#fff",color:w===o.k?"#fff":"#7b5800"}}>{o.l}</button>)}</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:10}}>
      {active.map((p,i)=>{const isI=p.name==="일주";return <div key={i} style={{display:"flex",flexDirection:"column",gap:5,alignItems:"center",position:"relative",...(isI?{border:"2px solid #ffb300",borderRadius:15,background:"#fffde7",padding:"4px 3px 7px"}:{})}}>{isI&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"#e65100",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:99,zIndex:1,whiteSpace:"nowrap"}}>나</div>}<div style={{fontSize:10,color:"#aaa",fontWeight:600}}>{p.name}</div><GCard g={p.gan} s={p.gan.sibsong}/><JCard j={p.ji} s={p.ji.sibsong}/></div>;})}
    </div>
    {b.isBoundary&&<div style={{marginTop:10,padding:"10px 12px",background:"#f9f9f9",borderRadius:9,fontSize:12,color:"#555",lineHeight:1.78,borderLeft:"3px solid #ffb300"}}>{w==="A"?b.standardDesc:b.midnightDesc}</div>}
    <div style={{marginTop:8,fontSize:11,color:"#ccc",textAlign:"center"}}>☀️ 양(陽) 적극·외향 &nbsp;·&nbsp; 🌙 음(陰) 수용·내향</div>
  </section>;
}

function Ohaeng({d}){
  const dist=d.ohaengDist,order=["水","木","火","土","金"],total=Object.values(dist).reduce((a,b)=>a+b,0)||1;
  const R=54,r=32,cx=68,cy=68;let cum=-Math.PI/2;
  const slices=order.map(o=>{const v=dist[o]||0,a=(v/total)*2*Math.PI,x1=cx+R*Math.cos(cum),y1=cy+R*Math.sin(cum);cum+=a;const x2=cx+R*Math.cos(cum),y2=cy+R*Math.sin(cum),ix1=cx+r*Math.cos(cum-a),iy1=cy+r*Math.sin(cum-a),ix2=cx+r*Math.cos(cum),iy2=cy+r*Math.sin(cum),lg=a>Math.PI?1:0;return{o,v,path:v===0?null:`M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${lg},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${ix2.toFixed(2)},${iy2.toFixed(2)} A${r},${r} 0 ${lg},0 ${ix1.toFixed(2)},${iy1.toFixed(2)} Z`};});
  const dom=order.reduce((a,b)=>(dist[a]||0)>=(dist[b]||0)?a:b);
  return <section style={S.card}>
    <ST icon="🌿" title="오행(五行) 분포" sub="다섯 기운의 균형"/>
    <GT>오행은 목(木)·화(火)·토(土)·금(金)·수(水) 다섯 가지 기운입니다. 사주 8글자에 담긴 분포로 타고난 기질을 파악합니다.</GT>
    <div style={{display:"flex",alignItems:"center",gap:14,marginTop:12}}>
      <svg width={136} height={136} viewBox="0 0 136 136" style={{flexShrink:0}}>
        {slices.map(s=>s.path&&<path key={s.o} d={s.path} fill={OC[s.o].chart} stroke="#fff" strokeWidth={2}/>)}
        <text x={cx} y={cy-8} textAnchor="middle" fontSize={10} fill="#999">{OC[dom].name}</text>
        <text x={cx} y={cy+9} textAnchor="middle" fontSize={20} fontWeight={900} fill={OC[dom].text}>{dist[dom]||0}개</text>
        <text x={cx} y={cy+24} textAnchor="middle" fontSize={10} fill="#bbb">{Math.round(((dist[dom]||0)/total)*100)}%</text>
      </svg>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}>
        {order.map(o=>{const c=OC[o],v=dist[o]||0,p=Math.round((v/total)*100);return <div key={o} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:9,height:9,borderRadius:2,background:c.chart,flexShrink:0}}/><div style={{fontSize:12,color:c.text,fontWeight:700,minWidth:44}}>{c.name}</div><div style={{flex:1,height:5,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:c.chart,borderRadius:99}}/></div><div style={{fontSize:12,color:"#888",minWidth:24,textAlign:"right"}}>{v}개</div></div>;})}
      </div>
    </div>
    <div style={{marginTop:10,padding:"10px 14px",background:"#e3f2fd",borderRadius:10,fontSize:13,color:"#0d47a1",lineHeight:1.75}}>{d.ohaengNote||""}</div>
    <div style={{marginTop:8,padding:"9px 12px",background:"#fafafa",borderRadius:10,display:"flex",alignItems:"center",gap:8,border:"1px solid #eee",marginBottom:8}}><span style={{fontSize:12,color:"#aaa"}}>신강·신약</span><span style={{fontSize:15,fontWeight:900,color:"#1565c0"}}>{d.singang}</span><span style={{fontSize:12,color:"#888"}}>— 癸축월(丑月) 득령, 신강 사주예요</span></div>
    <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:8,letterSpacing:.5}}>용신(도움되는 기운) · 희신(간접 도움) · 기신(피할 기운)</div>
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      {[
        {label:"A명식 기준 (자정)",bg:"#f1f8e9",border:"#c5e1a5",items:[
          {name:"용신",val:d.yongsinA,pillBg:"#33691e",pillTc:"#fff",valC:"#333"},
          {name:"희신",val:d.huisinA,pillBg:"#e8f5e0",pillTc:"#2d6a2d",valC:"#444"},
          {name:"기신",val:d.gisinA,pillBg:"#fdecea",pillTc:"#b71c1c",valC:"#444"},
        ]},
        {label:"B명식 기준 (야자시)",bg:"#fff8e1",border:"#ffe082",items:[
          {name:"용신",val:d.yongsinB,pillBg:"#e65100",pillTc:"#fff",valC:"#333"},
          {name:"희신",val:d.huisinB,pillBg:"#fff3e0",pillTc:"#7b5800",valC:"#444"},
          {name:"기신",val:d.gisinB,pillBg:"#fdecea",pillTc:"#b71c1c",valC:"#444"},
        ]},
      ].map(({label,bg,border,items})=>(
        <div key={label} style={{padding:"10px 12px",background:bg,borderRadius:10,border:`1px solid ${border}`}}>
          <div style={{fontSize:10,color:"#888",fontWeight:600,marginBottom:8}}>{label}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {items.map(({name,val,pillBg,pillTc,valC})=>(
              <div key={name} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{background:pillBg,color:pillTc,fontSize:11,fontWeight:800,padding:"5px 11px",borderRadius:99}}>{name}</span>
                <span style={{fontSize:12,fontWeight:900,color:valC}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>;
}

// 세운 바텀시트
const AREAS=[{k:"건강",i:"💪"},{k:"재물",i:"💰"},{k:"커리어",i:"💼"},{k:"관계",i:"🤝"},{k:"애정",i:"💕"}];
const MON=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const YMEMO={
  [CY]:"준비·정비기 (64점) — 역량 축적·네트워크 확장에 집중. 섣부른 이직보다 현장 실력 강화가 현명해요.",
  [CY+1]:"도약·황제기 (92점) — 丙午년 용신 활성. 귀인 등장, 승진·프로젝트 수주 집중. 상반기(3~6월)가 핵심이에요.",
  [CY+2]:"결실·공인기 (86점) — 씨앗이 결실. 자격·수상·강의·출판 등 외부 활동이 커리어를 도약시켜요.",
  [CY+3]:"리더십 정점 (93점) — 기획·전략·팀 운영 역할 확대. 괴강살 에너지가 결단력·카리스마로 빛나요.",
  [CY+4]:"황금기 절정 (97점) — 마스터넘버 22 대각성. 전문성과 실적이 공식 인정받는 최고조의 해예요.",
  [CY+5]:"전환·새 출발 (88점) — 쌓아온 것을 정리·계승. 새로운 10년 사이클 설계도를 그리는 해예요."
};
// 월별 한 줄 요약 — 간지별 특성 기반
const MMEMO={
  "을미":"未土 기운 — 조화와 협력이 필요한 달이에요. 관계에서 먼저 손 내밀면 좋겠네요.",
  "병신":"丙火 들어오는 달 — 용신 활성! 적극적으로 움직이기 좋은 타이밍이에요.",
  "정유":"丁火 입장 — 내면의 열정이 표면으로 올라오는 달이에요. 창의적 작업에 집중해요.",
  "무술":"戊土 비견 — 의지가 강해지는 달이에요. 혼자서 밀어붙이기보다 팀과 함께 가세요.",
  "기해":"己亥 일주 에너지 반복 — 직관이 예리해지는 달이에요. 느껴지는 대로 움직여도 돼요.",
  "경자":"庚金 들어오는 달 — 희신 활성! 실력이 인정받고 새로운 기회가 열리는 달이에요.",
  "신축":"辛金 설기 — 에너지를 아끼고 내실을 다지는 달이에요. 무리하지 않는 게 좋겠네요.",
  "임인":"壬水 편재 — 재물 기운이 움직이는 달이에요. 투자나 계약에 신경 쓸 타이밍이에요.",
  "계묘":"癸水 정재 — 꼼꼼하게 재무를 정리하기 좋은 달이에요. 지출 점검 필수예요.",
  "갑진":"갑목(甲木) 칠살 — 도전과 자극이 오는 달이에요. 긴장감을 성장의 연료로 쓰면 좋아요.",
  "을사":"乙木 편관 — 경쟁 에너지가 생기는 달이에요. 실력으로 승부하면 돼요.",
  "병오":"丙午 용신 절정 — 1년 중 가장 강한 에너지! 중요한 일을 이 달에 집중시키세요.",
  "정미":"丁未 희신 — 따뜻한 기운이 흐르는 달이에요. 관계에서 좋은 소식이 올 수 있어요.",
  "무신":"戊申 비견·식신 — 창의력이 올라오는 달이에요. 표현하고 싶은 것을 꺼내보세요.",
  "기유":"己酉 비견·정인 — 배움과 성장의 달이에요. 새로운 것을 익히기에 좋아요.",
  "경술":"庚戌 식신 — 현재 대운 기운과 공명! 실력 발휘 기회가 찾아오는 달이에요.",
  "신해":"辛亥 편인 — 직관과 영감의 달이에요. 평소 떠오르는 아이디어를 기록해두세요.",
  "임자":"壬子 편재 — 재물·인맥 두 가지가 동시에 움직이는 달이에요. 기회를 잡아요.",
  "계축":"癸丑 정재·겁재 — 월주와 동일한 에너지! 안정을 다지되 경쟁에 주의하세요.",
};
function getMonthMemo(gj){return MMEMO[gj]||"이 달의 에너지를 타고 유연하게 움직이는 게 좋겠네요.";}
// 연도별 점수: 파일 기준 2025=64,2026=92,2027=86,2028=93,2029=97,2030=88
const YEAR_SCORES={[CY]:64,[CY+1]:92,[CY+2]:86,[CY+3]:93,[CY+4]:97,[CY+5]:88};
function dS(y,m=0){
  if(!m&&YEAR_SCORES[y]) return YEAR_SCORES[y];
  const base=YEAR_SCORES[y]||75;
  return Math.min(95,Math.max(48,base+(Math.round(Math.sin(m*1.3)*8))));
}
function dD(y,m){const seed=y*12+(m||0);return Object.fromEntries(AREAS.map((a,i)=>[a.k,Math.min(90,Math.max(48,dS(y,m)+(((seed*(i+7))%13)-6)))]));}

function SeunSheet({item,onClose}){
  if(!item) return null;
  const score=dS(item.year,item.month||0),detail=dD(item.year,item.month||0);
  const title=item.month?`${item.year}년 ${item.month}월`:`${item.year}년`;
  const gj=item.month?mToGJ(item.year,item.month):yearToGJ(item.year);
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"12px 20px 36px",width:"100%",maxWidth:480,margin:"0 auto",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{width:36,height:4,background:"#e0e0e0",borderRadius:99,margin:"0 auto 16px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div><div style={{fontSize:11,color:"#aaa",marginBottom:2}}>{title} 세운(歲運)</div>
          <div style={{fontSize:18,fontWeight:900,color:"#111"}}>{item.hanja||gj.hanja}({item.ko||gj.ko})</div></div>
        <Ring score={score} size={50}/>
      </div>
      {/* 간지 설명 */}
      {item.month&&<div style={{display:"flex",gap:8,marginBottom:10}}>
        {[{g:gj.gan,isG:true,c:gc(gj.gan.ko)},{g:gj.ji,isG:false,c:jc(gj.ji.ko)}].map(({g,isG,c},pi)=><div key={pi} style={{flex:1,padding:"8px 10px",background:c.bg,borderRadius:9,border:`1px solid ${c.border}`,textAlign:"center"}}><div style={{fontSize:10,color:c.text,fontWeight:600,marginBottom:2}}>{isG?"천간(天干)":"지지(地支)"}</div><div style={{fontSize:16,fontWeight:900,color:c.text}}>{g.hanja}({g.ko})</div></div>)}
      </div>}
      <p style={{fontSize:13,color:"#444",lineHeight:1.85,margin:"0 0 14px",background:"#fafafa",padding:"11px 13px",borderRadius:10}}>{YMEMO[item.year]||`${item.hanja||gj.hanja}(${item.ko||gj.ko}) 에너지가 흐르는 시기예요. 흐름을 타고 유연하게 움직이는 게 좋겠네요.`}</p>
      <div style={{fontSize:12,color:"#aaa",fontWeight:700,marginBottom:9}}>분야별 운기</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {AREAS.map(a=>{const s=detail[a.k],c=s>=75?"#4caf50":s>=60?"#ffb300":"#ef5350";return <div key={a.k} style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,width:24}}>{a.i}</span><span style={{fontSize:13,fontWeight:700,width:46,color:"#333"}}>{a.k}</span><div style={{flex:1,height:8,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${s}%`,height:"100%",background:c,borderRadius:99}}/></div><span style={{fontSize:13,fontWeight:800,color:c,width:26,textAlign:"right"}}>{s}</span></div>;})}
      </div>
      <button style={{marginTop:20,width:"100%",padding:"13px 0",background:"#f5f5f5",border:"none",borderRadius:12,fontSize:14,fontWeight:700,color:"#555",cursor:"pointer"}} onClick={onClose}>닫기</button>
    </div>
  </div>;
}

function Seun(){
  const [st,setSt]=useState("year"),[sel,setSel]=useState(null);
  const ys=useMemo(()=>bYS(),[]),ms=useMemo(()=>bMS(),[]);
  return <>
    <section style={S.card}>
      <ST icon="📅" title="세운(歲運)" sub={`Today ${CY}.${CM}.${CD} 기준 자동 계산`}/>
      <GT>세운은 매년·매월 바뀌는 간지(干支) 에너지입니다. 오늘 날짜 기준으로 자동 계산됩니다.</GT>
      <div style={{display:"flex",gap:6,marginTop:10}}>{[["year",`연도별 ${CY}~${CY+5}`],["month","월별 12개월"]].map(([k,l])=><button key={k} onClick={()=>setSt(k)} style={{flex:1,padding:"7px 0",borderRadius:9,border:"1.5px solid #e65100",fontSize:12,fontWeight:700,cursor:"pointer",background:st===k?"#e65100":"#fff",color:st===k?"#fff":"#e65100"}}>{l}</button>)}</div>
      {st==="year"&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
        {ys.map((s,i)=>{
          const score=dS(s.year),cg=gc(s.gan.ko);
          return <button key={i} onClick={()=>setSel(s)}
            style={{...S.sRow,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit",...(s.isThis?{border:"2px solid #4caf50",background:"#f9fff8"}:{})}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Ring score={score} size={48}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
                  <span style={{fontSize:14,fontWeight:900,color:"#111"}}>{s.year}년</span>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:7,background:cg.bg,color:cg.text}}>{s.hanja}({s.ko})</span>
                  {s.isThis&&<span style={{fontSize:10,background:"#4caf50",color:"#fff",padding:"2px 6px",borderRadius:99,fontWeight:700}}>올해</span>}
                </div>
                <div style={{fontSize:12,color:"#555",lineHeight:1.5}}>{YMEMO[s.year]||"간지 에너지 흐름"}</div>
              </div>
              <span style={{fontSize:17,color:"#d0d0d0"}}>›</span>
            </div>
          </button>;
        })}
      </div>}
      {st==="month"&&<div style={{display:"flex",flexDirection:"column",gap:7,marginTop:12}}>
        {ms.map((s,i)=>{
          const score=dS(s.year,s.month),cg=gc(s.gan.ko),cj=jc(s.ji.ko);
          const memo=getMonthMemo(s.ko);
          return <button key={i} onClick={()=>setSel({...s,memo})}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:11,
              border:s.isThis?"2px solid #4caf50":"1px solid #ebebeb",
              background:s.isThis?"#f9fff8":"#fafafa",
              cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit"}}>
            <div style={{minWidth:44,textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:10,color:"#aaa",fontWeight:600}}>{s.year}</div>
              <div style={{fontSize:13,fontWeight:900,color:s.isThis?"#2e7d32":"#111"}}>{MON[s.month-1]}</div>
              {s.isThis&&<div style={{fontSize:9,background:"#4caf50",color:"#fff",borderRadius:99,padding:"1px 5px",marginTop:1,fontWeight:700}}>현재</div>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:4,marginBottom:4}}>
                {[{g:s.gan,isG:true,c:cg},{g:s.ji,isG:false,c:cj}].map(({g,isG,c},pi)=>(
                  <div key={pi} style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,fontSize:11,padding:"4px 7px",borderRadius:7,fontWeight:700,position:"relative",paddingTop:12}}>
                    <span style={{position:"absolute",top:1,right:2,fontSize:9}}>{yyE(g.ko,isG)}</span>
                    {g.hanja}({g.ko})
                  </div>
                ))}
              </div>
              <div style={{fontSize:11,color:"#555",lineHeight:1.5}}>{memo}</div>
            </div>
            <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
              <Ring score={score} size={42}/>
              <span style={{fontSize:16,color:"#d0d0d0"}}>›</span>
            </div>
          </button>;
        })}
      </div>}
    </section>
    <SeunSheet item={sel} onClose={()=>setSel(null)}/>
  </>;
}

function TabSaju({d}){
  return <>
    <BndBanner b={d.boundary}/>
    <Manseryeok d={d}/>
    <Ohaeng d={d}/>
    <section style={S.card}>
      <ST icon="⭐" title="신살(神殺)"/>
      <GT>신살은 사주 글자들의 특정 조합에서 발생하는 특수한 기운입니다. 타고난 재능이나 삶에서 반복되는 패턴으로 나타납니다.</GT>
      <Acc items={(d.sinsal||[]).map(s=>({title:s.name,sub:s.hanja,easy:s.easy,desc:s.desc,tag:s.found}))}/>
    </section>
    <section style={S.card}>
      <ST icon="🔗" title="합(合)·충(沖)·형(刑)"/>
      <GT>사주 글자들은 서로 끌어당기거나(합), 충돌하거나(충), 마찰을 일으킵니다(형). 성격·인간관계·삶의 패턴에 직접 영향을 줍니다.</GT>
      <Acc items={[
        ...d.hap.map(h=>({title:h.pair,easy:h.easy,desc:h.desc,badge:{label:h.type,bg:"#e8f5e0",text:"#2d6a2d"}})),
        ...(d.hyeong||[]).map(h=>({title:h.name,easy:"무은지형 — 믿는 사람에게 배신당하는 에너지",desc:h.desc,badge:{label:h.type,bg:"#fdecea",text:"#b71c1c"}})),
      ]}/>
      {d.chung.length===0&&<div style={{marginTop:10,padding:"10px 14px",background:"#f9fbe7",borderRadius:10,fontSize:13,color:"#558b2f",lineHeight:1.75}}>✅ 충(沖) 없음 — 원국 내 큰 충돌 에너지가 없는 구조예요.</div>}
    </section>
    <section style={S.card}>
      <ST icon="🌊" title="대운(大運)" sub={`${d.daeunDir} · 만 ${d.daeunStart}세 시작`}/>
      <GT>대운은 10년마다 교체되는 외부 에너지입니다. 임(壬)년생 여성은 음양역순으로 역행(逆行)하며, 소한(小寒·1/6)까지 11일 ÷ 3 = 만 {d.daeunStart}세에 시작합니다.</GT>
      <div style={{position:"relative",marginTop:16,paddingLeft:38}}>
        <div style={{position:"absolute",left:16,top:8,bottom:8,width:2,background:"linear-gradient(to bottom,#ffb300,#e0e0e0)",borderRadius:99}}/>
        {(d.daeun||[]).map((dv,i)=>{
          const g=gc(dv.label[0]),j=jc(dv.label[1]);
          return (
            <div key={i} style={{position:"relative",marginBottom:i<d.daeun.length-1?12:0}}>
              <div style={{position:"absolute",left:-28,top:14,width:14,height:14,borderRadius:"50%",
                background:dv.cur?"#e65100":"#ddd",
                border:`2.5px solid ${dv.cur?"#ffb300":"#ccc"}`,
                zIndex:1,boxShadow:dv.cur?"0 0 0 3px rgba(230,81,0,.15)":"none"}}/>
              <div style={{...S.dCard,...(dv.cur?{border:"2px solid #ffb300",background:"#fffde7"}:{})}}>
                {dv.cur&&<span style={{position:"absolute",top:-10,left:12,background:"#e65100",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 9px",borderRadius:99}}>현재 대운</span>}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{display:"flex",gap:4}}>
                    <span style={{...S.dBadge,background:g.bg,color:g.text,borderColor:g.border}}>{dv.hanja[0]}({dv.label[0]})</span>
                    <span style={{...S.dBadge,background:j.bg,color:j.text,borderColor:j.border}}>{dv.hanja[1]}({dv.label[1]})</span>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:"#222"}}>{dv.period}</div>
                    <div style={{fontSize:10,color:"#999"}}>{OC[dv.ohaeng]?.name} 기운</div>
                  </div>
                </div>
                <p style={{fontSize:12,color:"#555",margin:0,lineHeight:1.75}}>{dv.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
    <Seun/>
  </>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. 낮과 밤 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TabDayNight({d}){
  const dn=d.daynight;
  return <>
    <section style={{...S.card,background:"linear-gradient(135deg,#fff8e1,#fffde7)",borderColor:"#ffe082"}}>
      <ST icon="☯️" title="낮과 밤 — 심층 심리·욕망 분석"/>
      <p style={{fontSize:13,color:"#7b5800",lineHeight:1.85,margin:"10px 0 0"}}>{dn.overview}</p>
    </section>
    <section style={S.card}>
      <ST icon="☀️" title="낮의 나 — 사회적 페르소나"/>
      <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
        {[
          {t:"첫인상",c:"#e3f2fd",tc:"#0d47a1",v:dn.day.impression},
          {t:"사회에서 쓰는 가면",c:"#f3e5f5",tc:"#4a148c",v:dn.day.mask},
        ].map(({t,c,tc,v})=>(
          <div key={t} style={{minHeight:72,padding:"10px 14px",background:c,borderRadius:11,display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div style={{fontSize:12,fontWeight:800,color:tc,marginBottom:v?4:0}}>{t}</div>
            {v&&<p style={{fontSize:13,color:"#444",margin:0,lineHeight:1.75}}>{v}</p>}
          </div>
        ))}
      </div>
    </section>
    <section style={S.card}>
      <ST icon="🌙" title="밤의 나 — 숨겨진 본능과 욕망"/>
      <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
        {[
          {key:"desire",bg:"#1a1a2e",tc:"#a78bfa",label:"내면의 결핍과 진짜 욕망",v:dn.night.desire,v2:dn.night.desire2},
          {key:"trigger",bg:"#1e1b4b",tc:"#818cf8",label:"본능이 폭발하는 트리거 3가지",triggers:dn.night.triggers},
          {key:"attract",bg:"#312e81",tc:"#c4b5fd",label:"이성에게 치명적인 은밀한 매력",v:dn.night.attraction},
          {key:"ideal",bg:"#1e293b",tc:"#7dd3fc",label:"이상형",v:dn.night.idealType},
          {key:"real",bg:"#0f172a",tc:"#86efac",label:"실제 궁합",v:dn.night.idealType2},
        ].map(({key,bg,tc,label,v,v2,triggers})=>(
          <div key={key} style={{minHeight:72,padding:"10px 14px",background:bg,borderRadius:11,display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div style={{fontSize:12,fontWeight:800,color:tc,marginBottom:(v||v2||triggers?.length)?5:0}}>{label}</div>
            {v&&<p style={{fontSize:13,color:"#ddd",margin:0,lineHeight:1.75}}>{v}</p>}
            {v2&&<p style={{fontSize:13,color:"#c4b5fd",margin:"8px 0 0",lineHeight:1.75,borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:8}}>{v2}</p>}
            {triggers&&(triggers||[]).map((t,i)=>(
              <div key={i} style={{fontSize:13,color:"#e0e7ff",padding:"4px 0",borderBottom:i<triggers.length-1?"1px dashed #ffffff22":"none",lineHeight:1.6}}>
                <span style={{color:tc,fontWeight:700,marginRight:6}}>{i+1}.</span>{t}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>

  </>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. 토정·주역·당사주 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TabTojung({d}){
  const tj=d.tojung,ic=d.iching,ds=d.dansaju;
  const [showM,setShowM]=useState(false);
  return <>
    {/* 토정비결 */}
    <section style={S.card}>
      <ST icon="📜" title="토정비결(土亭秘訣)"/>
      <GT>토정비결은 조선 중기 이지함(李之菡) 선생이 집대성한 민간 예언서입니다. 년주·월주·시주를 수리화하여 상괘(上卦)·중괘(中卦)·하괘(下卦)를 산출합니다.</GT>
      <div style={{display:"flex",gap:8,marginTop:12}}>
        {[{l:"상괘(上卦)",v:tj.sang},{l:"중괘(中卦)",v:tj.jung},{l:"하괘(下卦)",v:tj.ha}].map(({l,v})=><div key={l} style={{flex:1,padding:"10px",background:"#fff8e1",borderRadius:10,textAlign:"center",border:"1px solid #ffe082"}}><div style={{fontSize:10,color:"#7b5800",fontWeight:700,marginBottom:3}}>{l}</div><div style={{fontSize:22,fontWeight:900,color:"#e65100"}}>{v}</div></div>)}
      </div>
      <div style={{marginTop:10,padding:"14px 15px",background:"#e8f5e0",borderRadius:11,border:"1px solid #a5d6a7"}}>
        <div style={{fontSize:11,color:"#2d6a2d",fontWeight:700,marginBottom:5}}>본명 총운(總運) 사자성어</div>
        <div style={{fontSize:20,fontWeight:900,color:"#1b5e20",marginBottom:6}}>{tj.saja}</div>
        <p style={{fontSize:13,color:"#388e3c",margin:0,lineHeight:1.78}}>{tj.bonunDesc}</p>
      </div>
      <div style={{marginTop:12}}><div style={{fontSize:12,fontWeight:800,color:"#333",marginBottom:8}}>연도별 운세 ({CY}~{CY+5})</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {tj.yearFlow.map((y,i)=><div key={i} style={{padding:"11px 13px",background:"#fafafa",borderRadius:10,border:"1px solid #eee"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}><Ring score={y.score} size={46}/><div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:2}}><span style={{fontSize:14,fontWeight:900,color:y.year===CY?"#2e7d32":"#111"}}>{y.year}년</span>{y.year===CY&&<span style={{fontSize:9,background:"#4caf50",color:"#fff",padding:"2px 6px",borderRadius:99,fontWeight:700}}>올해</span>}<span style={{fontSize:10,background:"#fff8e1",color:"#7b5800",padding:"2px 7px",borderRadius:99,fontWeight:700}}>{y.month}</span></div><div style={{fontSize:12,color:"#555"}}>{y.desc}</div></div></div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{Object.entries(y.areas).map(([k,v])=><div key={k} style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:scBg(v),color:sc(v),fontWeight:700}}>{k} {v}점</div>)}</div>
          </div>)}
        </div>
      </div>
      <div style={{marginTop:12}}><button onClick={()=>setShowM(!showM)} style={{width:"100%",padding:"10px 14px",background:"#f5f5f5",border:"1px solid #e0e0e0",borderRadius:10,fontSize:13,fontWeight:700,color:"#333",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}><span>2026년 월별 길흉</span><span style={{fontSize:14,color:"#aaa"}}>{showM?"▲":"▼"}</span></button>
        {showM&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:8}}>{(tj.month2026||[]).map((m,i)=><div key={i} style={{padding:"8px",background:scBg(m.score),borderRadius:9,textAlign:"center"}}><div style={{fontSize:11,fontWeight:800,color:sc(m.score)}}>{m.m}월</div><div style={{fontSize:18,fontWeight:900,color:sc(m.score)}}>{m.score}</div><div style={{fontSize:10,color:"#666",marginTop:2,lineHeight:1.4}}>{m.desc}</div></div>)}</div>}
      </div>
    </section>
    {/* 주역 */}
    <section style={S.card}>
      <ST icon="☯️" title="주역(周易) 본명괘"/>
      <GT>주역은 64괘(卦)로 우주의 변화와 인간의 운명을 해석하는 동양 철학 체계입니다. 사주 오행 기반 도출법 적용 — 사주 최다 오행(수水)→상괘 坎(감), 일간 관성 오행(목木)→하괘 震(진). 坎+震 = 수뢰둔(水雷屯) 제3괘.</GT>
      <div style={{marginTop:12,padding:"16px",background:"linear-gradient(135deg,#e3f2fd,#e8eaf6)",borderRadius:12,textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:4,letterSpacing:4}}>{ic.gaeSymbol}</div>
        <div style={{fontSize:18,fontWeight:900,color:"#1565c0"}}>{ic.bonmyeonggae}</div>
        <div style={{fontSize:11,color:"#5c6bc0",marginTop:3}}>{ic.gaeNature}</div>
        <div style={{fontSize:11,color:"#888",marginTop:4}}>상괘 {ic.gaeUpper} / 하괘 {ic.gaeLower}</div>
      </div>
      <p style={{fontSize:13,color:"#444",lineHeight:1.85,margin:"10px 0 0"}}>{ic.gaeDesc}</p>
      <div style={{marginTop:10,padding:"11px 13px",background:"#e3f2fd",borderRadius:10}}><div style={{fontSize:11,color:"#0d47a1",fontWeight:700,marginBottom:3}}>현재 변괘 ({ic.currentYear})</div><div style={{fontSize:15,fontWeight:900,color:"#1565c0"}}>{ic.currentGae}</div><p style={{fontSize:12,color:"#555",margin:"5px 0 0",lineHeight:1.7}}>{ic.currentDesc}</p></div>
      <div style={{marginTop:10,padding:"11px 13px",background:"#f9f9f9",borderRadius:10}}><div style={{fontSize:12,fontWeight:800,color:"#333",marginBottom:7}}>주역이 전하는 인생 전략 3가지</div>{ic.strategy.map((s,i)=><div key={i} style={{fontSize:13,color:"#555",padding:"5px 0",borderBottom:i<2?"1px dashed #eee":"none",lineHeight:1.7}}><span style={{fontWeight:700,color:"#e65100",marginRight:6}}>{i+1}.</span>{s}</div>)}</div>
      <div style={{marginTop:10}}><div style={{fontSize:12,fontWeight:800,color:"#333",marginBottom:8}}>연도별 괘 에너지</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {ic.yearFlow.map((y,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#fafafa",borderRadius:10,border:"1px solid #eee"}}><Ring score={y.score} size={44}/><div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}><span style={{fontSize:13,fontWeight:900,color:"#111"}}>{y.year}년</span><span style={{fontSize:11,color:"#888"}}>{y.gae}</span></div><div style={{fontSize:12,color:"#555",lineHeight:1.6}}>{y.desc}</div></div></div>)}
        </div>
      </div>
    </section>
    {/* 당사주 */}
    <section style={S.card}>
      <ST icon="⭐" title="당사주(唐四柱)"/>
      <GT>당사주는 년지·월지·일지·시지의 12지지를 기준으로 별성(別星)과 십이운성(十二運星)을 분석합니다. 일간 무토(戊土) 기준 십이운성을 적용합니다.</GT>
      <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:12}}>
        {ds.pillars.map((p,i)=>{
          const jColor=jc(p.ji);
          return <div key={i} style={{padding:"12px 14px",background:"#fafafa",borderRadius:12,border:"1px solid #eee"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
              <div style={{width:36,height:36,borderRadius:10,background:jColor.bg,border:`1.5px solid ${jColor.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontSize:14,fontWeight:900,color:jColor.text}}>{JH[JL.indexOf(p.ji)]}</div>
                <div style={{fontSize:9,color:jColor.text,opacity:.7}}>{p.ji}</div>
              </div>
              <div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:800,color:"#111"}}>{p.byeolseong}</span>
                  <span style={{fontSize:11,color:"#e65100",background:"#fff3e0",padding:"1px 7px",borderRadius:99,fontWeight:700}}>{p.stage}</span>
                </div>
                <div style={{fontSize:11,color:"#888"}}>{p.palace}</div>
              </div>
            </div>
            <p style={{fontSize:12,color:"#555",margin:0,lineHeight:1.75}}>{p.desc}</p>
          </div>;
        })}
      </div>
      <div style={{marginTop:10,padding:"11px 13px",background:"#e8f5e0",borderRadius:10}}><div style={{fontSize:12,fontWeight:800,color:"#2d6a2d",marginBottom:5}}>당사주 종합 기질</div><p style={{fontSize:13,color:"#333",margin:0,lineHeight:1.8}}>{ds.overall}</p></div>
      <div style={{marginTop:10}}><div style={{fontSize:12,fontWeight:800,color:"#333",marginBottom:8}}>연도별 운세</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {ds.yearFlow.map((y,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#fafafa",borderRadius:10,border:"1px solid #eee"}}><Ring score={y.score} size={44}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:900,color:"#111",marginBottom:2}}>{y.year}년</div><div style={{fontSize:12,color:"#555",lineHeight:1.6}}>{y.desc}</div></div></div>)}
        </div>
      </div>
    </section>
  </>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. 별자리·타로 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TabAstro({d}){
  const a=d.astro,t=d.tarot;
  return <>
    <section style={S.card}>
      <ST icon="✨" title="서양 점성술 네이탈 차트"/>
      <GT>출생 시각과 장소를 기준으로 행성의 위치를 분석합니다. 태양·달·ASC 삼각 관계가 성격의 핵심 구조를 이룹니다.</GT>
      <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:7}}>
        {[
          {l:"태양 ☉",v:a.sun,meaning:a.sunMeaning,desc:a.sunDesc,bg:"#fff8e1",c:"#f57f17"},
          {l:"달 ☽",v:a.moon,meaning:a.moonMeaning,desc:a.moonDesc,bg:"#e8f5e0",c:"#2e7d32"},
          {l:"ASC 상승점",v:a.asc,meaning:a.ascMeaning,desc:a.ascDesc,bg:"#fce4ec",c:"#880e4f"},
          {l:"수성 ☿",v:a.mercury,meaning:"언어·사고·소통 방식",desc:a.mercuryDesc,bg:"#f3f3f3",c:"#424242"},
          {l:"금성 ♀",v:a.venus,meaning:"사랑·가치관·매력",desc:a.venusDesc,bg:"#fce4ec",c:"#c62828"},
          {l:"화성 ♂",v:a.mars,meaning:"행동력·에너지·욕망",desc:a.marsDesc,bg:"#fdecea",c:"#b71c1c"},
        ].map((item,i)=>(
          <div key={i} style={{padding:"10px 13px",background:item.bg,borderRadius:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
              <span style={{fontSize:11,fontWeight:700,color:item.c,minWidth:72,flexShrink:0}}>{item.l}</span>
              <span style={{fontSize:13,fontWeight:900,color:"#111"}}>{item.v}</span>
            </div>
            <div style={{fontSize:10,color:"#999",marginBottom:4}}>{item.meaning}</div>
            <p style={{fontSize:12,color:"#555",margin:0,lineHeight:1.65}}>{item.desc}</p>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,padding:"11px 13px",background:"#f3e5f5",borderRadius:10}}><div style={{fontSize:11,color:"#4a148c",fontWeight:700,marginBottom:4}}>삼각 핵심 분석</div><p style={{fontSize:13,color:"#444",margin:0,lineHeight:1.8}}>{a.triangle}</p></div>
      <div style={{marginTop:8,padding:"10px 13px",background:"#e8f5e0",borderRadius:10}}><div style={{fontSize:11,color:"#2d6a2d",fontWeight:700,marginBottom:3}}>스텔리움(Stellium)</div><p style={{fontSize:13,color:"#333",margin:0,lineHeight:1.7}}>{a.stellium}</p></div>
      <div style={{marginTop:12}}><div style={{fontSize:12,fontWeight:800,color:"#333",marginBottom:8}}>주요 트랜짓 {CY}~{CY+5}</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {a.yearTransit.map((y,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#fafafa",borderRadius:10,border:"1px solid #eee"}}><Ring score={y.score} size={44}/><div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}><span style={{fontSize:13,fontWeight:900,color:"#111"}}>{y.year}년</span><span style={{fontSize:11,color:"#5e35b1",fontWeight:700}}>{y.planet}</span></div><div style={{fontSize:12,color:"#555",lineHeight:1.6}}>{y.desc}</div></div></div>)}
        </div>
      </div>
    </section>
    <section style={S.card}>
      <ST icon="🃏" title="타로 · 수비학"/>
      <p style={{fontSize:13,color:"#666",lineHeight:1.78,margin:"10px 0 12px",borderLeft:"3px solid #e8e8e8",paddingLeft:10}}>{t.calc}</p>
      <div style={{display:"flex",gap:10,marginBottom:10}}>
        <div style={{flex:1,padding:"13px",background:"linear-gradient(135deg,#e3f2fd,#f3e5f5)",borderRadius:12,textAlign:"center"}}>
          <div style={{fontSize:10,color:"#555",marginBottom:3}}>생명경로수</div>
          <div style={{fontSize:34,fontWeight:900,color:"#1565c0"}}>{t.lifePath}</div>
        </div>
        <div style={{flex:2,padding:"13px",background:"#fafafa",borderRadius:12,border:"1px solid #eee"}}>
          <div style={{fontSize:11,color:"#888",marginBottom:3}}>본명 타로 카드</div>
          <div style={{fontSize:15,fontWeight:900,color:"#111"}}>{t.lifePathCard}</div>
          <div style={{fontSize:20,fontWeight:900,color:"#5e35b1",marginTop:2}}>{t.lifePathCardNum}</div>
        </div>
      </div>
      <p style={{fontSize:13,color:"#444",lineHeight:1.85,margin:"0 0 10px"}}>{t.lifePathDesc}</p>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <div style={{flex:1,padding:"10px 11px",background:"#e3f2fd",borderRadius:10}}>
          <div style={{fontSize:10,color:"#0d47a1",fontWeight:700,marginBottom:2}}>영혼 카드(Soul)</div>
          <div style={{fontSize:13,fontWeight:800,color:"#1565c0"}}>{t.soulCard}</div>
          <div style={{fontSize:11,color:"#555",marginTop:3}}>{t.soulDesc}</div>
        </div>
        <div style={{flex:1,padding:"10px 11px",background:"#e8f5e0",borderRadius:10}}>
          <div style={{fontSize:10,color:"#2d6a2d",fontWeight:700,marginBottom:2}}>성취 카드(Achievement)</div>
          <div style={{fontSize:13,fontWeight:800,color:"#1b5e20"}}>{t.achieveCard}</div>
          <div style={{fontSize:11,color:"#555",marginTop:3}}>{t.achieveDesc}</div>
        </div>
      </div>
      <div style={{fontSize:12,fontWeight:800,color:"#333",marginBottom:8}}>연도별 개인연도수 & 타로</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {(t.yearCards||[]).map((y,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
            background:y.num===22?"linear-gradient(135deg,#7c3aed,#4f46e5)":"#fafafa",
            borderRadius:10,border:y.num===22?"none":"1px solid #eee"}}>
            <div style={{minWidth:28,height:28,borderRadius:"50%",
              background:y.num===22?"#ffd700":"linear-gradient(135deg,#7c4dff,#e040fb)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:900,color:y.num===22?"#1a1a1a":"#fff",flexShrink:0}}>{y.num}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:900,color:y.num===22?"#ffd700":"#111"}}>{y.year}년</span>
                <span style={{fontSize:11,color:y.num===22?"#c4b5fd":"#5e35b1",fontWeight:700}}>{y.card}</span>
                <span style={{fontSize:12,fontWeight:900,color:sc(y.score)}}>{y.score}점</span>
              </div>
              <div style={{fontSize:12,color:y.num===22?"#e0e7ff":"#555",lineHeight:1.6}}>{y.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  </>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. MBTI 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TabMBTI({d}){
  const m=d.mbti;
  return <>
    <section style={{...S.card,background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderColor:"#4338ca"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
        <div style={{width:64,height:64,borderRadius:16,background:"linear-gradient(135deg,#7c3aed,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff",flexShrink:0,textAlign:"center",lineHeight:1.3}}>
          {m.estType}<br/><span style={{fontSize:10,opacity:.8}}>/ESTJ</span>
        </div>
        <div>
          <div style={{fontSize:11,color:"#a5b4fc",marginBottom:3}}>사주 교차 분석 MBTI</div>
          <div style={{fontSize:20,fontWeight:900,color:"#e0e7ff"}}>{m.estimated}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        {[{type:m.estType,color:"#7c3aed",desc:"공감·조화·관계 중심. 가까운 사람을 돌보고 분위기를 맞추는 에너지예요."},{type:m.esType,color:"#2563eb",desc:"원칙·효율·책임 중심. 역할이 명확한 환경에서 최대치를 발휘해요."}].map(({type,color,desc})=>(
          <div key={type} style={{flex:1,padding:"10px",background:"rgba(255,255,255,0.08)",borderRadius:10,border:`1px solid ${color}55`}}>
            <div style={{fontSize:14,fontWeight:900,color,marginBottom:4}}>{type}</div>
            <div style={{fontSize:11,color:"#c4b5fd",lineHeight:1.6}}>{desc}</div>
          </div>
        ))}
      </div>
      <p style={{fontSize:12,color:"#c4b5fd",lineHeight:1.75,margin:0}}>{m.basis}</p>
    </section>
    <section style={S.card}>
      <ST icon="🧠" title="4축 분석"/>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
        {(m.axes||[]).map((ax,i)=>{
          const pct=ax.score,c=pct>=70?"#5e35b1":"#0d47a1";
          return <div key={i} style={{padding:"12px 14px",background:"#fafafa",borderRadius:11,border:"1px solid #eee"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#e8eaf6,#c5cae9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#1a237e",flexShrink:0}}>
                {ax.axis.split(" ")[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:800,color:"#111"}}>{ax.axis}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                  <div style={{flex:1,height:6,background:"#e8eaf6",borderRadius:99,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:99}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:800,color:c}}>{pct}%</span>
                </div>
              </div>
            </div>
            <div style={{fontSize:12,color:"#555",lineHeight:1.7}}>{ax.basis}</div>
          </div>;
        })}
      </div>
    </section>
    <section style={S.card}>
      <ST icon="⚡" title="경계 기능 (F↔T)"/>
      <div style={{padding:"12px 14px",background:"#fff8e1",borderRadius:11,border:"1px solid #ffe082",marginTop:10}}><p style={{fontSize:13,color:"#5d4037",margin:0,lineHeight:1.8}}>{m.borderline}</p></div>
    </section>
    <section style={S.card}>
      <ST icon="🌟" title="강점·과제·최적 환경"/>
      <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{padding:"12px 14px",background:"#e8f5e0",borderRadius:11}}><div style={{fontSize:12,fontWeight:800,color:"#2d6a2d",marginBottom:7}}>강점(Strengths)</div>{(m.strengths||[]).map((s,i)=><div key={i} style={{fontSize:13,color:"#333",padding:"4px 0",borderBottom:i<m.strengths.length-1?"1px dashed #c8e6c9":"none",lineHeight:1.7}}><span style={{color:"#4caf50",fontWeight:700,marginRight:6}}>✓</span>{s}</div>)}</div>
        <div style={{padding:"12px 14px",background:"#fdecea",borderRadius:11}}><div style={{fontSize:12,fontWeight:800,color:"#b71c1c",marginBottom:7}}>성장 과제(Challenges)</div>{(m.challenges||[]).map((s,i)=><div key={i} style={{fontSize:13,color:"#333",padding:"4px 0",borderBottom:i<m.challenges.length-1?"1px dashed #ffcdd2":"none",lineHeight:1.7}}><span style={{color:"#ef5350",fontWeight:700,marginRight:6}}>△</span>{s}</div>)}</div>
        <div style={{padding:"12px 14px",background:"#e3f2fd",borderRadius:11}}><div style={{fontSize:12,fontWeight:800,color:"#0d47a1",marginBottom:5}}>최적 환경</div><p style={{fontSize:13,color:"#333",margin:0,lineHeight:1.75}}>{m.bestEnv}</p></div>
        <div style={{padding:"12px 14px",background:"#f3e5f5",borderRadius:11}}><div style={{fontSize:12,fontWeight:800,color:"#4a148c",marginBottom:5}}>회복 방법</div><p style={{fontSize:13,color:"#333",margin:0,lineHeight:1.75}}>{m.recovery}</p></div>
      </div>
    </section>
  </>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. 메인
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 로딩 화면 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const OHAENG_LOADING=[
  {symbol:"木",color:"#66bb6a",bg:"#e8f5e0",name:"목"},
  {symbol:"火",color:"#ef5350",bg:"#fdecea",name:"화"},
  {symbol:"土",color:"#ffb300",bg:"#fff8e1",name:"토"},
  {symbol:"金",color:"#90a4ae",bg:"#f3f3f3",name:"금"},
  {symbol:"水",color:"#42a5f5",bg:"#e3f2fd",name:"수"},
];

function LoadingScreen({name}){
  const [idx,setIdx]=useState(0);
  const [visible,setVisible]=useState(true);
  useEffect(()=>{
    const iv=setInterval(()=>{
      setVisible(false);
      setTimeout(()=>{setIdx(i=>(i+1)%OHAENG_LOADING.length);setVisible(true);},300);
    },900);
    return()=>clearInterval(iv);
  },[]);
  const cur=OHAENG_LOADING[idx];
  return(
    <div style={{position:"fixed",inset:0,background:"#f4f4f6",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:50}}>
      <div style={{
        width:120,height:120,borderRadius:32,background:cur.bg,
        display:"flex",alignItems:"center",justifyContent:"center",
        marginBottom:24,
        transition:"opacity 0.3s, transform 0.3s",
        opacity:visible?1:0,
        transform:visible?"scale(1)":"scale(0.9)",
        boxShadow:`0 8px 32px ${cur.color}40`,
      }}>
        <span style={{fontSize:56,fontWeight:900,color:cur.color,fontFamily:"serif"}}>{cur.symbol}</span>
      </div>
      <div style={{fontSize:14,color:"#888",fontWeight:600,marginBottom:6}}>{name||""}님의 사주를 분석하고 있어요</div>
      <div style={{display:"flex",gap:6,marginTop:4}}>
        {OHAENG_LOADING.map((_,i)=>(
          <div key={i} style={{width:6,height:6,borderRadius:99,background:i===idx?OHAENG_LOADING[i].color:"#ddd",transition:"background 0.3s"}}/>
        ))}
      </div>
    </div>
  );
}

export default function SajuReport(){
  const [tab,setTab]=useState("요약");
  const [phase,setPhase]=useState("form");
  const [opacity,setOpacity]=useState(1);
  const [reportData,setReportData]=useState(null);
  const TABS=["요약","사주","낮과 밤","토정·주역","별자리·타로","MBTI"];

  function changeTab(t){
    setTab(t);
    setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),10);
  }

  function handleFormSubmit(formInput){
    setOpacity(0);
    setTimeout(()=>{
      const data=buildSajuData(formInput);
      setReportData(data);
      setPhase("loading");
      setOpacity(1);
      setTimeout(()=>{
        setOpacity(0);
        setTimeout(()=>{
          setPhase("report");
          setTab("요약");
          setOpacity(1);
          window.scrollTo({top:0});
        },300);
      },1800);
    },350);
  }

  function goToForm(){
    setOpacity(0);
    setTimeout(()=>{setPhase("form");setOpacity(1);},300);
  }

  const wrapStyle={transition:"opacity 0.35s ease",opacity};
  const d=reportData;
  const gBg=d.gender==="여"?"#fce4ec":"#e3f2fd";
  const gC=d.gender==="여"?"#880e4f":"#0d47a1";

  if(phase==="loading") return <LoadingScreen name={reportData?.name||""}/>;
  if(phase==="form"||!d) return <div style={wrapStyle}><SajuInputForm onSubmit={handleFormSubmit}/></div>;

  return <div style={{...wrapStyle,...S.root}}>
    <div style={S.header}>
      <button style={S.navBtn} onClick={goToForm}>‹</button>
      <div style={S.headerTitle}>fortuneyam</div>
      <button style={S.navBtn} onClick={()=>changeTab("요약")}>⌂</button>
    </div>
    <div style={S.profileBar}>
      <div>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <div style={S.pName}>{d.name}</div>
          <div style={{fontSize:12,color:"#e65100",fontWeight:700,background:"#fff3e0",padding:"2px 8px",borderRadius:99}}>{d.animalDesc} {d.animal}</div>
        </div>
        <div style={S.pBirth}>{d.birth} 生</div>
      </div>
      <div style={{padding:"4px 12px",borderRadius:99,fontSize:13,fontWeight:700,background:gBg,color:gC}}>{d.gender}성</div>
    </div>
    <div style={{...S.tabBar,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
      {TABS.map(t=><button key={t} onClick={()=>changeTab(t)} style={{...S.tab,minWidth:60,whiteSpace:"nowrap",...(tab===t?S.tabA:{})}}>{t}</button>)}
    </div>
    <div style={S.content}>
      {tab==="요약"        && <TabSummary d={d} changeTab={changeTab}/>}
      {tab==="사주"        && <TabSaju d={d}/>}
      {tab==="낮과 밤"     && <TabDayNight d={d}/>}
      {tab==="토정·주역"   && <TabTojung d={d}/>}
      {tab==="별자리·타로" && <TabAstro d={d}/>}
      {tab==="MBTI"        && <TabMBTI d={d}/>}
    </div>
    <div style={{textAlign:"center",fontSize:10,color:"#ccc",padding:"20px 0 8px"}}>
      ✦ fortuneyam · Today {CY}.{String(CM).padStart(2,"0")}.{String(CD).padStart(2,"0")}
    </div>
  </div>;
}


const S={
  root:{fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif",maxWidth:480,margin:"0 auto",background:"#f4f4f6",minHeight:"100vh",paddingBottom:48},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"#fff",borderBottom:"1px solid #eee",position:"sticky",top:0,zIndex:20},
  navBtn:{background:"none",border:"none",fontSize:22,color:"#333",cursor:"pointer",width:32,padding:0},
  headerTitle:{fontSize:16,fontWeight:700,color:"#111"},
  profileBar:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",background:"#fff",borderBottom:"1px solid #f0f0f0"},
  pName:{fontSize:22,fontWeight:900,color:"#111",letterSpacing:-.5},
  pBirth:{fontSize:12,color:"#999",marginTop:2},
  tabBar:{display:"flex",background:"#fff",borderBottom:"2px solid #f0f0f0",position:"sticky",top:49,zIndex:19},
  tab:{flex:1,padding:"11px 0",fontSize:11,fontWeight:600,background:"none",border:"none",color:"#bbb",cursor:"pointer",borderBottom:"2.5px solid transparent",marginBottom:-2,transition:"color .2s,border-color .2s"},
  tabA:{color:"#e65100",borderBottomColor:"#e65100"},
  content:{padding:"12px 14px",display:"flex",flexDirection:"column",gap:11},
  card:{background:"#fff",borderRadius:16,padding:"16px",border:"1px solid #ebebeb",boxShadow:"0 1px 5px rgba(0,0,0,0.04)"},
  dCard:{background:"#fafafa",borderRadius:12,padding:"13px",border:"1px solid #eee",position:"relative"},
  dBadge:{fontSize:12,fontWeight:700,padding:"4px 7px",borderRadius:8,border:"1px solid"},
  sRow:{background:"#fafafa",borderRadius:12,padding:"13px",border:"1px solid #ebebeb"},
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 입력 폼 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CITIES=[
  "서울","부산","대구","인천","광주","대전","울산","세종",
  "경기","강원","충북","충남","전북","전남","경북","경남","제주",
  "경북 경산","경북 포항","경북 구미","경북 안동",
  "경남 창원","경남 진주","전남 순천","전북 전주",
];
const HOURS=Array.from({length:24},(_,i)=>String(i).padStart(2,"0"));
const MINS_ALL=Array.from({length:60},(_,i)=>String(i).padStart(2,"0"));

function SajuInputForm({onSubmit}){
  const [step,setStep]=useState(1); // 1=기본정보 2=시간 3=확인
  const [form,setForm]=useState({
    name:"",year:"",month:"",day:"",
    hour:"23",minute:"38",
    gender:"여",city:"서울",
  });
  const [err,setErr]=useState({});
  const up=(k,v)=>setForm(f=>({...f,[k]:v}));

  function validate1(){
    const e={};
    if(!form.name.trim()) e.name="이름을 입력해주세요";
    const y=parseInt(form.year),m=parseInt(form.month),d=parseInt(form.day);
    if(!form.year||y<1900||y>2010) e.year="연도를 확인해주세요";
    if(!form.month||m<1||m>12) e.month="월을 확인해주세요";
    if(!form.day||d<1||d>31) e.day="일을 확인해주세요";
    setErr(e);
    return Object.keys(e).length===0;
  }
  function next(){if(step===1&&validate1()) setStep(2); else if(step===2) setStep(3);}

  const OC2={여:{bg:"#fce4ec",c:"#880e4f"},남:{bg:"#e3f2fd",c:"#0d47a1"}};
  const gc2=form.gender==="여"?OC2.여:OC2.남;

  // 스텝 1 — 기본 정보
  if(step===1) return(
    <div style={SF.root}>
      <div style={SF.header}>
        <button style={SF.back} onClick={()=>onSubmit(form)}>‹</button>
        <div style={SF.title}>fortuneyam</div>
        <div style={{width:32}}/>
      </div>
      <div style={SF.progress}>
        {[1,2,3].map(s=><div key={s} style={{...SF.dot,background:s<=step?"#e65100":"#e0e0e0"}}/>)}
      </div>
      <div style={SF.content}>
        <div style={SF.stepLabel}>STEP 1 · 기본 정보</div>
        <div style={SF.heading}>어떤 분을 분석할까요?</div>

        {/* 이름 */}
        <div style={SF.field}>
          <div style={SF.label}>이름</div>
          <input style={{...SF.input,...(err.name?SF.inputErr:{})}}
            placeholder="홍길동" value={form.name}
            onChange={e=>up("name",e.target.value)}/>
          {err.name&&<div style={SF.errMsg}>{err.name}</div>}
        </div>

        {/* 성별 */}
        <div style={SF.field}>
          <div style={SF.label}>성별</div>
          <div style={{display:"flex",gap:10}}>
            {["여","남"].map(g=>(
              <button key={g} onClick={()=>up("gender",g)}
                style={{...SF.gBtn,...(form.gender===g?{background:OC2[g].bg,color:OC2[g].c,border:`2px solid ${OC2[g].c}`,fontWeight:800}:{})}}>
                {g==="여"?"👩 여성":"👨 남성"}
              </button>
            ))}
          </div>
        </div>

        {/* 생년월일 */}
        <div style={SF.field}>
          <div style={SF.label}>생년월일 (양력)</div>
          <div style={{display:"flex",gap:8}}>
            {[
              {k:"year",ph:"YYYY",w:"40%",max:4,err:err.year},
              {k:"month",ph:"01",w:"28%",max:2,err:err.month},
              {k:"day",ph:"17",w:"28%",max:2,err:err.day},
            ].map(({k,ph,w,max,err:e})=>(
              <div key={k} style={{width:w}}>
                <input style={{...SF.input,width:"100%",boxSizing:"border-box",...(e?SF.inputErr:{})}}
                  placeholder={ph} value={form[k]} maxLength={max}
                  inputMode="numeric"
                  onChange={ev=>up(k,ev.target.value.replace(/\D/g,""))}/>
                {e&&<div style={SF.errMsg}>{e}</div>}
              </div>
            ))}
          </div>
          <div style={SF.hint}>연도 · 월 · 일 순서로 입력</div>
        </div>

        {/* 출생지 */}
        <div style={SF.field}>
          <div style={SF.label}>출생지</div>
          <select style={SF.select} value={form.city} onChange={e=>up("city",e.target.value)}>
            {CITIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <button style={SF.btn} onClick={next}>다음 →</button>
      </div>
    </div>
  );

  // 스텝 2 — 출생 시간
  if(step===2) return(
    <div style={SF.root}>
      <div style={SF.header}>
        <button style={SF.back} onClick={()=>setStep(1)}>‹</button>
        <div style={SF.title}>fortuneyam</div>
        <div style={{width:32}}/>
      </div>
      <div style={SF.progress}>
        {[1,2,3].map(s=><div key={s} style={{...SF.dot,background:s<=step?"#e65100":"#e0e0e0"}}/>)}
      </div>
      <div style={SF.content}>
        <div style={SF.stepLabel}>STEP 2 · 출생 시간</div>
        <div style={SF.heading}>태어난 시간을 알고 있나요?</div>

        <div style={{padding:"12px 14px",background:"#fff8e1",borderRadius:12,border:"1px solid #ffe082",marginBottom:16}}>
          <div style={{fontSize:12,color:"#7b5800",lineHeight:1.7}}>
            💡 출생 시간은 시주(時柱)를 결정해요. 모른다면 정오(12:00)로 설정해두고 나중에 수정할 수 있어요.
          </div>
        </div>

        {/* 시간 선택 — 드럼롤 느낌의 큰 선택 */}
        <div style={SF.field}>
          <div style={SF.label}>출생 시간</div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#aaa",marginBottom:4,textAlign:"center"}}>시(時)</div>
              <select style={{...SF.select,textAlign:"center",fontSize:20,fontWeight:900,padding:"14px 0",color:"#e65100"}}
                value={form.hour} onChange={e=>up("hour",e.target.value)}>
                {HOURS.map(h=><option key={h} value={h}>{h}시</option>)}
              </select>
            </div>
            <div style={{fontSize:24,color:"#ddd",fontWeight:300,paddingTop:20}}>:</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#aaa",marginBottom:4,textAlign:"center"}}>분(分)</div>
              <select style={{...SF.select,textAlign:"center",fontSize:20,fontWeight:900,padding:"14px 0",color:"#e65100"}}
                value={form.minute} onChange={e=>up("minute",e.target.value)}>
                {MINS_ALL.map(m=><option key={m} value={m}>{m}분</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 자시 경계 안내 */}
        {(form.hour==="23"||form.hour==="00") &&(
          <div style={{padding:"11px 13px",background:"#fff8e1",borderRadius:11,border:"1px solid #ffb300",marginTop:8}}>
            <div style={{fontSize:12,fontWeight:800,color:"#7b5800",marginBottom:3}}>⚠️ 자시(子時) 경계 구간</div>
            <div style={{fontSize:12,color:"#7b5800",lineHeight:1.65}}>
              밤 11시~자정은 일주(日柱)가 바뀌는 경계 시간이에요. 두 가지 일주를 함께 분석해드릴게요.
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button style={{...SF.btn,flex:1,background:"#f5f5f5",color:"#555"}} onClick={()=>setStep(1)}>← 이전</button>
          <button style={{...SF.btn,flex:2}} onClick={next}>다음 →</button>
        </div>
      </div>
    </div>
  );

  // 스텝 3 — 확인
  const birthStr=`양력 ${form.year}년 ${form.month}월 ${form.day}일 ${form.hour}시 ${form.minute}분`;
  return(
    <div style={SF.root}>
      <div style={SF.header}>
        <button style={SF.back} onClick={()=>setStep(2)}>‹</button>
        <div style={SF.title}>fortuneyam</div>
        <div style={{width:32}}/>
      </div>
      <div style={SF.progress}>
        {[1,2,3].map(s=><div key={s} style={{...SF.dot,background:s<=step?"#e65100":"#e0e0e0"}}/>)}
      </div>
      <div style={SF.content}>
        <div style={SF.stepLabel}>STEP 3 · 확인</div>
        <div style={SF.heading}>입력 정보를 확인해주세요</div>

        <div style={{background:"#fff",borderRadius:16,border:"1px solid #ebebeb",overflow:"hidden",marginBottom:16}}>
          {[
            {icon:"👤",label:"이름",value:form.name},
            {icon:form.gender==="여"?"👩":"👨",label:"성별",value:form.gender==="여"?"여성":"남성"},
            {icon:"📅",label:"생년월일",value:`${form.year}.${form.month.padStart(2,"0")}.${form.day.padStart(2,"0")}`},
            {icon:"🕐",label:"출생 시간",value:`${form.hour}시 ${form.minute}분`},
            {icon:"📍",label:"출생지",value:form.city},
          ].map(({icon,label,value},i,arr)=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:i<arr.length-1?"1px solid #f5f5f5":"none"}}>
              <span style={{fontSize:18,width:24}}>{icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#aaa",fontWeight:600}}>{label}</div>
                <div style={{fontSize:15,fontWeight:800,color:"#111",marginTop:1}}>{value}</div>
              </div>
              <button onClick={()=>setStep(i<3?1:i===3?2:1)}
                style={{fontSize:11,color:"#e65100",background:"#fff3e0",border:"none",padding:"4px 10px",borderRadius:99,cursor:"pointer",fontWeight:700}}>
                수정
              </button>
            </div>
          ))}
        </div>

        <div style={{padding:"12px 14px",background:"#e3f2fd",borderRadius:12,marginBottom:16,fontSize:12,color:"#0d47a1",lineHeight:1.7}}>
          ✨ 입력 정보로 사주 8자를 계산하고 종합 운세 리포트를 생성해요. 분석에는 약 3~5초가 걸려요.
        </div>

        <button style={{...SF.btn,fontSize:16,padding:"16px 0",background:"linear-gradient(135deg,#e65100,#bf360c)"}}
          onClick={()=>onSubmit(form)}>
          🔮 fortuneyam 보기
        </button>
        <button style={{...SF.btn,background:"#f5f5f5",color:"#555",marginTop:8}} onClick={()=>setStep(1)}>
          ← 다시 입력
        </button>
      </div>
    </div>
  );
}

const SF={
  root:{fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif",maxWidth:480,margin:"0 auto",background:"#f4f4f6",minHeight:"100vh"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"#fff",borderBottom:"1px solid #eee",position:"sticky",top:0,zIndex:20},
  back:{background:"none",border:"none",fontSize:22,color:"#333",cursor:"pointer",width:32,padding:0},
  title:{fontSize:16,fontWeight:700,color:"#111"},
  progress:{display:"flex",gap:6,justifyContent:"center",padding:"12px 0 4px"},
  dot:{width:28,height:4,borderRadius:99,transition:"background .3s"},
  content:{padding:"20px 16px"},
  stepLabel:{fontSize:11,color:"#e65100",fontWeight:700,letterSpacing:1,marginBottom:4},
  heading:{fontSize:22,fontWeight:900,color:"#111",marginBottom:20,lineHeight:1.3},
  field:{marginBottom:18},
  label:{fontSize:13,fontWeight:700,color:"#444",marginBottom:7},
  input:{width:"100%",padding:"13px 14px",borderRadius:12,border:"1.5px solid #e0e0e0",fontSize:16,boxSizing:"border-box",outline:"none",fontFamily:"inherit",background:"#fff"},
  inputErr:{borderColor:"#ef5350",background:"#fff8f8"},
  errMsg:{fontSize:11,color:"#ef5350",marginTop:4,fontWeight:600},
  hint:{fontSize:11,color:"#aaa",marginTop:5},
  select:{width:"100%",padding:"13px 14px",borderRadius:12,border:"1.5px solid #e0e0e0",fontSize:15,background:"#fff",outline:"none",fontFamily:"inherit",appearance:"none",WebkitAppearance:"none"},
  gBtn:{flex:1,padding:"13px 0",borderRadius:12,border:"1.5px solid #e0e0e0",fontSize:14,fontWeight:600,cursor:"pointer",background:"#fff",color:"#555",fontFamily:"inherit"},
  btn:{width:"100%",padding:"14px 0",borderRadius:14,border:"none",fontSize:14,fontWeight:800,cursor:"pointer",background:"#e65100",color:"#fff",fontFamily:"inherit"},
};
