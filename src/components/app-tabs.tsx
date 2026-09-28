import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: '오늘', icon: 'weather-partly-cloudy' },
  { name: 'closet', label: '옷장', icon: 'hanger' },
  { name: 'add', label: '등록', icon: 'camera-plus' },
  { name: 'shop', label: '쇼핑', icon: 'shopping-outline' },
  { name: 'saved', label: '저장', icon: 'heart' },
  { name: 'profile', label: '내 정보', icon: 'account' },
];

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={<NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name={t.icon} />}
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
