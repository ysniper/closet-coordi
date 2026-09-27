// 코디 추천 (1단계: 간단한 규칙 기반). 나중에 Claude API로 바꿀 자리.
import { ClothingItem, Outfit, Profile, Season } from './types';
import { newId } from './storage';

export type WeatherNow = {
  tempC: number;
  feelsLikeC: number;
  /** 비/눈 여부 */
  precipitation: boolean;
  summary: string;
};

/** 기온으로 계절과 필요한 두께를 정한다 */
function seasonFor(tempC: number): { season: Season; thickness: 1 | 2 | 3; needOuter: boolean } {
  if (tempC >= 24) return { season: '여름', thickness: 1, needOuter: false };
  if (tempC >= 17) return { season: '봄', thickness: 1, needOuter: false };
  if (tempC >= 10) return { season: '가을', thickness: 2, needOuter: true };
  return { season: '겨울', thickness: 3, needOuter: true };
}

function pick<T>(list: T[], seed: number): T | undefined {
  if (list.length === 0) return undefined;
  return list[seed % list.length];
}

/**
 * 내 옷장 안의 옷으로만 코디를 만든다.
 * 규칙: 기온에 맞는 계절 옷 우선, 상황에 맞는 옷 우선, 상의+하의(또는 원피스)+필요하면 아우터+신발.
 */
export function recommendOutfits(
  clothes: ClothingItem[],
  weather: WeatherNow,
  occasion: string,
  _profile: Profile,
  count = 3
): Outfit[] {
  const { season, thickness, needOuter } = seasonFor(weather.feelsLikeC);

  const fits = (c: ClothingItem) =>
    (c.seasons.length === 0 || c.seasons.includes(season)) && Math.abs(c.thickness - thickness) <= 1;
  const forOccasion = (c: ClothingItem) => c.occasions.length === 0 || c.occasions.includes(occasion);

  const rank = (list: ClothingItem[]) =>
    [...list].sort((a, b) => Number(forOccasion(b)) - Number(forOccasion(a)));

  const tops = rank(clothes.filter((c) => c.category === '상의' && fits(c)));
  const bottoms = rank(clothes.filter((c) => c.category === '하의' && fits(c)));
  const dresses = rank(clothes.filter((c) => c.category === '원피스' && fits(c)));
  const outers = rank(clothes.filter((c) => c.category === '아우터' && fits(c)));
  const shoes = rank(clothes.filter((c) => c.category === '신발'));

  const outfits: Outfit[] = [];
  for (let i = 0; i < count; i++) {
    const ids: string[] = [];
    const reasons: string[] = [];

    const dress = i % 2 === 1 ? pick(dresses, i) : undefined;
    if (dress) {
      ids.push(dress.id);
      reasons.push(`${dress.color} 원피스로 단정하게`);
    } else {
      const top = pick(tops, i);
      const bottom = pick(bottoms, i);
      if (!top || !bottom) continue;
      ids.push(top.id, bottom.id);
      reasons.push(`${top.color} ${top.category}에 ${bottom.color} ${bottom.category}`);
    }

    if (needOuter) {
      const outer = pick(outers, i);
      if (outer) {
        ids.push(outer.id);
        reasons.push(`체감 ${Math.round(weather.feelsLikeC)}°라 ${outer.color} 아우터 추가`);
      }
    }
    if (weather.precipitation) reasons.push('비 예보가 있어 젖어도 괜찮은 신발 추천');

    const shoe = pick(shoes, i);
    if (shoe) ids.push(shoe.id);

    outfits.push({
      id: newId(),
      itemIds: ids,
      reason: reasons.join(', '),
      occasion,
      weatherSummary: weather.summary,
      createdAt: new Date().toISOString(),
    });
  }
  return outfits;
}
