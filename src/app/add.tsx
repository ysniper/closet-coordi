// 옷 등록: 옷 사진 + 택 사진 → AI가 정보 자동 입력(연결 시) → 확인 후 저장
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chips, Hint, Input, Row, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { isAiReady } from '@/lib/ai/client';
import { ClothingGuess, classifyClothing } from '@/lib/ai/tasks';
import { toAiImage } from '@/lib/images';
import { pickPhoto, takePhoto } from '@/lib/photos';
import { newId, useAiSettings, useClothes } from '@/lib/storage';
import { CATEGORIES, Category, OCCASIONS, SEASONS, Season } from '@/lib/types';

const THICKNESS = ['얇음', '보통', '두꼼'] as const;

export default function AddScreen() {
  const [, setClothes] = useClothes();
  const [ai] = useAiSettings();

  const [photoUri, setPhotoUri] = useState<string>();
  const [tagPhotoUri, setTagPhotoUri] = useState<string>();
  const [category, setCategory] = useState<Category>();
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [modelNo, setModelNo] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [thickness, setThickness] = useState<1 | 2 | 3>(2);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState<string>();

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const applyGuess = (g: ClothingGuess) => {
    if (g.category) setCategory(g.category);
    if (g.color) setColor(g.color);
    if (g.material) setMaterial(g.material);
    if (g.brand) setBrand(g.brand);
    if (g.size) setSize(g.size);
    if (g.modelNo) setModelNo(g.modelNo);
    if (g.productName) setProductName(g.productName);
    if (g.price) setPrice(g.price);
    if (g.seasons?.length) setSeasons(g.seasons);
    if (g.thickness) setThickness(g.thickness);
    if (g.occasions?.length) setOccasions(g.occasions);
    if (g.note) setNote(g.note);
  };

  const runAi = async (photo: string, tag?: string) => {
    if (!isAiReady(ai)) return;
    setAiBusy(true);
    setAiMessage(undefined);
    try {
      const [p, t] = await Promise.all([toAiImage(photo), tag ? toAiImage(tag) : undefined]);
      applyGuess(await classifyClothing(ai, p, t));
      setAiMessage('AI가 채웠어요. 틀린 부분은 고쳐 주세요.');
    } catch (e) {
      setAiMessage(`AI 자동 입력 실패: ${(e as Error).message}`);
    } finally {
      setAiBusy(false);
    }
  };

  const shoot = async (target: 'photo' | 'tag', from: 'camera' | 'album') => {
    const uri = from === 'camera' ? await takePhoto() : await pickPhoto();
    if (!uri) return;
    if (target === 'photo') {
      setPhotoUri(uri);
      void runAi(uri, tagPhotoUri);
    } else {
      setTagPhotoUri(uri);
      if (photoUri) void runAi(photoUri, uri);
    }
  };

  const reset = () => {
    setPhotoUri(undefined);
    setTagPhotoUri(undefined);
    setCategory(undefined);
    setColor('');
    setMaterial('');
    setBrand('');
    setSize('');
    setModelNo('');
    setProductName('');
    setPrice('');
    setSeasons([]);
    setThickness(2);
    setOccasions([]);
    setNote('');
    setAiMessage(undefined);
  };

  const save = () => {
    if (!photoUri) return Alert.alert('옷 사진을 먼저 찍어 주세요');
    if (!category) return Alert.alert('옷 종류를 골라 주세요');
    if (!color.trim()) return Alert.alert('색상을 적어 주세요');

    setClothes((prev) => [
      {
        id: newId(),
        photoUri,
        tagPhotoUri,
        category,
        color: color.trim(),
        material: material.trim() || undefined,
        brand: brand.trim() || undefined,
        size: size.trim() || undefined,
        modelNo: modelNo.trim() || undefined,
        productName: productName.trim() || undefined,
        price: price.trim() || undefined,
        seasons,
        thickness,
        occasions,
        note: note.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    reset();
    Alert.alert('옷장에 넣었어요', undefined, [
      { text: '계속 등록' },
      { text: '옷장 보기', onPress: () => router.navigate('/closet') },
    ]);
  };

  return (
    <Screen title="옷 등록">
      <Card>
        <SectionTitle>1. 옷 사진</SectionTitle>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : <Hint>옷을 잘 보이게 찍어 주세요.</Hint>}
        <Row>
          <View style={styles.half}>
            <Button title="사진 찍기" onPress={() => shoot('photo', 'camera')} />
          </View>
          <View style={styles.half}>
            <Button title="앨범에서" kind="secondary" onPress={() => shoot('photo', 'album')} />
          </View>
        </Row>
      </Card>

      <Card>
        <SectionTitle>2. 택(라벨) 사진 (선택)</SectionTitle>
        {tagPhotoUri ? (
          <Image source={{ uri: tagPhotoUri }} style={styles.previewSmall} />
        ) : (
          <Hint>
            브랜드, 사이즈, 소재가 적힌 택을 찍어 주세요. 기존 옷은 안쪽 케어 라벨, 새 옷은 가격표 택이면
            돼요. 모델명이 보이면 AI가 인터넷에서 제품명과 정가까지 찾아 채워요.
          </Hint>
        )}
        <Row>
          <View style={styles.half}>
            <Button title="택 찍기" kind="secondary" onPress={() => shoot('tag', 'camera')} />
          </View>
          <View style={styles.half}>
            <Button title="앨범에서" kind="secondary" onPress={() => shoot('tag', 'album')} />
          </View>
        </Row>
      </Card>

      <Card>
        <SectionTitle>3. 옷 정보</SectionTitle>
        {isAiReady(ai) ? (
          aiBusy ? (
            <View style={styles.row}>
              <ActivityIndicator />
              <Hint>{tagPhotoUri ? 'AI가 택을 읽고 제품을 검색하고 있어요...' : 'AI가 사진을 보고 있어요...'}</Hint>
            </View>
          ) : (
            <>
              {aiMessage ? <ThemedText type="small">{aiMessage}</ThemedText> : null}
              {photoUri ? (
                <Button
                  title="AI로 다시 채우기"
                  kind="secondary"
                  onPress={() => runAi(photoUri, tagPhotoUri)}
                />
              ) : (
                <Hint>사진을 찍으면 AI가 아래 항목을 자동으로 채워요.</Hint>
              )}
            </>
          )
        ) : (
          <Hint>"내 정보" 탭에서 AI를 연결하면 사진만 찍어도 자동으로 채워져요. 지금은 직접 적어요.</Hint>
        )}
        <Hint>종류</Hint>
        <Chips
          options={CATEGORIES}
          selected={category ? [category] : []}
          onToggle={(c) => setCategory(category === c ? undefined : c)}
        />
        <Hint>색상</Hint>
        <Input placeholder="예: 네이비" value={color} onChangeText={setColor} />
        <Row>
          <View style={styles.half}>
            <Hint>브랜드</Hint>
            <Input placeholder="예: 유니클로" value={brand} onChangeText={setBrand} />
          </View>
          <View style={styles.half}>
            <Hint>사이즈</Hint>
            <Input placeholder="예: L" value={size} onChangeText={setSize} />
          </View>
        </Row>
        <Hint>소재</Hint>
        <Input placeholder="예: 면 100%" value={material} onChangeText={setMaterial} />
        <Hint>제품명 (택을 찍으면 검색해서 채워요)</Hint>
        <Input placeholder="예: 에어리즘 코튼 오버사이즈 티셔츠" value={productName} onChangeText={setProductName} />
        <Row>
          <View style={styles.half}>
            <Hint>모델명/품번</Hint>
            <Input placeholder="예: 422234" value={modelNo} onChangeText={setModelNo} autoCapitalize="characters" />
          </View>
          <View style={styles.half}>
            <Hint>정가</Hint>
            <Input placeholder="예: 29,900원" value={price} onChangeText={setPrice} />
          </View>
        </Row>
        <Hint>계절</Hint>
        <Chips options={SEASONS} selected={seasons} onToggle={(s) => setSeasons(toggle(seasons, s))} />
        <Hint>두께</Hint>
        <Chips
          options={THICKNESS}
          selected={[THICKNESS[thickness - 1]]}
          onToggle={(t) => setThickness((THICKNESS.indexOf(t) + 1) as 1 | 2 | 3)}
        />
        <Hint>어울리는 상황</Hint>
        <Chips options={OCCASIONS} selected={occasions} onToggle={(o) => setOccasions(toggle(occasions, o))} />
        <Hint>메모</Hint>
        <Input placeholder="예: 오버핏 스트라이프 셔츠" value={note} onChangeText={setNote} />
      </Card>

      <Button title="옷장에 넣기" onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  half: { flex: 1, gap: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  preview: { width: '100%', aspectRatio: 1, borderRadius: Spacing.two, backgroundColor: '#ddd' },
  previewSmall: { width: 120, height: 120, borderRadius: Spacing.two, backgroundColor: '#ddd' },
});
