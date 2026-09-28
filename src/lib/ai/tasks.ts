// AI에게 시키는 일들. 질문 문구(프롬프트)와 답 형식을 여기서 관리한다.
import { AiSettings, askAi, askAiJson } from './client';
import { ImagePayload } from '../images';
import { WeatherNow } from '../recommend';
import { newId } from '../storage';
import {
  BuySuggestion,
  CATEGORIES,
  Category,
  ClothingItem,
  OCCASIONS,
  Outfit,
  Profile,
  SEASONS,
  Season,
} from '../types';

const SYSTEM = '당신은 개인 옷장 관리와 코디를 도와주는 스타일리스트입니다. 항상 한국어로 답합니다.';

/** 옷 사진(+택 사진)을 보고 정보를 채운다 */
export type ClothingGuess = {
  category?: Category;
  color?: string;
  material?: string;
  brand?: string;
  size?: string;
  modelNo?: string;
  productName?: string;
  price?: string;
  seasons?: Season[];
  thickness?: 1 | 2 | 3;
  occasions?: string[];
  note?: string;
};

export async function classifyClothing(
  settings: AiSettings,
  photo: ImagePayload,
  tagPhoto?: ImagePayload
): Promise<ClothingGuess> {
  const prompt = `첫 번째 사진은 옷 사진${tagPhoto ? ', 두 번째 사진은 그 옷의 택(케어 라벨 또는 가격표)입니다' : '입니다'}.
${
  tagPhoto
    ? `택에 브랜드명, 모델명/품번(숫자·영문 코드), 사이즈, 소재, 가격이 보이면 그대로 읽으세요.
모델명이나 품번이 보이면 인터넷에서 "브랜드 + 모델명"으로 검색해 정식 제품명, 소재, 정가를 찾아 채우세요.
검색으로 확실히 찾지 못한 항목은 지어내지 말고 null로 두세요.
`
    : ''
}옷 정보를 아래 JSON 형식으로만 답하세요. 모르는 항목은 null.
{
  "category": ${JSON.stringify(CATEGORIES)} 중 하나,
  "color": "대표 색상 한두 단어 (예: 네이비, 연한 베이지)",
  "material": "소재 (택에 있으면 그대로, 없으면 사진으로 추정)",
  "brand": "브랜드 (택에 보이면)",
  "size": "사이즈 (택에 보이면, 예: L, 100, 32)",
  "modelNo": "택의 모델명/품번 (보이면 그대로)",
  "productName": "검색으로 찾은 정식 제품명 (예: 에어리즘 코튼 오버사이즈 티셔츠)",
  "price": "정가 (예: 29,900원)",
  "seasons": ${JSON.stringify(SEASONS)} 중 어울리는 것들의 배열,
  "thickness": 1(얇음) | 2(보통) | 3(두꺼움),
  "occasions": ${JSON.stringify(OCCASIONS)} 중 어울리는 상황들의 배열,
  "note": "한 줄 특징 (예: 오버핏 스트라이프 셔츠)"
}`;
  const raw = await askAiJson<Record<string, unknown>>({
    settings,
    system: SYSTEM,
    prompt,
    images: tagPhoto ? [photo, tagPhoto] : [photo],
    // 택이 있을 때만 검색을 켠다 (검색은 시간이 더 걸림)
    search: !!tagPhoto,
    maxTokens: 800,
  });
  return sanitizeGuess(raw);
}

function sanitizeGuess(r: Record<string, unknown>): ClothingGuess {
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const inList = <T extends string>(list: readonly T[], v: unknown): T | undefined =>
    typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : undefined;
  const listOf = <T extends string>(list: readonly T[], v: unknown): T[] =>
    Array.isArray(v) ? v.map((x) => inList(list, x)).filter((x): x is T => !!x) : [];
  const t = Number(r.thickness);
  return {
    category: inList(CATEGORIES, r.category),
    color: str(r.color),
    material: str(r.material),
    brand: str(r.brand),
    size: str(r.size),
    modelNo: str(r.modelNo),
    productName: str(r.productName),
    price: str(r.price),
    seasons: listOf(SEASONS, r.seasons),
    thickness: t === 1 || t === 2 || t === 3 ? t : undefined,
    occasions: listOf(OCCASIONS, r.occasions),
    note: str(r.note),
  };
}

