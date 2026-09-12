import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContextsField } from '@/components/onboarding/contexts-field';
import { FieldRenderer } from '@/components/onboarding/field-renderer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentProfileId } from '@/lib/auth';
import { ONBOARDING_STEPS, type FieldConfig } from '@/lib/onboarding-steps';
import { EMPTY_ANSWERS, type OnboardingAnswers } from '@/lib/onboarding-types';
import { generateStubPlan } from '@/lib/plan-stub';
import type { ProfileId } from '@/types/database';

function isFieldFilled(field: FieldConfig, answers: OnboardingAnswers): boolean {
  if ('optional' in field && field.optional) return true;
  const value = answers[field.key];
  if (field.type === 'multi-select') return Array.isArray(value) && value.length > 0;
  if (field.type === 'boolean') return true;
  return value !== null && value !== undefined && value !== '';
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ profile?: string }>();
  const [profileId, setProfileId] = useState<ProfileId | null>(params.profile || null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      getCurrentProfileId().then((current) => {
        if (current) setProfileId(current);
        else router.replace('/');
      });
    }
  }, [profileId]);

  function onChange<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const isContextsStep = step.id === 'contexts';

  const canGoNext = isContextsStep
    ? answers.contexts.length > 0
    : step.fields.every((field) => isFieldFilled(field, answers));

  async function handleNext() {
    if (!isLastStep) {
      setStepIndex((i) => i + 1);
      return;
    }
    if (!profileId) return;
    setSubmitting(true);
    setError(null);
    try {
      await generateStubPlan(profileId, answers);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось построить план, попробуй ещё раз.');
      setSubmitting(false);
    }
  }

  if (!profileId) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={theme.text} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ThemedText type="small" themeColor="textSecondary">
          Шаг {stepIndex + 1} из {ONBOARDING_STEPS.length}
        </ThemedText>

        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
          <ThemedText type="subtitle">{step.title}</ThemedText>
          {step.description && (
            <ThemedText type="default" themeColor="textSecondary">
              {step.description}
            </ThemedText>
          )}

          {isContextsStep ? (
            <ContextsField answers={answers} onChange={onChange} />
          ) : (
            step.fields.map((field) => (
              <FieldRenderer key={field.key} field={field} answers={answers} onChange={onChange} />
            ))
          )}

          {error && (
            <ThemedText type="default" themeColor="text" style={styles.error}>
              {error}
            </ThemedText>
          )}
        </ScrollView>

        <ThemedView style={styles.footer}>
          {stepIndex > 0 && (
            <Pressable
              onPress={() => setStepIndex((i) => i - 1)}
              disabled={submitting}
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Назад</ThemedText>
            </Pressable>
          )}
          <Pressable
            onPress={handleNext}
            disabled={!canGoNext || submitting}
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: canGoNext ? theme.accent : theme.backgroundElement },
            ]}>
            {submitting ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText type="smallBold" themeColor={canGoNext ? 'onAccent' : 'textSecondary'}>
                {isLastStep ? 'Построить план' : 'Далее'}
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  error: {
    color: '#D64545',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 2,
  },
});
