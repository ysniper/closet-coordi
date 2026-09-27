// 사진을 AI에 보내기 좋은 크기(긴 변 1024px, JPEG)로 줄이고 base64 문자열로 만든다.
// 원본을 그대로 보내면 느리고 비용(토큰)이 많이 들어서 줄여서 보낸다.
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';

export type ImagePayload = { base64: string; mimeType: 'image/jpeg' };

export async function toAiImage(uri: string, maxSize = 1024): Promise<ImagePayload> {
  const result = await manipulateAsync(uri, [{ resize: { width: maxSize } }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('사진을 변환하지 못했어요');
  return { base64: result.base64, mimeType: 'image/jpeg' };
}
