// "내 정보" 탭의 AI 연결 카드: 어떤 AI를 쓸지 고르고, 키를 넣고, 연결을 확인한다.
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Button, Card, Chips, Hint, Input, Row, SectionTitle } from './ui';

import { Spacing } from '@/constants/theme';
import { AiProvider, AiSettings, KEY_PAGES, activeKey } from '@/lib/ai/client';
import { testConnection } from '@/lib/ai/tasks';

const PROVIDER_LABEL: Record<AiProvider, string> = {
  gemini: 'Gemini (무료)',
  claude: 'Claude (유료, 더 정확)',
};
const LABEL_TO_PROVIDER: Record<string, AiProvider> = {
  'Gemini (무료)': 'gemini',
  'Claude (유료, 더 정확)': 'claude',
};

export function AiSettingsCard({
  settings,
  onChange,
}: {
  settings: AiSettings;
  onChange: (next: AiSettings | ((prev: AiSettings) => AiSettings)) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string>();
  const provider = settings.provider;
  const key = provider === 'gemini' ? settings.geminiKey : settings.claudeKey;

  const setKey = (text: string) =>
    onChange((p) => (provider === 'gemini' ? { ...p, geminiKey: text } : { ...p, claudeKey: text }));

  const check = async () => {
    if (!activeKey(settings)) return Alert.alert('키를 먼저 넣어 주세요');
    setChecking(true);
    setStatus(undefined);
    try {
      await testConnection(settings);
      setStatus('연결됐어요. 이제 사진 자동 분류와 AI 코디 추천을 쓸 수 있어요.');
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card>
      <SectionTitle>AI 연결</SectionTitle>
      <Hint>
        옷 사진 자동 분류와 AI 코디 추천에 필요해요. 키는 이 기기 안에만 저장되고, 비용은 본인 계정에서
        나가요. Gemini는 개인 무료 사용량이 있어요.
      </Hint>
      <Chips
        options={[PROVIDER_LABEL.gemini, PROVIDER_LABEL.claude] as const}
        selected={[PROVIDER_LABEL[provider]]}
        onToggle={(label) => {
          setStatus(undefined);
          onChange((p) => ({ ...p, provider: LABEL_TO_PROVIDER[label] }));
        }}
      />
      <Hint>
        {provider === 'gemini'
          ? '1) 아래 버튼으로 Google에 로그인 → "Create API key" 클릭 → 나온 글자를 복사'
          : '1) 아래 버튼으로 Anthropic에 로그인 → 충전 후 "Create Key" 클릭 → 나온 글자를 복사'}
      </Hint>
      <Button
        title={provider === 'gemini' ? 'Gemini 키 만들기 페이지 열기' : 'Claude 키 만들기 페이지 열기'}
        kind="secondary"
        onPress={() => Linking.openURL(KEY_PAGES[provider])}
      />
      <Hint>2) 복사한 키를 여기에 붙여넣기</Hint>
      <Input
        placeholder={provider === 'gemini' ? 'AIza...' : 'sk-ant-...'}
        value={key ?? ''}
        onChangeText={setKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Row>
        <View style={styles.half}>
          <Button title={checking ? '확인 중...' : '3) 연결 확인'} onPress={check} disabled={checking} />
        </View>
      </Row>
      {status ? <ThemedText type="small">{status}</ThemedText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  half: { flex: 1 },
});
