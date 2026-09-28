// 앱 전체에서 쓰는 데이터 모양(타입) 정의

export const CATEGORIES = ['상의', '하의', '아우터', '원피스', '신발', '가방·액세서리'] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEASONS = ['봄', '여름', '가을', '겨울'] as const;
export type Season = (typeof SEASONS)[number];

export const STYLES = ['캐주얼', '미니멀', '스트릿', '포멀', '스포티', '빈티지'] as const;
export type StyleTag = (typeof STYLES)[number];

export const OCCASIONS = [
  '출근',
  '중요한 미팅',
  '데이트',
  '결혼식 하객',
  '운동',
  '아이와 외출',
  '친구 모임',
  '집 근처 산책',
] as const;

/** 옷 한 벌 */
export type ClothingItem = {
  id: string;
  /** 옷 사진 (기기 내 경로) */
  photoUri: string;
  /** 택(라벨) 사진, 없을 수 있음 */
  tagPhotoUri?: string;
  category: Category;
  color: string;
  material?: string;
  brand?: string;
  size?: string;
  /** 택의 모델명/품번 (예: 422234-01) */
  modelNo?: string;
  /** 검색으로 찾은 정식 제품명 */
  productName?: string;
  /** 정가 (검색 또는 가격표) */
  price?: string;
  seasons: Season[];
  /** 두께: 1(얇음) ~ 3(두꺼움) */
  thickness: 1 | 2 | 3;
  /** 어울리는 상황 메모 */
  occasions: string[];
  /** 자유 메모 */
  note?: string;
  createdAt: string;
};

/** 내 정보 */
export type Profile = {
  heightCm?: number;
  weightKg?: number;
  gender?: '남성' | '여성' | '기타';
  /** 버튼으로 고른 선호 스타일 */
  styleTags: StyleTag[];
  /** 사진으로 올린 선호 스타일 이미지들 */
  styleReferenceUris: string[];
  /** AI가 사진을 읽고 정리한 선호 스타일 요약 (나중에 채워짐) */
  styleSummary?: string;
  /** 날씨용 지역 이름 */
  regionName?: string;
  /** AI가 옷장을 보고 정리한 해석 (옷장 분석 탭) */
  closetInsight?: string;
  closetInsightAt?: string;
  /** AI가 제안한 "다음에 사면 좋을 옷" (옷장 분석 탭) */
  buySuggestions?: BuySuggestion[];
  buySuggestionsAt?: string;
};

/** 사면 좋을 옷 제안 하나 */
export type BuySuggestion = {
  /** 예: 베이지 치노 팬츠 */
  item: string;
  /** 왜 필요한지 + 어떤 코디가 늘어나는지 */
  reason: string;
};

/** 코디 추천 하나 */
export type Outfit = {
  id: string;
  /** 코디에 들어간 옷들의 id */
  itemIds: string[];
  /** 왜 이렇게 골랐는지 한 줄 */
  reason: string;
  occasion: string;
  weatherSummary?: string;
  createdAt: string;
};

export const emptyProfile: Profile = {
  styleTags: [],
  styleReferenceUris: [],
};
