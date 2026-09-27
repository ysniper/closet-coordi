// 저장한 코디 모아보기
import { Alert, StyleSheet, View } from 'react-native';

import { ClothingThumb } from '@/components/clothing-thumb';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Hint, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useClothes, useOutfits } from '@/lib/storage';
import { Outfit } from '@/lib/types';

export default function SavedScreen() {
  const [clothes] = useClothes();
  const [saved, setSaved] = useOutfits();

  const remove = (o: Outfit) =>
    Alert.alert('이 코디를 지울까요?', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => setSaved((p) => p.filter((s) => s.id !== o.id)) },
    ]);

  return (
    <Screen title="저장한 코디">
      {saved.length === 0 && (
        <Card>
          <Hint>아직 저장한 코디가 없어요. "오늘" 탭에서 마음에 드는 코디를 저장해 보세요.</Hint>
        </Card>
      )}
      {saved.map((o) => (
        <Card key={o.id}>
          <SectionTitle>{o.occasion}</SectionTitle>
          <ThemedText type="small" themeColor="textSecondary">
            {new Date(o.createdAt).toLocaleDateString('ko-KR')}
            {o.weatherSummary ? ` · ${o.weatherSummary}` : ''}
          </ThemedText>
          <View style={styles.items}>
            {o.itemIds
              .map((id) => clothes.find((c) => c.id === id))
              .filter(Boolean)
              .map((c) => <ClothingThumb key={c!.id} item={c!} size={84} />)}
          </View>
          <Hint>{o.reason}</Hint>
          <Button title="지우기" kind="secondary" onPress={() => remove(o)} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