/** 선호 스타일 사진들을 보고 취향을 요약한다 */
export async function summarizeStyle(settings: AiSettings, images: ImagePayload[]): Promise<string> {
  return askAi({
    settings,
    system: SYSTEM,
    prompt: `이 사진들은 사용자가 좋아하는 스타일 예시입니다. 공통된 취향을 2~3문장으로 요약하세요.
핏(슬림/오버), 색감(톤다운/밝음), 분위기(미니멀/캐주얼/스트릿/포멀 등), 자주 쓰는 아이템을 언급하세요. 인사말 없이 요약만.`,
    images,
    maxTokens: 400,
  });
}

/** 옷장 전체를 텍스트로 정리 (사진 없이 보내서 비용 절약) */
function describeCloset(clothes: ClothingItem[]) {
  return clothes
    .map(
      (c) =>
        `- id:${c.id} | ${c.category} | ${c.color}${c.material ? ` | ${c.material}` : ''}${
          c.brand ? ` | ${c.brand}` : ''
        }${c.productName ? ` | ${c.productName}` : ''
        } | 계절:${c.seasons.join('/') || '무관'} | 두께:${c.thickness}${
          c.occasions.length ? ` | 상황:${c.occasions.join('/')}` : ''
        }${c.note ? ` | ${c.note}` : ''}`
    )
    .join('\n');
}

function describeProfile(p: Profile) {
  const parts = [];
  if (p.gender) parts.push(`성별 ${p.gender}`);
  if (p.heightCm) parts.push(`키 ${p.heightCm}cm`);
  if (p.weightKg) parts.push(`몸무게 ${p.weightKg}kg`);
  if (p.styleTags.length) parts.push(`선호 스타일(직접 선택): ${p.styleTags.join(', ')}`);
  if (p.styleSummary) parts.push(`선호 스타일(사진 분석): ${p.styleSummary}`);
  return parts.join('\n') || '정보 없음';
}

/** 옷장 분석: 실제로 가진 옷의 경향 + 선호 스타일과의 차이 */
export async function analyzeCloset(
  settings: AiSettings,
  clothes: ClothingItem[],
  profile: Profile
): Promise<string> {
  return askAi({
    settings,
    system: SYSTEM,
    prompt: `사용자 정보:
${describeProfile(profile)}

옷장 목록:
${describeCloset(clothes)}

이 옷장을 보고 아래를 짧게 정리하세요 (총 4~6문장, 인사말 없이):
1. 실제로 많이 가진 색상/핏/종류 경향
2. 사용자가 말한 선호 스타일과 실제 옷장이 다른 점이 있으면 짚어주기
3. 이 옷장에서 부족한 것 하나 (있으면 코디가 크게 늘어나는 아이템)`,
    maxTokens: 600,
  });
}

