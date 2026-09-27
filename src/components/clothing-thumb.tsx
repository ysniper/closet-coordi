import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { ClothingItem } from '@/lib/types';

export function ClothingThumb({
  item,
  size = 100,
  onPress,
}: {
  item: ClothingItem;
  size?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ width: size, gap: Spacing.one }}>
      <Image source={{ uri: item.photoUri }} style={[styles.image, { width: size, height: size }]} />
      <View>
        <ThemedText type="small" numberOfLines={1}>
          {item.color} {item.category}
        </ThemedText>
        {item.brand ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {item.brand}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: Spacing.two, backgroundColor: '#ddd' },
});
