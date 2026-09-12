import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ensureOwnProfile, signUp } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmailNotice, setConfirmEmailNotice] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length >= 6 && password === passwordConfirm && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setConfirmEmailNotice(false);
    try {
      const { session } = await signUp(email.trim(), password);

      if (!session) {
        // Подтверждение email включено в Dashboard (Authentication -> Providers) —
        // без него signUp не выдаёт сессию сразу. Профиль создастся при первом
        // входе через /login после подтверждения.
        setConfirmEmailNotice(true);
        setSubmitting(false);
        return;
      }

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
      setError(err instanceof Error ? err.message : 'Не получилось зарегистрироваться, попробуй ещё раз.');
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="link" themeColor="textSecondary">
            ← Назад
          </ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          Регистрация
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
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <ThemedText type="smallBold">Пароль</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="Минимум 6 символов"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <ThemedText type="smallBold">Повтори пароль</ThemedText>
        <TextInput
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
          autoComplete="new-password"
          placeholder="••••••••"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        {error && (
          <ThemedText type="default" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {confirmEmailNotice && (
          <ThemedText type="default" themeColor="textSecondary">
            Проверь почту и перейди по ссылке подтверждения, потом зайди через «Войти».
          </ThemedText>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.button,
            { backgroundColor: canSubmit ? theme.accent : theme.backgroundElement },
          ]}>
          {submitting ? (
            <ActivityIndicator color={theme.onAccent} />
          ) : (
            <ThemedText type="smallBold" themeColor={canSubmit ? 'onAccent' : 'textSecondary'}>
              Зарегистрироваться
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/login')} style={styles.linkRow}>
          <ThemedText type="linkPrimary">Уже есть аккаунт? Войти</ThemedText>
        </Pressable>
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
    gap: Spacing.two,
  },
  backButton: { alignSelf: 'flex-start' },
  title: { marginTop: Spacing.two, marginBottom: Spacing.two },
  input: {
    borderRadius: Radius.row,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  error: { color: '#D64545' },
  button: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  linkRow: { alignItems: 'center', marginTop: Spacing.two },
});
