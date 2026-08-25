import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ProfileId } from '@/types/database';

const KEY = 'fit-app.current-profile';

export async function getStoredProfileId(): Promise<ProfileId | null> {
  const value = await AsyncStorage.getItem(KEY);
  return value === 'maksim' || value === 'maria' ? value : null;
}

export async function setStoredProfileId(id: ProfileId): Promise<void> {
  await AsyncStorage.setItem(KEY, id);
}

export async function clearStoredProfileId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
