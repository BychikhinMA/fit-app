import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type LibraryExercise = Database['public']['Tables']['exercise_library']['Row'];

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const { id, pickForExerciseId } = useLocalSearchParams<{
    id: string;
    pickForExerciseId?: string;
  }>();
  const [exercise, setExercise] = useState<LibraryExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('exercise_library')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError) setError(loadError.message);
        else setExercise(data);
      });
  }, [id]);

  async function confirmReplace() {
    if (!exercise || !pickForExerciseId) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ exercise: exercise.name_ru, exercise_library_id: exercise.id })
      .eq('id', pickForExerciseId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.dismiss(2);
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText>{error}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!exercise) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={theme.text} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const steps = exercise.instructions_ru ?? exercise.instructions_en;
  const isFallbackEnglish = !exercise.instructions_ru;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="link" themeColor="textSecondary">
              ← Назад
            </ThemedText>
          </Pressable>

          {exercise.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
              {exercise.images.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.image} contentFit="cover" />
              ))}
            </ScrollView>
          )}

          <ThemedText type="title" style={styles.title}>
            {exercise.name_ru}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {[exercise.category_ru, exercise.level_ru, exercise.equipment_ru]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
          {exercise.primary_muscles_ru.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Основные мышцы: {exercise.primary_muscles_ru.join(', ')}
            </ThemedText>
          )}
          {exercise.secondary_muscles_ru.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Дополнительно: {exercise.secondary_muscles_ru.join(', ')}
            </ThemedText>
          )}

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Техника выполнения</ThemedText>
            {isFallbackEnglish && (
              <ThemedText type="small" themeColor="textSecondary">
                Техника на английском, перевод ещё не готов.
              </ThemedText>
            )}
            {steps.map((step, i) => (
              <ThemedText key={i} type="default">
                {i + 1}. {step}
              </ThemedText>
            ))}
          </ThemedView>

          {pickForExerciseId && (
            <Pressable
              onPress={confirmReplace}
              disabled={saving}
              style={[styles.confirmButton, { backgroundColor: theme.accent }]}>
              {saving ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" themeColor="onAccent">
                  Выбрать это упражнение
                </ThemedText>
              )}
            </Pressable>
          )}
        </ScrollView>
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
  },
  scrollContent: {
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  imagesRow: {
    marginTop: Spacing.two,
  },
  image: {
    width: 240,
    height: 240,
    borderRadius: Radius.card,
    marginRight: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: Spacing.two,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.two,
    ...Elevation.card,
  },
  confirmButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
});
