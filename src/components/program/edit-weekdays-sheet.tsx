import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { initialWeekdays } from '@/components/program/start-program-sheet';
import { WeekdayPicker } from '@/components/program/weekday-picker';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { errorMessage } from '@/lib/error-message';
import type { PlanData } from '@/lib/load-plan';
import { countFutureExceptions, setWeekdays } from '@/lib/program-lifecycle';
import type { ProfileId } from '@/types/database';

export function EditWeekdaysSheet({
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
  const [weekdays, setWeekdaysState] = useState(() => initialWeekdays(plan.workoutDays));
  const [futureExceptions, setFutureExceptions] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canSave = !isSaving && weekdays.length === plan.workoutDays.length;

  useEffect(() => {
    countFutureExceptions(profileId, new Date())
      .then(setFutureExceptions)
      .catch((err) => console.error('Failed to count future reschedules:', err));
  }, [profileId]);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await setWeekdays(profileId, plan.workoutDays, weekdays, new Date());
      onDone();
    } catch (err) {
      setSaveError(`Не получилось сохранить дни: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ThemedText type="smallBold">Дни тренировок</ThemedText>
      <WeekdayPicker selected={weekdays} required={plan.workoutDays.length} onChange={setWeekdaysState} />
      {futureExceptions > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Запланированные разовые переносы ({futureExceptions}) сбросятся — тренировки встанут по новым дням.
        </ThemedText>
      )}
      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        style={[styles.action, !canSave && styles.disabled]}>
        <ThemedText type="linkPrimary">{isSaving ? 'Сохраняю…' : 'Сохранить'}</ThemedText>
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
  action: { minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
