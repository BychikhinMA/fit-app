import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentProfileId, signOut } from '@/lib/auth';
import { clearStoredProfileId } from '@/lib/profile-storage';
import { supabase } from '@/lib/supabase';
import type { ProfileId } from '@/types/database';

export default function ProfileTab() {
  const theme = useTheme();
  const [profileId, setProfileId] = useState<ProfileId | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    getCurrentProfileId().then((current) => {
      if (current) setProfileId(current);
      else router.replace('/');
    });
  }, []);

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', profileId)
      .single()
      .then(({ data }) => setDisplayName(data?.display_name ?? null));
  }, [profileId]);

  async function switchProfile() {
    const { data } = await supabase.auth.getSession();
    if (data.session) await signOut();
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
            <ThemedText type="small" themeColor="textSecondary">
              Сейчас занимается
            </ThemedText>
            <ThemedText type="subtitle">{displayName ?? '—'}</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <Pressable
              onPress={switchProfile}
              accessibilityRole="button"
              accessibilityLabel="Сменить профиль"
              style={styles.actionRow}>
              <ThemedText type="default">Сменить профиль</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push('/onboarding')}
              accessibilityRole="button"
              accessibilityLabel="Пройти онбординг заново"
              style={[styles.actionRow, { borderTopColor: theme.background, borderTopWidth: 1 }]}>
              <ThemedText type="default">Пройти онбординг заново</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            «Сменить профиль» выходит из аккаунта (если ты вошёл по email) и
            возвращает на экран выбора профиля.
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
  actionRow: {
    paddingVertical: Spacing.two,
  },
  note: { marginTop: Spacing.two },
});