/** AI 코디 추천 */
export async function recommendOutfitsAi(
  settings: AiSettings,
  clothes: ClothingItem[],
  weather: WeatherNow,
  occasion: string,
  profile: Profile,
  count = 3
): Promise<Outfit[]> {
  const raw = await askAiJson<{ outfits?: { itemIds?: unknown; reason?: unknown }[] }>({
    settings,
    system: SYSTEM,
    prompt: `오늘 날씨: ${weather.summary}${weather.precipitation ? ' (비/눈 예보 있음)' : ''}
오늘 상황: ${occasion}

사용자 정보:
${describeProfile(profile)}

옷장 목록 (반드시 이 목록 안의 id만 사용):
${describeCloset(clothes)}

코디 ${count}개를 추천하세요. 각 코디는 상의+하의(또는 원피스), 필요하면 아우터, 신발로 구성.
날씨, 상황, 선호 스타일, 실제 옷장 경향을 모두 고려하고, 서로 다른 느낌으로 만드세요.
JSON 형식으로만:
{"outfits":[{"itemIds":["id1","id2"],"reason":"왜 이렇게 골랐는지 한 문장 (예: 저녁에 쌀쌀해져서 가디건 추가)"}]}`,
    maxTokens: 800,
  });

  const valid = new Set(clothes.map((c) => c.id));
  const outfits: Outfit[] = [];
  for (const o of raw.outfits ?? []) {
    const ids = Array.isArray(o.itemIds)
      ? o.itemIds.filter((id): id is string => typeof id === 'string' && valid.has(id))
      : [];
    if (ids.length < 1) continue;
    outfits.push({
      id: newId(),
      itemIds: ids,
      reason: typeof o.reason === 'string' ? o.reason : '',
      occasion,
      weatherSummary: weather.summary,
      createdAt: new Date().toISOString(),
    });
  }
  return outfits;
}

/** 키가 제대로 되는지 아주 작은 요청으로 확인 */
export async function testConnection(settings: AiSettings): Promise<void> {
  await askAi({ settings, prompt: '연결 확인. "OK"라고만 답하세요.', maxTokens: 64 });
}

// ---------- 쇼핑 도우미 ----------

