import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/onboarding/chip';
import { WeekdayPicker } from '@/components/program/weekday-picker';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatDayLabel } from '@/lib/calendar-dates';
import { errorMessage } from '@/lib/error-message';
import type { PlanData } from '@/lib/load-plan';
import { setWeekdays, startProgram } from '@/lib/program-lifecycle';
import { defaultWeekdays } from '@/lib/program-schedule';
import type { ProfileId } from '@/types/database';

/** Текущие дни недели программы, если они корректны; иначе — равномерный разнос. */
export function initialWeekdays(workoutDays: PlanData['workoutDays']): number[] {
  const current = workoutDays.map((d) => d.weekday).filter((w): w is number => w !== null);
  const unique = [...new Set(current)].sort((a, b) => a - b);
  if (unique.length === workoutDays.length && workoutDays.length > 0) return unique;
  return defaultWeekdays(Math.min(7, Math.max(1, workoutDays.length)));
}

function startOptions(today: Date): { label: string; date: Date }[] {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
  const daysToMonday = ((8 - base.getDay()) % 7) || 7;
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysToMonday);
  return [
    { label: 'Сегодня', date: base },
    { label: 'Завтра', date: tomorrow },
    { label: `С понедельника, ${monday.getDate()}.${String(monday.getMonth() + 1).padStart(2, '0')}`, date: monday },
  ];
}

export function StartProgramSheet({
  visible,
  onClose,
  profileId,
  plan,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  profileId: ProfileId;
  plan: PlanData;
  onDone: () => void;
}) {
  const options = startOptions(new Date());
  const [startIndex, setStartIndex] = useState(0);
  const [weekdays, setWeekdaysState] = useState(() => initialWeekdays(plan.workoutDays));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canSave = !isSaving && weekdays.length === plan.workoutDays.length && !!plan.program;

  async function handleStart() {
    if (!plan.program) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const today = new Date();
      const current = initialWeekdays(plan.workoutDays);
      if (current.join() !== weekdays.join()) await setWeekdays(profileId, plan.workoutDays, weekdays, today);
      await startProgram(profileId, plan.program.id, options[startIndex].date);
      onDone();
    } catch (err) {
      setSaveError(`Не получилось начать программу: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ThemedText type="smallBold">Когда начинаем</ThemedText>
      <View style={styles.row}>
        {options.map((option, i) => (
          <Chip key={option.label} label={option.label} selected={i === startIndex} onPress={() => setStartIndex(i)} />
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Старт: {formatDayLabel(options[startIndex].date)}
      </ThemedText>

      <ThemedText type="smallBold">В какие дни тренируемся</ThemedText>
      <WeekdayPicker selected={weekdays} required={plan.workoutDays.length} onChange={setWeekdaysState} />

      <Pressable
        onPress={handleStart}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        style={[styles.action, !canSave && styles.disabled]}>
        <ThemedText type="linkPrimary">{isSaving ? 'Сохраняю…' : 'Начать программу'}</ThemedText>
      </Pressable>
      {saveError && (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {saveError}
        </ThemedText>
      )}
      <Pressable onPress={onClose} style={styles.action} accessibilityRole="button">
        <ThemedText type="small" themeColor="textSecondary">
          Закрыть
        </ThemedText>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  action: { minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
