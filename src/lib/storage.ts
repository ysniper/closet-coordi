// 폰 안에 데이터를 저장하고 읽는 부분 (서버 없이 기기 내부 저장)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { AiSettings, emptyAiSettings } from './ai/client';
import { ClothingItem, Outfit, Profile, emptyProfile } from './types';

const KEYS = {
  profile: 'closet/profile',
  clothes: 'closet/clothes',
  outfits: 'closet/outfits',
  ai: 'closet/ai',
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- 내 정보 ----
export const loadProfile = () => readJson<Profile>(KEYS.profile, emptyProfile);
export const saveProfile = (p: Profile) => writeJson(KEYS.profile, p);

// ---- 옷 ----
export const loadClothes = () => readJson<ClothingItem[]>(KEYS.clothes, []);
export const saveClothes = (items: ClothingItem[]) => writeJson(KEYS.clothes, items);

// ---- 저장한 코디 ----
export const loadOutfits = () => readJson<Outfit[]>(KEYS.outfits, []);
export const saveOutfits = (items: Outfit[]) => writeJson(KEYS.outfits, items);

// ---- AI 연결 설정 (키 포함, 이 기기에만 저장) ----
export const loadAiSettings = () => readJson<AiSettings>(KEYS.ai, emptyAiSettings);
export const saveAiSettings = (s: AiSettings) => writeJson(KEYS.ai, s);

/**
 * 화면에서 쓰기 편한 훅. 화면이 열릴 때 읽어오고, 바꾸면 바로 저장한다.
 */
export function useStoredValue<T>(load: () => Promise<T>, save: (v: T) => Promise<void>, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    load().then((v) => {
      if (alive) {
        setValue(v);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const update = useCallback(
    async (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        void save(resolved);
        return resolved;
      });
    },
    [save]
  );

  return [value, update, loaded] as const;
}

export const useProfile = () => useStoredValue(loadProfile, saveProfile, emptyProfile);
export const useClothes = () => useStoredValue<ClothingItem[]>(loadClothes, saveClothes, []);
export const useOutfits = () => useStoredValue<Outfit[]>(loadOutfits, saveOutfits, []);
export const useAiSettings = () => useStoredValue(loadAiSettings, saveAiSettings, emptyAiSettings);
