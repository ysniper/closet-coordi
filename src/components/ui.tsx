// 여러 화면에서 같이 쓰는 작은 부품들: 화면 틀, 버튼, 선택 칩, 입력칸
import { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const Accent = '#3c87f7';

export function Screen({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText type="subtitle">{title}</ThemedText>
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {children}
    </ThemedView>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <ThemedText type="smallBold">{children}</ThemedText>;
}

export function Hint({ children }: PropsWithChildren) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const bg = kind === 'primary' ? Accent : kind === 'danger' ? '#e5484d' : theme.backgroundSelected;
  const color = kind === 'secondary' ? theme.text : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

/** 여러 개 중 고르는 칩 묶음 */
export function Chips<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly T[];
  selected: readonly T[];
  onToggle: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Pressable
            key={o}
            onPress={() => onToggle(o)}
            style={[
              styles.chip,
              { backgroundColor: on ? Accent : theme.backgroundSelected },
            ]}>
            <ThemedText type="small" style={on ? { color: '#fff' } : undefined}>
              {o}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={[styles.input, { color: theme.text, backgroundColor: theme.background }, props.style]}
    />
  );
}

export function Row({ children }: PropsWithChildren) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, width: '100%' },
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  button: {
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingVertical: Spacing.one + 2, paddingHorizontal: Spacing.three, borderRadius: 999 },
  input: {
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
});
