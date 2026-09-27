// 옷 등록: 옷 사진 + 택 사진 → 정보 입력(나중에 AI가 자동으로 채움) → 저장
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, Chips, Hint, Input, Row, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { pickPhoto, takePhoto } from '@/lib/photos';
import { newId, useClothes } from '@/lib/storage';
import { CATEGORIES, Category, OCCASIONS, SEASONS, Season } from '@/lib/types';

const THICKNESS = ['얇음', '보통', '두꼼'] as const;

export default function AddScreen() {
  const [, setClothes] = useClothes();

  const [photoUri, setPhotoUri] = useState<string>();
  const [tagPhotoUri, setTagPhotoUri] = useState<string>();
  const [category, setCategory] = useState<Category>();
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [thickness, setThickness] = useState<1 | 2 | 3>(2);
  const [occasions, setOccasions] = useState<string[]>([]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const shoot = async (target: 'photo' | 'tag', from: 'camera' | 'album') => {
    const uri = from === 'camera' ? await takePhoto() : await pickPhoto();
    if (!uri) return;
    if (target === 'photo') setPhotoUri(uri);
    else setTagPhotoUri(uri);
  };

  const reset = () => {
    setPhotoUri(undefined);
    setTagPhotoUri(undefined);
    setCategory(undefined);
    setColor('');
    setMaterial('');
    setBrand('');
    setSize('');
    setSeasons([]);
    setThickness(2);
    setOccasions([]);
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
        seasons,
        thickness,
        occasions,
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
          <Hint>브랜드, 사이즈, 소재가 적힌 택을 찍으면 다음 단계에서 AI가 자동으로 읽어요.</Hint>
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
        <Hint>지금은 직접 적어요. AI 자동 분류는 다음 단계에서 붙어요.</Hint>
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
      </Card>

      <Button title="옷장에 넣기" onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  half: { flex: 1, gap: Spacing.one },
  preview: { width: '100%', aspectRatio: 1, borderRadius: Spacing.two, backgroundColor: '#ddd' },
  previewSmall: { width: 120, height: 120, borderRadius: Spacing.two, backgroundColor: '#ddd' },
});
