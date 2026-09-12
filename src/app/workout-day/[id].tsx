import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type WorkoutDay = Database['public']['Tables']['workout_days']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];

export default function WorkoutDayScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: dayData, error: dayError } = await supabase
      .from('workout_days')
      .select('*')
      .eq('id', id)
      .single();
    if (dayError) {
      setError(dayError.message);
      return;
    }
    setDay(dayData);

    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_day_id', id)
      .order('sort_order');
    if (exercisesError) {
      setError(exercisesError.message);
      return;
    }
    setExercises(exercisesData ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function replaceExercise(exercise: Exercise) {
    router.push({
      pathname: '/exercise-library',
      params: {
        pickForExerciseId: exercise.id,
        oldExerciseName: exercise.exercise,
        muscleGroup: exercise.muscle_group ?? '',
      },
    });
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

  if (!day) {
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="link" themeColor="textSecondary">
              ← Назад
            </ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            {day.day_label}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {day.target_muscle_groups.join(', ')} · {day.default_context}
          </ThemedText>

          {day.warmup.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Разминка</ThemedText>
              {day.warmup.map((item, i) => (
                <ThemedText key={i} type="small" themeColor="textSecondary">
                  • {item.name} — {item.duration_or_reps}
                </ThemedText>
              ))}
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.exercisesCard}>
            {exercises.map((ex, i) => {
              const caption = [
                ex.rest_seconds ? `отдых ${ex.rest_seconds} сек` : null,
                ex.progression_note,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <View
                  key={ex.id}
                  style={[
                    styles.exerciseRow,
                    i > 0 && { borderTopColor: theme.background, borderTopWidth: 1 },
                  ]}>
                  <View style={styles.exerciseHeadline}>
                    <ThemedText type="default" style={styles.exerciseName}>
                      {ex.exercise}
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {ex.sets}×{ex.reps_or_time}
                    </ThemedText>
                  </View>
                  <View style={styles.exerciseFootline}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.exerciseCaption}>
                      {caption}
                    </ThemedText>
                    <Pressable onPress={() => replaceExercise(ex)} hitSlop={8}>
                      <ThemedText type="linkPrimary">Заменить</ThemedText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ThemedView>

          {day.cooldown.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Заминка</ThemedText>
              {day.cooldown.map((item, i) => (
                <ThemedText key={i} type="small" themeColor="textSecondary">
                  • {item.name} — {item.duration_or_reps}
                </ThemedText>
              ))}
            </ThemedView>
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
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  title: {
    marginBottom: Spacing.one,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    ...Elevation.card,
  },
  exercisesCard: {
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    ...Elevation.card,
  },
  exerciseRow: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  exerciseHeadline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  exerciseName: { flex: 1 },
  exerciseFootline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  exerciseCaption: { flex: 1 },
});
