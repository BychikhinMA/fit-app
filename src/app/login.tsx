import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ensureOwnProfile, signInWithPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
      const profile = await ensureOwnProfile();

      const { data: settings } = await supabase
        .from('profile_settings')
        .select('profile_id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (settings) {
        router.replace('/home');
      } else {
        router.replace({ pathname: '/onboarding', params: { profile: profile.id } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось войти, попробуй ещё раз.');
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <BackButton onPress={() => router.back()} />

            <ThemedText type="title" style={styles.title}>
              Вход
            </ThemedText>

            <ThemedText type="smallBold">Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Email"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            <ThemedText type="smallBold">Пароль</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Пароль"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            {error && (
              <ThemedText type="default" style={{ color: theme.error }}>
                {error}
              </ThemedText>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Войти"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              style={[
                styles.button,
                { backgroundColor: canSubmit ? theme.accent : theme.backgroundElement },
              ]}>
              {submitting ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" themeColor={canSubmit ? 'onAccent' : 'textSecondary'}>
                  Войти
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/signup')}
              style={styles.linkRow}
              accessibilityRole="link"
              accessibilityLabel="Нет аккаунта? Зарегистрироваться">
              <ThemedText type="linkPrimary">Нет аккаунта? Зарегистрироваться</ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  scrollContent: { gap: Spacing.two, flexGrow: 1 },
  title: { marginTop: Spacing.two, marginBottom: Spacing.two },
  input: {
    borderRadius: Radius.row,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  linkRow: { alignItems: 'center', marginTop: Spacing.two },
});
