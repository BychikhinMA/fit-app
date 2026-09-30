import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/onboarding/chip';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { RescheduleDatePicker } from '@/components/workout-day/reschedule-date-picker';
import { Spacing } from '@/constants/theme';
import { formatDayLabel } from '@/lib/calendar-dates';
import { errorMessage } from '@/lib/error-message';
import type { PlanData } from '@/lib/load-plan';
import {
  findConflict,
  rescheduleForever,
  rescheduleOnce,
  swapForever,
  swapOnce,
  type RescheduleScope,
} from '@/lib/reschedule';
import type { ProfileId } from '@/types/database';

type WorkoutDayEntry = PlanData['workoutDays'][number];
type Step = 'pick-date' | 'choose-scope' | 'conflict';

export function RescheduleSheet({
  visible,
  onClose,
  profileId,
  movingDay,
  originDate,
  workoutDays,
  exceptions,
  periods,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  profileId: ProfileId;
  movingDay: WorkoutDayEntry;
  originDate: Date;
  workoutDays: WorkoutDayEntry[];
  exceptions: PlanData['exceptions'];
  periods: PlanData['periods'];
  onDone: (newDate: Date) => void;
}) {
  const [step, setStep] = useState<Step>('pick-date');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [scope, setScope] = useState<RescheduleScope | null>(null);
  const [conflictingDay, setConflictingDay] = useState<WorkoutDayEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function reset() {
    setStep('pick-date');
    setTargetDate(null);
    setScope(null);
    setConflictingDay(null);
    setSaveError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSelectDate(date: Date) {
    setTargetDate(date);
    setStep('choose-scope');
  }

  function handleChooseScope(chosenScope: RescheduleScope) {
    if (!targetDate) return;
    setScope(chosenScope);
    const conflict = findConflict(workoutDays, exceptions, targetDate, movingDay.id, chosenScope);
    if (conflict) {
      setConflictingDay(conflict);
      setStep('conflict');
    } else {
      void commit(chosenScope, null);
    }
  }

  async function commit(chosenScope: RescheduleScope, conflict: WorkoutDayEntry | null) {
    if (!targetDate) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (conflict) {
        if (chosenScope === 'once') {
          await swapOnce(profileId, movingDay.id, originDate, targetDate, conflict.id);
        } else {
          await swapForever(profileId, movingDay, conflict);
        }
      } else if (chosenScope === 'once') {
        await rescheduleOnce(profileId, movingDay.id, originDate, targetDate);
      } else {
        await rescheduleForever(profileId, movingDay.id, targetDate);
      }
      reset();
      onDone(targetDate);
    } catch (err) {
      setSaveError(`Не получилось сохранить перенос: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsSaving(false);
    }
  }

  function handleConfirmSwap() {
    if (!scope) return;
    void commit(scope, conflictingDay);
  }

  function handleCancelConflict() {
    reset();
  }

  return (
    <Sheet visible={visible} onClose={handleClose}>
          {step === 'pick-date' && (
            <>
              <ThemedText type="smallBold">Выбери новую дату</ThemedText>
              <RescheduleDatePicker
                workoutDays={workoutDays}
                exceptions={exceptions}
                periods={periods}
                originDate={originDate}
                onSelectDate={handleSelectDate}
              />
            </>
          )}

          {step === 'choose-scope' && targetDate && (
            <>
              <ThemedText type="smallBold">Перенести на {formatDayLabel(targetDate)}</ThemedText>
              <View style={styles.chipRow}>
                <Chip label="Только в этот раз" selected={false} onPress={() => handleChooseScope('once')} />
                <Chip label="Теперь всегда" selected={false} onPress={() => handleChooseScope('forever')} />
              </View>
            </>
          )}

          {step === 'conflict' && targetDate && conflictingDay && (
            <>
              <ThemedText type="smallBold">
                На {formatDayLabel(targetDate)} уже стоит {conflictingDay.day_label}. Поменять местами?
              </ThemedText>
              <View style={styles.chipRow}>
                <Pressable onPress={handleConfirmSwap} style={styles.actionButton} accessibilityRole="button">
                  <ThemedText type="linkPrimary">Поменять местами</ThemedText>
                </Pressable>
                <Pressable onPress={handleCancelConflict} style={styles.actionButton} accessibilityRole="button">
                  <ThemedText type="default">Отменить перенос</ThemedText>
                </Pressable>
              </View>
            </>
          )}

          {isSaving && <ThemedText type="small" themeColor="textSecondary">Сохраняю…</ThemedText>}
          {saveError && (
            <ThemedText type="small" themeColor="error">
              {saveError}
            </ThemedText>
          )}

          <Pressable onPress={handleClose} style={styles.actionButton} accessibilityRole="button">
            <ThemedText type="small" themeColor="textSecondary">
              Закрыть
            </ThemedText>
          </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: { minHeight: 44, justifyContent: 'center' },
});
