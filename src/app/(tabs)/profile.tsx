import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearStoredProfileId, getStoredProfileId } from '@/lib/profile-storage';
import type { ProfileId } from '@/types/database';

const DISPLAY_NAME: Record<ProfileId, string> = { maksim: 'Максим', maria: 'Мария' };

export default function ProfileTab() {
  const theme = useTheme();
  const [profileId, setProfileId] = useState<ProfileId | null>(null);

  useEffect(() => {
    getStoredProfileId().then((stored) => {
      if (stored) setProfileId(stored);
      else router.replace('/');
    });
  }, []);

  async function switchProfile() {
    await clearStoredProfileId();
    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Профиль
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Сейчас занимается</ThemedText>
            <ThemedText type="subtitle">
              {profileId ? DISPLAY_NAME[profileId] : '—'}
            </ThemedText>
          </ThemedView>

          <Pressable
            onPress={switchProfile}
            style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Сменить профиль</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/onboarding')}
            style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Пройти онбординг заново</ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            Вход по email и паролю появится позже — пока приложение работает в
            гостевом режиме (Максим / Мария).
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  scrollContent: { gap: Spacing.three, paddingVertical: Spacing.four },
  title: { marginBottom: Spacing.two },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    ...Elevation.card,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  note: { marginTop: Spacing.two },
});
