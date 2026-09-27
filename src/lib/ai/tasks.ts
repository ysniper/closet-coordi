// AI에게 시키는 일들. 질문 문구(프롬프트)와 답 형식을 여기서 관리한다.
import { AiSettings, askAi, askAiJson } from './client';
import { ImagePayload } from '../images';
import { WeatherNow } from '../recommend';
import { newId } from '../storage';
import {
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
  const prompt = `첫 번째 사진은 옷 사진${tagPhoto ? ', 두 번째 사진은 그 옷의 택(라벨)입니다' : '입니다'}.
옷 정보를 아래 JSON 형식으로만 답하세요. 모르는 항목은 null.
{
  "category": ${JSON.stringify(CATEGORIES)} 중 하나,
  "color": "대표 색상 한두 단어 (예: 네이비, 연한 베이지)",
  "material": "소재 (택에 있으면 그대로, 없으면 사진으로 추정)",
  "brand": "브랜드 (택에 보이면)",
  "size": "사이즈 (택에 보이면, 예: L, 100, 32)",
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
    maxTokens: 600,
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
