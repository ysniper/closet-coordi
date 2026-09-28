// 쇼핑 도우미: 매장에서 새 옷의 가격표 택을 찍으면 사이즈·겹침·가능한 코디를 보고 살지 말지 알려준다.
// 샀으면 그 자리에서 옷장에 바로 등록.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ClothingThumb } from '@/components/clothing-thumb';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Hint, Row, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { isAiReady } from '@/lib/ai/client';
import { ShoppingVerdict, judgeNewItem } from '@/lib/ai/tasks';
import { toAiImage } from '@/lib/images';
import { pickPhoto, takePhoto } from '@/lib/photos';
import { newId, useAiSettings, useClothes, useProfile } from '@/lib/storage';
import { ClothingItem } from '@/lib/types';

const VERDICT_COLOR: Record<ShoppingVerdict['verdict'], string> = {
  사세요: '#2e9e5b',
  '고민해 보세요': '#d9822b',
  '안 사도 돼요': '#e5484d',
};

export default function ShopScreen() {
  const [clothes, setClothes] = useClothes();
  const [profile] = useProfile();
  const [ai] = useAiSettings();

  const [tagUri, setTagUri] = useState<string>();
  const [productUri, setProductUri] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShoppingVerdict>();
  const [error, setError] = useState<string>();

  const byId = new Map(clothes.map((c) => [c.id, c]));

  const shoot = async (target: 'tag' | 'product', from: 'camera' | 'album') => {
    const uri = from === 'camera' ? await takePhoto() : await pickPhoto();
    if (!uri) return;
    if (target === 'tag') setTagUri(uri);
    else setProductUri(uri);
    setResult(undefined);
    setError(undefined);
  };

  const judge = async () => {
    if (!tagUri) return Alert.alert('가격표 택을 먼저 찍어 주세요');
    if (!isAiReady(ai)) return Alert.alert('AI를 먼저 연결해 주세요', '"내 정보"에서 키를 넣어 주세요.');
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const [tag, product] = await Promise.all([
        toAiImage(tagUri),
        productUri ? toAiImage(productUri) : undefined,
      ]);
      setResult(await judgeNewItem(ai, tag, clothes, profile, product));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setTagUri(undefined);
    setProductUri(undefined);
    setResult(undefined);
    setError(undefined);
  };

  const bought = () => {
    if (!result || !tagUri) return;
    const g = result.item;
    const item: ClothingItem = {
      id: newId(),
      // 옷 사진이 없으면 택 사진을 대표 사진으로 쓴다 (나중에 옷장에서 바꿀 수 있음)
      photoUri: productUri ?? tagUri,
      tagPhotoUri: tagUri,
      category: g.category ?? '상의',
      color: g.color ?? '색상 미정',
      material: g.material,
      brand: g.brand,
      size: g.size,
      modelNo: g.modelNo,
      productName: g.productName,
      price: g.price,
      seasons: g.seasons ?? [],
      thickness: g.thickness ?? 2,
      occasions: g.occasions ?? [],
      note: g.note,
      createdAt: new Date().toISOString(),
    };
    setClothes((prev) => [item, ...prev]);
    reset();
    Alert.alert('옷장에 넣었어요', '종류나 색이 다르면 옷장에서 확인해 주세요.', [
      { text: '계속 쇼핑' },
      { text: '옷장 보기', onPress: () => router.navigate('/closet') },
    ]);
  };

  return (
    <Screen title="쇼핑 도우미">
      <Card>
        <Hint>
          매장에서 마음에 드는 옷의 가격표 택을 찍어 보세요. 사이즈가 맞을지, 이미 비슷한 옷이 있는지, 사면
          어떤 코디가 늘어나는지 보고 살지 말지 알려 드려요.
        </Hint>
      </Card>

      <Card>
        <SectionTitle>1. 가격표 택</SectionTitle>
        {tagUri ? (
          <Image source={{ uri: tagUri }} style={styles.preview} />
        ) : (
          <Hint>브랜드, 모델명, 사이즈, 가격이 보이게 찍어 주세요.</Hint>
        )}
        <Row>
          <View style={styles.half}>
            <Button title="택 찍기" onPress={() => shoot('tag', 'camera')} />
          </View>
          <View style={styles.half}>
            <Button title="앨범에서" kind="secondary" onPress={() => shoot('tag', 'album')} />
          </View>
        </Row>
      </Card>

      <Card>
        <SectionTitle>2. 옷 사진 (선택)</SectionTitle>
        {productUri ? (
          <Image source={{ uri: productUri }} style={styles.previewSmall} />
        ) : (
          <Hint>옷 전체가 보이게 찍으면 색과 핏을 더 정확히 봐요.</Hint>
        )}
        <Row>
          <View style={styles.half}>
            <Button title="옷 찍기" kind="secondary" onPress={() => shoot('product', 'camera')} />
          </View>
          <View style={styles.half}>
            <Button title="앨범에서" kind="secondary" onPress={() => shoot('product', 'album')} />
          </View>
        </Row>
      </Card>

      {busy ? (
        <Card>
          <View style={styles.row}>
            <ActivityIndicator />
            <Hint>택을 읽고 제품을 검색한 뒤 내 옷장과 비교하고 있어요...</Hint>
          </View>
        </Card>
      ) : (
        <Button title={result ? '다시 판단하기' : '살지 말지 판단하기'} onPress={judge} />
      )}
      {error ? (
        <Card>
          <ThemedText type="small">판단 실패: {error}</ThemedText>
        </Card>
      ) : null}

      {result && (
        <>
          <Card>
            <ThemedText type="subtitle" style={{ color: VERDICT_COLOR[result.verdict] }}>
              {result.verdict}
            </ThemedText>
            <ThemedText type="small">{result.summary}</ThemedText>
          </Card>

          <Card>
            <SectionTitle>이 옷</SectionTitle>
            <Detail label="제품명" value={result.item.productName} />
            <Detail label="브랜드" value={result.item.brand} />
            <Detail label="모델명" value={result.item.modelNo} />
            <Detail label="종류" value={result.item.category} />
            <Detail label="색상" value={result.item.color} />
            <Detail label="소재" value={result.item.material} />
            <Detail label="사이즈" value={result.item.size} />
            <Detail label="가격" value={result.item.price} />
          </Card>

          <Card>
            <SectionTitle>사이즈</SectionTitle>
            <ThemedText type="small">{result.sizeCheck}</ThemedText>
          </Card>

          <Card>
            <SectionTitle>겹치는 옷</SectionTitle>
            <ThemedText type="small">{result.overlapNote}</ThemedText>
            {result.overlapIds.length > 0 && (
              <View style={styles.grid}>
                {result.overlapIds.map((id) => {
                  const c = byId.get(id);
                  return c ? <ClothingThumb key={id} item={c} size={80} /> : null;
                })}
              </View>
            )}
          </Card>

          <Card>
            <SectionTitle>사면 가능한 코디</SectionTitle>
            {result.outfits.length === 0 ? (
              <Hint>기존 옷과 바로 맞출 코디를 찾지 못했어요.</Hint>
            ) : (
              result.outfits.map((o, i) => (
                <View key={i} style={{ gap: Spacing.one }}>
                  <ThemedText type="small">
                    {i + 1}. {o.reason}
                  </ThemedText>
                  <View style={styles.grid}>
                    {o.itemIds.map((id) => {
                      const c = byId.get(id);
                      return c ? <ClothingThumb key={id} item={c} size={72} /> : null;
                    })}
                  </View>
                </View>
              ))
            )}
          </Card>

          <Button title="샀어요, 옷장에 넣기" onPress={bought} />
          <Button title="처음부터" kind="secondary" onPress={reset} />
        </>
      )}
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

const styles = StyleSheet.create({
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: Spacing.two, backgroundColor: '#ddd' },
  previewSmall: { width: 120, height: 120, borderRadius: Spacing.two, backgroundColor: '#ddd' },
});
