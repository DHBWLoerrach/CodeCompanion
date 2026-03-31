import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_STORAGE_KEY = 'dhbw_device_id';
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDeviceId(value: string | null): value is string {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existingDeviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (isValidDeviceId(existingDeviceId)) {
    return existingDeviceId;
  }

  const deviceId = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}
