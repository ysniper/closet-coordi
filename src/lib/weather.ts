// 날씨 가져오기. Open-Meteo (무료, 키 불필요) 사용.
import * as Location from 'expo-location';

import { WeatherNow } from './recommend';

const WEATHER_CODE_KO: Record<number, string> = {
  0: '맑음',
  1: '대체로 맑음',
  2: '구름 조금',
  3: '흐림',
  45: '안개',
  48: '안개',
  51: '약한 이슬비',
  53: '이슬비',
  55: '강한 이슬비',
  61: '약한 비',
  63: '비',
  65: '강한 비',
  71: '약한 눈',
  73: '눈',
  75: '강한 눈',
  80: '소나기',
  81: '소나기',
  82: '강한 소나기',
  95: '뇌우',
};

export async function getCurrentWeather(): Promise<WeatherNow> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('위치 권한이 필요해요');

  const pos = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = pos.coords;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('날씨 정보를 가져오지 못했어요');
  const json = await res.json();
  const cur = json.current;

  const code: number = cur.weather_code;
  const desc = WEATHER_CODE_KO[code] ?? '날씨 정보';
  const precipitation = cur.precipitation > 0 || code >= 51;

  return {
    tempC: cur.temperature_2m,
    feelsLikeC: cur.apparent_temperature,
    precipitation,
    summary: `${desc} · ${Math.round(cur.temperature_2m)}° (체감 ${Math.round(cur.apparent_temperature)}°)`,
  };
}
