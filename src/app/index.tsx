import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setStoredProfileId } from '@/lib/profile-storage';
import { supabase } from '@/lib/supabase';
import type { ProfileId } from '@/types/database';

const PROFILES: { id: ProfileId; displayName: string }[] = [
  { id: 'maksim', displayName: 'Максим' },
  { id: 'maria', displayName: 'Мария' },
];

export default function ProfilePickerScreen() {
  const theme = useTheme();
  const [loadingProfile, setLoadingProfile] = useState<ProfileId | null>(null);

  async function selectProfile(id: ProfileId) {
    setLoadingProfile(id);
    try {
      await setStoredProfileId(id);

      const { data, error } = await supabase
        .from('profile_settings')
        .select('profile_id')
        .eq('profile_id', id)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        router.replace('/home');
      } else {
        router.replace({ pathname: '/onboarding', params: { profile: id } });
      }
    } catch (err) {
      setLoadingProfile(null);
      console.error(err);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Кто занимается?
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
          Выбери свой профиль
        </ThemedText>

        <ThemedView style={styles.cards}>
          {PROFILES.map((profile) => (
            <Pressable
              key={profile.id}
              onPress={() => selectProfile(profile.id)}
              disabled={loadingProfile !== null}
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              {loadingProfile === profile.id ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <ThemedText type="subtitle">{profile.displayName}</ThemedText>
              )}
            </Pressable>
          ))}
        </ThemedView>

        <Pressable onPress={() => router.push('/login')} style={styles.loginLink}>
          <ThemedText type="linkPrimary">Войти в свой аккаунт</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  cards: {
    flexDirection: 'row',
    gap: Spacing.four,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    width: 160,
    height: 160,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLink: {
    alignItems: 'center',
  },
});
