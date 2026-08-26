import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ALL_EQUIPMENT_TAGS, ALL_MUSCLE_TAGS, MUSCLE_GROUP_MAP } from '@/lib/muscle-group-map';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type LibraryExercise = Pick<
  Database['public']['Tables']['exercise_library']['Row'],
  'id' | 'name_ru' | 'category_ru' | 'level_ru' | 'equipment_ru' | 'primary_muscles_ru' | 'images'
>;

export default function ExerciseLibraryScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    pickForExerciseId?: string;
    oldExerciseName?: string;
    muscleGroup?: string;
  }>();
  const isPickMode = Boolean(params.pickForExerciseId);

  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(
    () => MUSCLE_GROUP_MAP[params.muscleGroup ?? ''] ?? []
  );
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [exercises, setExercises] = useState<LibraryExercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setExercises(null);
      let query = supabase
        .from('exercise_library')
        .select('id, name_ru, category_ru, level_ru, equipment_ru, primary_muscles_ru, images')
        .order('name_ru');
      if (selectedMuscles.length > 0) query = query.overlaps('primary_muscles_ru', selectedMuscles);
      if (selectedEquipment.length > 0) query = query.in('equipment_ru', selectedEquipment);

      const { data, error: loadError } = await query;
      if (cancelled) return;
      if (loadError) setError(loadError.message);
      else setExercises(data ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedMuscles, selectedEquipment]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function openExercise(exerciseId: string) {
    router.push({
      pathname: '/exercise-library/[id]',
      params: {
        id: exerciseId,
        ...(isPickMode ? { pickForExerciseId: params.pickForExerciseId! } : {}),
      },
    });
  }

  const headerTitle = useMemo(() => {
    if (isPickMode) {
      return params.oldExerciseName
        ? `Выбери замену для «${params.oldExerciseName}»`
        : 'Выбери замену';
    }
    return 'Библиотека упражнений';
  }, [isPickMode, params.oldExerciseName]);

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
            {headerTitle}
          </ThemedText>

          <ThemedText type="smallBold">Группа мышц</ThemedText>
          <View style={styles.chipsRow}>
            {ALL_MUSCLE_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={selectedMuscles.includes(tag)}
                onPress={() => toggle(selectedMuscles, setSelectedMuscles, tag)}
              />
            ))}
          </View>

          <ThemedText type="smallBold">Оборудование</ThemedText>
          <View style={styles.chipsRow}>
            {ALL_EQUIPMENT_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={selectedEquipment.includes(tag)}
                onPress={() => toggle(selectedEquipment, setSelectedEquipment, tag)}
              />
            ))}
          </View>

          {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

          {!exercises && !error && (
            <ActivityIndicator color={theme.text} style={styles.loader} />
          )}

          {exercises && exercises.length === 0 && (
            <ThemedText themeColor="textSecondary">
              Ничего не найдено под эти фильтры.
            </ThemedText>
          )}

          <View style={styles.list}>
            {exercises?.map((ex) => (
              <Pressable
                key={ex.id}
                onPress={() => openExercise(ex.id)}
                style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                {ex.images[0] && (
                  <Image source={{ uri: ex.images[0] }} style={styles.thumb} contentFit="cover" />
                )}
                <View style={styles.cardText}>
                  <ThemedText type="smallBold">{ex.name_ru}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[ex.category_ru, ex.level_ru, ex.equipment_ru].filter(Boolean).join(' · ')}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
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
    fontSize: 28,
    lineHeight: 34,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  loader: {
    marginTop: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.three,
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
});
