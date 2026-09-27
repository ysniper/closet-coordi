// 카메라로 찍기 / 앨범에서 고르기
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('카메라 권한이 필요해요', '설정에서 카메라 접근을 허용해 주세요.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  return result.canceled ? null : result.assets[0].uri;
}

export async function pickPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('사진 접근 권한이 필요해요', '설정에서 사진 접근을 허용해 주세요.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  return result.canceled ? null : result.assets[0].uri;
}
