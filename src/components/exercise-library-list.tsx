import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ALL_EQUIPMENT_TAGS, MUSCLE_GROUP_MAP } from '@/lib/muscle-group-map';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type LibraryExercise = Pick<
  Database['public']['Tables']['exercise_library']['Row'],
  'id' | 'name_ru' | 'category_ru' | 'level_ru' | 'equipment_ru' | 'primary_muscles_ru' | 'images'
>;

export function ExerciseLibraryList({ mode }: { mode: 'browse' | 'pick' }) {
  const theme = useTheme();
  const isPickMode = mode === 'pick';
  const params = useLocalSearchParams<{
    pickForExerciseId?: string;
    oldExerciseName?: string;
    muscleGroup?: string;
  }>();

  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(
    () => (isPickMode ? params.muscleGroup || null : null)
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
      const muscleTags = selectedMuscleGroup ? MUSCLE_GROUP_MAP[selectedMuscleGroup] ?? [] : [];
      if (muscleTags.length > 0) query = query.overlaps('primary_muscles_ru', muscleTags);
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
  }, [selectedMuscleGroup, selectedEquipment]);

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

  const listHeader = (
    <View style={styles.header}>
      {isPickMode && <BackButton onPress={() => router.back()} />}

      <ThemedText type="title" style={styles.title}>
        {headerTitle}
      </ThemedText>

      <ThemedText type="smallBold">Группа мышц</ThemedText>
      <View style={styles.chipsRow}>
        {Object.keys(MUSCLE_GROUP_MAP).map((group) => (
          <Chip
            key={group}
            label={group}
            selected={selectedMuscleGroup === group}
            onPress={() => setSelectedMuscleGroup((prev) => (prev === group ? null : group))}
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
        <ActivityIndicator
          color={theme.text}
          style={styles.loader}
          accessibilityLabel="Загрузка упражнений"
        />
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={isPickMode ? ['top', 'bottom'] : ['top']}>
        <FlatList
          contentContainerStyle={styles.scrollContent}
          data={exercises ?? []}
          keyExtractor={(ex) => ex.id}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          ListEmptyComponent={
            exercises && exercises.length === 0 ? (
              <ThemedText themeColor="textSecondary">
                Ничего не найдено под эти фильтры.
              </ThemedText>
            ) : null
          }
          renderItem={({ item: ex }) => (
            <Pressable
              onPress={() => openExercise(ex.id)}
              accessibilityRole="button"
              accessibilityLabel={ex.name_ru}
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              {ex.images[0] && (
                <Image
                  source={{ uri: ex.images[0] }}
                  style={styles.thumb}
                  contentFit="cover"
                  importantForAccessibility="no"
                  accessibilityElementsHidden
                />
              )}
              <View style={styles.cardText}>
                <ThemedText type="smallBold">{ex.name_ru}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[ex.category_ru, ex.level_ru, ex.equipment_ru].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
            </Pressable>
          )}
        />
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
    paddingVertical: Spacing.four,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
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
  itemSeparator: {
    height: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    borderRadius: Radius.card,
    padding: Spacing.two,
    gap: Spacing.three,
    alignItems: 'center',
    ...Elevation.card,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.row,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
});
