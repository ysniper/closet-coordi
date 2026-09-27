// 내 정보: 키, 몸무게, 성별, 선호 스타일(사진 + 버튼)
import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chips, Hint, Input, Row, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { pickPhoto, takePhoto } from '@/lib/photos';
import { useProfile } from '@/lib/storage';
import { STYLES, StyleTag } from '@/lib/types';

export default function ProfileScreen() {
  const [profile, setProfile] = useProfile();

  const setNumber = (key: 'heightCm' | 'weightKg') => (text: string) => {
    const n = Number(text.replace(/[^\d.]/g, ''));
    setProfile((p) => ({ ...p, [key]: text === '' ? undefined : n }));
  };

  const toggleStyle = (s: StyleTag) =>
    setProfile((p) => ({
      ...p,
      styleTags: p.styleTags.includes(s) ? p.styleTags.filter((x) => x !== s) : [...p.styleTags, s],
    }));

  const addReference = async (from: 'camera' | 'album') => {
    const uri = from === 'camera' ? await takePhoto() : await pickPhoto();
    if (!uri) return;
    setProfile((p) => ({ ...p, styleReferenceUris: [...p.styleReferenceUris, uri] }));
  };

  const removeReference = (uri: string) =>
    Alert.alert('이 사진을 지울까요?', undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () =>
          setProfile((p) => ({
            ...p,
            styleReferenceUris: p.styleReferenceUris.filter((u) => u !== uri),
          })),
      },
    ]);

  return (
    <Screen title="내 정보">
      <Card>
        <SectionTitle>기본 정보</SectionTitle>
        <Row>
          <View style={styles.half}>
            <Hint>키 (cm)</Hint>
            <Input
              keyboardType="numeric"
              placeholder="175"
              value={profile.heightCm?.toString() ?? ''}
              onChangeText={setNumber('heightCm')}
            />
          </View>
          <View style={styles.half}>
            <Hint>몸무게 (kg)</Hint>
            <Input
              keyboardType="numeric"
              placeholder="70"
              value={profile.weightKg?.toString() ?? ''}
              onChangeText={setNumber('weightKg')}
            />
          </View>
        </Row>
        <Hint>성별</Hint>
        <Chips
          options={['남성', '여성', '기타'] as const}
          selected={profile.gender ? [profile.gender] : []}
          onToggle={(g) => setProfile((p) => ({ ...p, gender: p.gender === g ? undefined : g }))}
        />
      </Card>

      <Card>
        <SectionTitle>선호 스타일 (사진으로)</SectionTitle>
        <Hint>
          마음에 드는 스타일 사진을 올려 주세요. 연예인, SNS, 내가 잘 입었던 날 사진 모두 좋아요. 많을수록
          정확해져요.
        </Hint>
        <View style={styles.grid}>
          {profile.styleReferenceUris.map((uri) => (
            <Pressable key={uri} onLongPress={() => removeReference(uri)}>
              <Image source={{ uri }} style={styles.refImage} />
            </Pressable>
          ))}
        </View>
        {profile.styleReferenceUris.length > 0 && <Hint>사진을 길게 누르면 지울 수 있어요.</Hint>}
        <Row>
          <View style={styles.half}>
            <Button title="사진 찍기" kind="secondary" onPress={() => addReference('camera')} />
          </View>
          <View style={styles.half}>
            <Button title="앨범에서 고르기" kind="secondary" onPress={() => addReference('album')} />
          </View>
        </Row>
        {profile.styleSummary ? (
          <ThemedText type="small">AI가 읽은 내 취향: {profile.styleSummary}</ThemedText>
        ) : (
          <Hint>AI 스타일 분석은 다음 단계에서 연결돼요.</Hint>
        )}
      </Card>

      <Card>
        <SectionTitle>선호 스타일 (빠르게 고르기)</SectionTitle>
        <Chips options={STYLES} selected={profile.styleTags} onToggle={toggleStyle} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  half: { flex: 1, gap: Spacing.one },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  refImage: { width: 88, height: 88, borderRadius: Spacing.two, backgroundColor: '#ddd' },
});