export const VERDICTS = ['사세요', '고민해 보세요', '안 사도 돼요'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** 새 옷 가격표 택을 보고 내린 판단 */
export type ShoppingVerdict = {
  /** 택에서 읽고 검색으로 보강한 옷 정보 */
  item: ClothingGuess;
  verdict: Verdict;
  /** 한두 문장 총평 */
  summary: string;
  /** 사이즈가 맞을지 (같은 브랜드 보유 사이즈, 키·몸무게 기준) */
  sizeCheck: string;
  /** 이미 비슷한 옷이 있는지 */
  overlapIds: string[];
  overlapNote: string;
  /** 이 옷을 사면 만들 수 있는 코디 (기존 옷 id들) */
  outfits: { itemIds: string[]; reason: string }[];
};

export async function judgeNewItem(
  settings: AiSettings,
  tagPhoto: ImagePayload,
  clothes: ClothingItem[],
  profile: Profile,
  productPhoto?: ImagePayload
): Promise<ShoppingVerdict> {
  const raw = await askAiJson<Record<string, unknown>>({
    settings,
    system: SYSTEM,
    prompt: `사용자가 매장에서 새 옷을 살지 고민 중입니다. 입어 보지 않고도 결정할 수 있게 도와주세요.
첫 번째 사진은 그 옷의 가격표 택${productPhoto ? ', 두 번째 사진은 옷 자체' : ''}입니다.

1단계: 택에서 브랜드, 모델명/품번, 사이즈, 가격, 소재를 읽으세요. 모델명이 있으면 인터넷에서 "브랜드 + 모델명"을 검색해
정식 제품명, 종류, 색상, 소재, 핏(슬림/레귤러/오버)을 확인하세요. 확실하지 않은 값은 null.

2단계: 아래 사용자 정보와 옷장을 보고 판단하세요.
- 사이즈: 같은 브랜드의 보유 옷 사이즈가 있으면 그것과 비교, 없으면 키·몸무게와 브랜드 사이즈표(검색)로 추정.
- 겹침: 옷장에 종류·색·용도가 비슷한 옷이 있으면 그 id를 적으세요.
- 코디: 이 옷을 사면 기존 옷과 만들 수 있는 코디 2~3개 (반드시 옷장 목록의 id만 사용). 새 옷 자체는 id 없이 reason에 언급.
- 결론: ${JSON.stringify(VERDICTS)} 중 하나. 겹치는 옷이 많고 코디가 안 늘면 "안 사도 돼요", 사이즈가 불확실하면 "고민해 보세요".

사용자 정보:
${describeProfile(profile)}

옷장 목록:
${describeCloset(clothes) || '(아직 등록된 옷 없음)'}

JSON 형식으로만 답하세요:
{
  "item": {
    "category": ${JSON.stringify(CATEGORIES)} 중 하나,
    "color": "색상", "material": "소재", "brand": "브랜드", "size": "택의 사이즈",
    "modelNo": "모델명/품번", "productName": "정식 제품명", "price": "가격 (예: 59,000원)",
    "seasons": ${JSON.stringify(SEASONS)} 배열, "thickness": 1|2|3,
    "occasions": ${JSON.stringify(OCCASIONS)} 배열, "note": "한 줄 특징"
  },
  "verdict": "사세요" | "고민해 보세요" | "안 사도 돼요",
  "summary": "총평 한두 문장",
  "sizeCheck": "사이즈 판단 한두 문장 (근거 포함)",
  "overlapIds": ["겹치는 옷 id"],
  "overlapNote": "겹침 설명 한 문장 (없으면 '겹치는 옷 없음')",
  "outfits": [{"itemIds": ["id"], "reason": "새 옷 + 이 옷들로 어떤 코디가 되는지"}]
}`,
    images: productPhoto ? [tagPhoto, productPhoto] : [tagPhoto],
    search: true,
    maxTokens: 1200,
  });

  const valid = new Set(clothes.map((c) => c.id));
  const ids = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && valid.has(x)) : [];
  const str = (v: unknown, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  const verdict = (VERDICTS as readonly string[]).includes(str(raw.verdict))
    ? (raw.verdict as Verdict)
    : '고민해 보세요';
  const outfits = Array.isArray(raw.outfits)
    ? raw.outfits
        .map((o: { itemIds?: unknown; reason?: unknown }) => ({ itemIds: ids(o?.itemIds), reason: str(o?.reason) }))
        .filter((o) => o.itemIds.length > 0)
    : [];
  return {
    item: sanitizeGuess((raw.item as Record<string, unknown>) ?? {}),
    verdict,
    summary: str(raw.summary, '판단 근거를 받지 못했어요.'),
    sizeCheck: str(raw.sizeCheck, '사이즈를 판단할 정보가 부족해요.'),
    overlapIds: ids(raw.overlapIds),
    overlapNote: str(raw.overlapNote, '겹치는 옷 없음'),
    outfits,
  };
}

/** 다음에 사면 좋을 옷 제안 (옷장 빈틈 채우기) */
export async function suggestPurchases(
  settings: AiSettings,
  clothes: ClothingItem[],
  profile: Profile
): Promise<BuySuggestion[]> {
  const raw = await askAiJson<{ suggestions?: { item?: unknown; reason?: unknown }[] }>({
    settings,
    system: SYSTEM,
    prompt: `사용자 정보:
${describeProfile(profile)}

옷장 목록:
${describeCloset(clothes)}

이 옷장에 추가하면 코디 가짓수가 가장 많이 늘어나는 옷 3개를 골라 주세요.
이미 많이 가진 종류·색은 피하고, 사용자의 선호 스타일과 실제 옷장 경향에 맞게.
각 제안은 구체적으로 (종류 + 색 + 핏, 예: "차콜 슬림 슬랙스"), 이유에는 옷장의 어떤 옷들과 어떻게 매치되는지 적으세요.
JSON 형식으로만:
{"suggestions":[{"item":"베이지 치노 팬츠","reason":"네이비 셔츠, 흰 티와 모두 맞고 출근·데이트 둘 다 가능"}]}`,
    maxTokens: 700,
  });
  return (raw.suggestions ?? [])
    .map((s) => ({
      item: typeof s.item === 'string' ? s.item.trim() : '',
      reason: typeof s.reason === 'string' ? s.reason.trim() : '',
    }))
    .filter((s) => s.item)
    .slice(0, 3);
}
