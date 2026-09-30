import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RescheduleSheet } from '@/components/workout-day/reschedule-sheet';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentProfileId } from '@/lib/auth';
import { toISODate } from '@/lib/calendar-dates';
import { errorMessage } from '@/lib/error-message';
import { loadPlan, type PlanData } from '@/lib/load-plan';
import { markWorkoutDone, unmarkWorkoutDone } from '@/lib/program-lifecycle';
import { workoutForDate, workoutStatus } from '@/lib/program-schedule';
import { supabase } from '@/lib/supabase';
import type { Database, ProfileId } from '@/types/database';

type WorkoutDay = Database['public']['Tables']['workout_days']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];

export default function WorkoutDayScreen() {
  const theme = useTheme();
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const originDate = useMemo(() => {
    if (!dateParam) return new Date();
    const [y, m, d] = dateParam.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [dateParam]);
  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<ProfileId | null>(null);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  // Переносить можно, только если этот день действительно стоит на originDate
  // и только в активном периоде программы — на паузе переносить нечего. Без
  // `?date` в ссылке originDate — сегодня, и перенос записал бы отмену чужой
  // даты (так появились кривые исключения у профиля Максима).
  const isScheduledOnOrigin = useMemo(
    () =>
      !!planData &&
      workoutForDate(planData.workoutDays, originDate, planData.exceptions, planData.periods)?.id === id,
    [planData, originDate, id]
  );

  const today = new Date();
  const canMark = isScheduledOnOrigin && toISODate(originDate) <= toISODate(today);
  const status = planData && canMark ? workoutStatus(originDate, id, planData.workoutLogs, today) : null;

  const reloadPlan = useCallback((): Promise<void> => {
    if (!profileId) return Promise.resolve();
    return loadPlan(profileId)
      .then(setPlanData)
      .catch((err) => console.error('Failed to reload plan data:', err));
  }, [profileId]);

  async function toggleDone() {
    if (!profileId || !day) return;
    setIsMarking(true);
    setMarkError(null);
    try {
      if (status === 'done') {
        await unmarkWorkoutDone(profileId, day.id, originDate);
      } else {
        await markWorkoutDone({
          profileId,
          workoutDayId: day.id,
          date: originDate,
          dayLabel: day.day_label,
          contextUsed: activeContext,
        });
      }
      // Ждём свежие данные, пока кнопка заблокирована: иначе быстрое второе
      // нажатие увидит старый статус и повторит то же действие.
      await reloadPlan();
    } catch (err) {
      setMarkError(`Не получилось сохранить отметку: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsMarking(false);
    }
  }

  // Все контексты, реально встречающиеся у упражнений этого дня, плюс дефолтный день.
  const contexts = useMemo(() => {
    const set = new Set<string>();
    if (day?.default_context) set.add(day.default_context);
    exercises.forEach((ex) => {
      ex.context_variants.forEach((v) => set.add(v.context_name));
    });
    return [...set];
  }, [day, exercises]);

  const activeContext = selectedContext ?? day?.default_context ?? null;

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
    setSelectedContext(null);

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

  useEffect(() => {
    getCurrentProfileId()
      .then((current) => {
        if (current) setProfileId(current);
      })
      .catch((err) => {
        console.error('Failed to load current profile for reschedule feature:', err);
      });
  }, []);

  useEffect(() => {
    reloadPlan();
  }, [reloadPlan]);

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
          <BackButton onPress={() => router.back()} />

          <ThemedText type="title" style={styles.title}>
            {day.day_label}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {day.target_muscle_groups.join(', ')} · {day.default_context}
          </ThemedText>

          {contexts.length > 1 && (
            <View style={styles.contextRow}>
              {contexts.map((context) => (
                <Chip
                  key={context}
                  label={context}
                  selected={context === activeContext}
                  onPress={() => setSelectedContext(context)}
                />
              ))}
            </View>
          )}

          {day && profileId && planData && isScheduledOnOrigin && (
            <Pressable
              onPress={() => setIsRescheduleOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Перенести тренировку на другую дату"
              style={styles.rescheduleButton}>
              <ThemedText type="linkPrimary">Перенести</ThemedText>
            </Pressable>
          )}

          {canMark && status && (
            <View style={styles.markRow}>
              {status === 'done' && (
                <ThemedText type="smallBold" themeColor="accentText">
                  Выполнено ✓
                </ThemedText>
              )}
              <Pressable
                onPress={toggleDone}
                disabled={isMarking}
                accessibilityRole="button"
                accessibilityState={{ disabled: isMarking }}
                style={styles.rescheduleButton}>
                <ThemedText type={status === 'done' ? 'default' : 'linkPrimary'}>
                  {isMarking ? 'Сохраняю…' : status === 'done' ? 'Снять отметку' : 'Отметить выполненной'}
                </ThemedText>
              </Pressable>
            </View>
          )}
          {markError && (
            <ThemedText type="small" themeColor="error" accessibilityRole="alert">
              {markError}
            </ThemedText>
          )}

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
              const variant =
                activeContext && activeContext !== day.default_context
                  ? ex.context_variants.find((v) => v.context_name === activeContext)
                  : undefined;
              const caption = variant
                ? [variant.exercise_variant, variant.equipment_used ? `инвентарь: ${variant.equipment_used}` : null]
                    .filter(Boolean)
                    .join(' · ')
                : [ex.rest_seconds ? `отдых ${ex.rest_seconds} сек` : null, ex.progression_note]
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
                    <Pressable
                      onPress={() => replaceExercise(ex)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Заменить упражнение «${ex.exercise}»`}
                      style={styles.replaceButton}>
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

      {day && profileId && planData && (
        <RescheduleSheet
          visible={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
          profileId={profileId}
          movingDay={{ ...day, exercises }}
          originDate={originDate}
          workoutDays={planData.workoutDays}
          exceptions={planData.exceptions}
          periods={planData.periods}
          onDone={(newDate) => {
            setIsRescheduleOpen(false);
            load();
            reloadPlan();
            router.setParams({ date: toISODate(newDate) });
          }}
        />
      )}
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
  title: {
    marginBottom: Spacing.one,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
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
  replaceButton: { minHeight: 44, justifyContent: 'center' },
  rescheduleButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
});
