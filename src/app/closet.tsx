// 내 옷장: 등록한 옷 격자 보기 + 종류 필터 + 옷장 분석 탭
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ClothingThumb } from '@/components/clothing-thumb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, Chips, Hint, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { isAiReady } from '@/lib/ai/client';
import { analyzeCloset } from '@/lib/ai/tasks';
import { useAiSettings, useClothes, useProfile } from '@/lib/storage';
import { CATEGORIES, Category, ClothingItem } from '@/lib/types';

type Tab = '옷 목록' | '옷장 분석';

export default function ClosetScreen() {
  const [clothes, setClothes] = useClothes();
  const [tab, setTab] = useState<Tab>('옷 목록');
  const [filter, setFilter] = useState<Category>();
  const [selected, setSelected] = useState<ClothingItem>();

  const shown = useMemo(
    () => (filter ? clothes.filter((c) => c.category === filter) : clothes),
    [clothes, filter]
  );

  const remove = (item: ClothingItem) =>
    Alert.alert('이 옷을 옷장에서 뺄까요?', `${item.color} ${item.category}`, [
      { text: '취소', style: 'cancel' },
      {
        text: '빼기',
        style: 'destructive',
        onPress: () => {
          setClothes((prev) => prev.filter((c) => c.id !== item.id));
          setSelected(undefined);
        },
      },
    ]);

  return (
    <Screen title="내 옷장">
      <Chips options={['옷 목록', '옷장 분석'] as const} selected={[tab]} onToggle={setTab} />

      {tab === '옷 목록' ? (
        <>
          <Chips
            options={CATEGORIES}
            selected={filter ? [filter] : []}
            onToggle={(c) => setFilter(filter === c ? undefined : c)}
          />
          {shown.length === 0 ? (
            <Card>
              <Hint>
                {clothes.length === 0
                  ? '아직 등록한 옷이 없어요. 아래 "등록" 탭에서 첫 옷을 넣어 보세요.'
                  : '이 종류의 옷은 아직 없어요.'}
              </Hint>
            </Card>
          ) : (
            <View style={styles.grid}>
              {shown.map((item) => (
                <ClothingThumb key={item.id} item={item} onPress={() => setSelected(item)} />
              ))}
            </View>
          )}
          <Hint>총 {clothes.length}벌</Hint>
        </>
      ) : (
        <Analysis clothes={clothes} />
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(undefined)}>
        {selected && (
          <ThemedView style={styles.modal}>
            <Image source={{ uri: selected.photoUri }} style={styles.modalImage} />
            <ThemedText type="subtitle">
              {selected.color} {selected.category}
            </ThemedText>
            <Detail label="브랜드" value={selected.brand} />
            <Detail label="사이즈" value={selected.size} />
            <Detail label="소재" value={selected.material} />
            <Detail label="제품명" value={selected.productName} />
            <Detail label="모델명" value={selected.modelNo} />
            <Detail label="정가" value={selected.price} />
            <Detail label="계절" value={selected.seasons.join(', ')} />
            <Detail label="두께" value={['얇음', '보통', '두꼼'][selected.thickness - 1]} />
            <Detail label="어울리는 상황" value={selected.occasions.join(', ')} />
            <Detail label="메모" value={selected.note} />
            {selected.tagPhotoUri && (
              <Pressable>
                <Image source={{ uri: selected.tagPhotoUri }} style={styles.tagImage} />
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Button title="옷장에서 빼기" kind="danger" onPress={() => remove(selected)} />
            <Button title="닫기" kind="secondary" onPress={() => setSelected(undefined)} />
          </ThemedView>
        )}
      </Modal>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <ThemedText type="small">
      <ThemedText type="small" themeColor="textSecondary">
        {label}{'  '}
      </ThemedText>
      {value}
    </ThemedText>
  );
}

/** 옷장 분석: 간단한 통계 + AI 취향 해석 */
function Analysis({ clothes }: { clothes: ClothingItem[] }) {
  const [profile, setProfile] = useProfile();
  const [ai] = useAiSettings();
  const [busy, setBusy] = useState(false);

  const runInsight = async () => {
    setBusy(true);
    try {
      const text = await analyzeCloset(ai, clothes, profile);
      setProfile((p) => ({ ...p, closetInsight: text, closetInsightAt: new Date().toISOString() }));
    } catch (e) {
      Alert.alert('분석에 실패했어요', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (clothes.length === 0) {
    return (
      <Card>
        <Hint>옷을 몇 벌 등록하면 색상, 종류, 계절 경향을 보여 드릴게요.</Hint>
      </Card>
    );
  }
  const count = (pick: (c: ClothingItem) => string[]) => {
    const m = new Map<string, number>();
    clothes.forEach((c) => pick(c).forEach((k) => m.set(k, (m.get(k) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const colors = count((c) => [c.color]).slice(0, 5);
  const cats = count((c) => [c.category]);
  const seasons = count((c) => c.seasons);
  const brands = count((c) => (c.brand ? [c.brand] : [])).slice(0, 5);

  return (
    <>
      <Card>
        <SectionTitle>AI 취향 해석</SectionTitle>
        {profile.closetInsight ? (
          <>
            <ThemedText type="small">{profile.closetInsight}</ThemedText>
            {profile.closetInsightAt && (
              <Hint>{new Date(profile.closetInsightAt).toLocaleDateString('ko-KR')} 기준</Hint>
            )}
          </>
        ) : (
          <Hint>
            실제로 가진 옷의 경향, 말한 취향과 다른 점, 부족한 아이템을 AI가 짚어 줘요.
            {isAiReady(ai) ? '' : ' "내 정보"에서 AI를 먼저 연결해 주세요.'}
          </Hint>
        )}
        {isAiReady(ai) && (
          <Button
            title={busy ? 'AI가 보는 중...' : profile.closetInsight ? '다시 분석' : 'AI로 분석하기'}
            kind={profile.closetInsight ? 'secondary' : 'primary'}
            onPress={runInsight}
            disabled={busy}
          />
        )}
      </Card>
      <Stat title="많이 가진 색상" rows={colors} />
      <Stat title="종류별" rows={cats} />
      <Stat title="계절별" rows={seasons} />
      {brands.length > 0 && <Stat title="자주 사는 브랜드" rows={brands} />}
    </>
  );
}

function Stat({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      {rows.map(([k, n]) => (
        <ThemedText key={k} type="small">
          {k}  {n}벌
        </ThemedText>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  modal: { flex: 1, padding: Spacing.four, gap: Spacing.two, paddingTop: Spacing.six },
  modalImage: { width: '100%', aspectRatio: 1, borderRadius: Spacing.three, backgroundColor: '#ddd' },
  tagImage: { width: 100, height: 100, borderRadius: Spacing.two, marginTop: Spacing.two },
});
