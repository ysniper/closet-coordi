// 오늘의 코디: 날씨 + 오늘 상황 → 내 옷장으로 코디 추천 (AI 연결 시 AI, 아니면 규칙)
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ClothingThumb } from '@/components/clothing-thumb';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chips, Hint, Input, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { isAiReady } from '@/lib/ai/client';
import { recommendOutfitsAi } from '@/lib/ai/tasks';
import { WeatherNow, recommendOutfits } from '@/lib/recommend';
import { useAiSettings, useClothes, useOutfits, useProfile } from '@/lib/storage';
import { OCCASIONS, Outfit } from '@/lib/types';
import { getCurrentWeather } from '@/lib/weather';

export default function TodayScreen() {
  const [clothes] = useClothes();
  const [profile] = useProfile();
  const [saved, setSaved] = useOutfits();
  const [ai] = useAiSettings();

  const [weather, setWeather] = useState<WeatherNow>();
  const [weatherError, setWeatherError] = useState<string>();
  const [occasion, setOccasion] = useState<string>('출근');
  const [customOccasion, setCustomOccasion] = useState('');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'ai' | 'rule'>();

  const loadWeather = () => {
    setWeatherError(undefined);
    setWeather(undefined);
    getCurrentWeather()
      .then(setWeather)
      .catch((e: Error) => setWeatherError(e.message));
  };
  useEffect(loadWeather, []);

  const recommend = async () => {
    if (clothes.length < 2) {
      Alert.alert('옷을 조금 더 등록해 주세요', '상의와 하의가 최소 한 벌씩 있어야 코디를 만들 수 있어요.');
      return;
    }
    const w: WeatherNow = weather ?? {
      tempC: 20,
      feelsLikeC: 20,
      precipitation: false,
      summary: '날씨 정보 없음 (20°로 가정)',
    };
    const finalOccasion = customOccasion.trim() || occasion;

    setBusy(true);
    let next: Outfit[] = [];
    let from: 'ai' | 'rule' = 'rule';
    try {
      if (isAiReady(ai)) {
        next = await recommendOutfitsAi(ai, clothes, w, finalOccasion, profile, 3);
        from = 'ai';
      }
    } catch (e) {
      Alert.alert('AI 추천에 실패해서 기본 추천으로 보여 드려요', (e as Error).message);
    }
    if (next.length === 0) {
      next = recommendOutfits(clothes, w, finalOccasion, profile, 3);
      from = 'rule';
    }
    setBusy(false);
    if (next.length === 0) {
      Alert.alert('맞는 옷을 못 찾았어요', '이 날씨에 맞는 상의와 하의가 옷장에 있는지 확인해 주세요.');
    }
    setOutfits(next);
    setSource(from);
    setRound((r) => r + 1);
  };

  const saveOutfit = (o: Outfit) => {
    if (saved.some((s) => s.id === o.id)) return;
    setSaved((prev) => [o, ...prev]);
    Alert.alert('저장했어요', '"저장" 탭에서 다시 볼 수 있어요.');
  };

  return (
    <Screen title="오늘의 코디">
      <Card>
        <SectionTitle>오늘 날씨</SectionTitle>
        {weather ? (
          <ThemedText>{weather.summary}</ThemedText>
        ) : weatherError ? (
          <>
            <Hint>{weatherError}</Hint>
            <Button title="다시 시도" kind="secondary" onPress={loadWeather} />
          </>
        ) : (
          <View style={styles.row}>
            <ActivityIndicator />
            <Hint>내 위치의 날씨를 확인하고 있어요</Hint>
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle>오늘 어떤 날이에요?</SectionTitle>
        <Chips options={OCCASIONS} selected={[occasion]} onToggle={setOccasion} />
        <Input
          placeholder="직접 쓰기 (예: 장모님 생신 저녁 식사)"
          value={customOccasion}
          onChangeText={setCustomOccasion}
        />
      </Card>

      <Button
        title={busy ? 'AI가 코디 중...' : round === 0 ? '코디 추천받기' : '다른 코디 보여줘'}
        onPress={recommend}
        disabled={busy}
      />

      {outfits.map((o, i) => (
        <Card key={o.id}>
          <SectionTitle>코디 {i + 1}</SectionTitle>
          <View style={styles.items}>
            {o.itemIds
              .map((id) => clothes.find((c) => c.id === id))
              .filter(Boolean)
              .map((c) => <ClothingThumb key={c!.id} item={c!} size={84} />)}
          </View>
          <Hint>{o.reason}</Hint>
          <Button
            title={saved.some((s) => s.id === o.id) ? '저장됨' : '이 코디 저장'}
            kind="secondary"
            disabled={saved.some((s) => s.id === o.id)}
            onPress={() => saveOutfit(o)}
          />
        </Card>
      ))}

      {round > 0 && source === 'rule' && (
        <Hint>
          {isAiReady(ai)
            ? '지금은 날씨와 상황만 보고 규칙으로 골랐어요.'
            : '지금은 날씨와 상황만 보고 규칙으로 고르고 있어요. "내 정보"에서 AI를 연결하면 선호 스타일과 옷장 분석까지 함께 보고 추천해요.'}
        </Hint>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
