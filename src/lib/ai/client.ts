// AI 호출 공통 부품. Gemini(무료)와 Claude(유료) 둘 다 지원.
// 키는 사용자 폰 안에만 저장되고, 앱에서 바로 각 회사 서버로 요청을 보낸다 (중간 서버 없음).
import { ImagePayload } from '../images';

export type AiProvider = 'gemini' | 'claude';

export type AiSettings = {
  provider: AiProvider;
  geminiKey?: string;
  claudeKey?: string;
};

export const emptyAiSettings: AiSettings = { provider: 'gemini' };

// 모델 이름은 여기서만 바꾸면 된다.
// Google이 옛 모델을 내리면 오류 문구에 새 모델 이름을 알려주는데, 그 경우 자동으로 한 번 더 시도한다.
export const GEMINI_MODEL = 'gemini-3.8-flash';
export const CLAUDE_MODEL = 'claude-opus-5';

export const KEY_PAGES: Record<AiProvider, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  claude: 'https://console.anthropic.com/settings/keys',
};

export function activeKey(s: AiSettings): string | undefined {
  const k = s.provider === 'gemini' ? s.geminiKey : s.claudeKey;
  return k?.trim() || undefined;
}

export function isAiReady(s: AiSettings) {
  return !!activeKey(s);
}

export class AiError extends Error {}

type AskOptions = {
  settings: AiSettings;
  system?: string;
  prompt: string;
  images?: ImagePayload[];
  /** true면 JSON만 답하도록 요청 */
  json?: boolean;
  maxTokens?: number;
};

/** 텍스트(+사진)를 보내고 답 텍스트를 받는다 */
export async function askAi(o: AskOptions): Promise<string> {
  const key = activeKey(o.settings);
  if (!key) throw new AiError('AI 키가 없어요. "내 정보"에서 AI를 연결해 주세요.');
  return o.settings.provider === 'gemini' ? askGemini(key, o) : askClaude(key, o);
}

/** JSON 답을 받아서 객체로 바꿔준다 */
export async function askAiJson<T>(o: Omit<AskOptions, 'json'>): Promise<T> {
  const text = await askAi({ ...o, json: true });
  return parseJson<T>(text);
}

function parseJson<T>(text: string): T {
  // AI가 ```json ... ``` 으로 감싸서 주는 경우가 있어서 벗겨낸다
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  const first = start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
  try {
    return JSON.parse(first > 0 ? cleaned.slice(first) : cleaned) as T;
  } catch {
    throw new AiError('AI 답을 읽지 못했어요. 다시 시도해 주세요.');
  }
}

// ---------- Gemini ----------
async function askGemini(key: string, o: AskOptions, model = GEMINI_MODEL, retried = false): Promise<string> {
  const parts: object[] = [{ text: o.prompt }];
  for (const img of o.images ?? []) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      maxOutputTokens: o.maxTokens ?? 2048,
      ...(o.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (o.system) body.systemInstruction = { parts: [{ text: o.system }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // "이 모델은 더 이상 제공되지 않으니 models/xxx 를 쓰세요" 식의 안내가 오면 그 모델로 한 번 재시도
    const suggested = res.status === 404 ? suggestedGeminiModel(json?.error?.message) : undefined;
    if (suggested && !retried && suggested !== model) return askGemini(key, o, suggested, true);
    throw new AiError(geminiErrorMessage(res.status, json));
  }
  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('');
  if (!text) throw new AiError('AI가 답을 주지 않았어요. 다시 시도해 주세요.');
  return text;
}

function suggestedGeminiModel(message?: string): string | undefined {
  const m = message?.match(/use models\/([a-z0-9.-]+)/i);
  return m?.[1];
}

function geminiErrorMessage(status: number, json: { error?: { message?: string } }) {
  if (status === 400 || status === 403) return 'Gemini 키가 올바르지 않아요. 다시 확인해 주세요.';
  if (status === 404) return 'Gemini 모델을 찾지 못했어요. 앱을 최신으로 업데이트해 주세요.';
  if (status === 429) return '무료 사용량을 잠시 넘었어요. 1분 뒤 다시 시도해 주세요.';
  return `Gemini 오류 (${status}): ${json?.error?.message ?? '알 수 없음'}`;
}

// ---------- Claude ----------
async function askClaude(key: string, o: AskOptions): Promise<string> {
  const content: object[] = [];
  for (const img of o.images ?? []) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
    });
  }
  content.push({
    type: 'text',
    text: o.json ? `${o.prompt}\n\n반드시 JSON만 출력하세요. 설명 문장이나 코드 블록 없이.` : o.prompt,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      // 앱에서 서버 없이 직접 부르기 위한 헤더 (본인 키를 본인 기기에서 쓰는 구조)
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: o.maxTokens ?? 2048,
      ...(o.system ? { system: o.system } : {}),
      messages: [{ role: 'user', content }],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiError(claudeErrorMessage(res.status, json));
  const text: string = (json?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');
  if (!text) throw new AiError('AI가 답을 주지 않았어요. 다시 시도해 주세요.');
  return text;
}

function claudeErrorMessage(status: number, json: { error?: { message?: string } }) {
  if (status === 401) return 'Claude 키가 올바르지 않아요. 다시 확인해 주세요.';
  if (status === 429) return '요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.';
  if (status === 400 && /credit|balance/i.test(json?.error?.message ?? ''))
    return 'Claude 충전 잔액이 부족해요.';
  return `Claude 오류 (${status}): ${json?.error?.message ?? '알 수 없음'}`;
}
