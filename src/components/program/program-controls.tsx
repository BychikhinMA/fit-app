import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EditWeekdaysSheet } from '@/components/program/edit-weekdays-sheet';
import { StartProgramSheet } from '@/components/program/start-program-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { WEEKDAY_SHORT, formatDayLabel } from '@/lib/calendar-dates';
import { errorMessage } from '@/lib/error-message';
import type { PlanData } from '@/lib/load-plan';
import { cancelScheduledStart, pauseProgram, resumeProgram, stopProgram } from '@/lib/program-lifecycle';
import { programState, type ProgramState } from '@/lib/program-schedule';
import type { ProfileId } from '@/types/database';

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function describeState(state: ProgramState): string {
  switch (state.kind) {
    case 'not_started':
      return 'Программа не запущена';
    case 'scheduled':
      return `Старт: ${formatDayLabel(isoToDate(state.startsOn))}`;
    case 'active':
      return `Идёт с ${formatDayLabel(isoToDate(state.since))}`;
    case 'paused':
      return `На паузе с ${formatDayLabel(isoToDate(state.since))}`;
    case 'stopped':
      return 'Программа завершена';
  }
}

export function ProgramControls({
  profileId,
  plan,
  onChanged,
}: {
  profileId: ProfileId;
  plan: PlanData;
  onChanged: () => void;
}) {
  const state = programState(plan.periods, new Date());
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isDaysOpen, setIsDaysOpen] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const programId = plan.program?.id;
  const weekdaysLabel = [...new Set(plan.workoutDays.map((d) => d.weekday).filter((w): w is number => w !== null))]
    .sort((a, b) => a - b)
    .map((w) => WEEKDAY_SHORT[w])
    .join(', ');

  async function run(action: () => Promise<void>, failure: string) {
    setIsSaving(true);
    setActionError(null);
    try {
      await action();
      setConfirmStop(false);
      onChanged();
    } catch (err) {
      setActionError(`Не получилось ${failure}: ${errorMessage(err, 'неизвестная ошибка')}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!programId) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{describeState(state)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Дни: {weekdaysLabel || 'не выбраны'}
      </ThemedText>

      <View style={styles.actions}>
        {(state.kind === 'not_started' || state.kind === 'stopped') && (
          <Action label={state.kind === 'stopped' ? 'Начать заново' : 'Начать'} primary disabled={isSaving} onPress={() => setIsStartOpen(true)} />
        )}
        {state.kind === 'paused' && (
          <Action
            label="Продолжить"
            primary
            disabled={isSaving}
            onPress={() => run(() => resumeProgram(profileId, programId, new Date()), 'продолжить программу')}
          />
        )}
        {state.kind === 'active' && (
          <Action
            label="Пауза"
            disabled={isSaving}
            onPress={() => run(() => pauseProgram(programId, new Date()), 'поставить на паузу')}
          />
        )}
        {state.kind === 'scheduled' && (
          <Action
            label="Отменить старт"
            disabled={isSaving}
            onPress={() => run(() => cancelScheduledStart(programId), 'отменить старт')}
          />
        )}
        {(state.kind === 'active' || state.kind === 'paused') && !confirmStop && (
          <Action label="Остановить" disabled={isSaving} onPress={() => setConfirmStop(true)} />
        )}
        <Action label="Изменить дни" disabled={isSaving} onPress={() => setIsDaysOpen(true)} />
      </View>

      {confirmStop && (
        <View style={styles.confirm}>
          <ThemedText type="small">
            Остановить программу? История тренировок сохранится, начать можно будет заново.
          </ThemedText>
          <View style={styles.actions}>
            <Action
              label="Да, остановить"
              primary
              disabled={isSaving}
              onPress={() => run(() => stopProgram(programId, new Date()), 'остановить программу')}
            />
            <Action label="Нет" disabled={isSaving} onPress={() => setConfirmStop(false)} />
          </View>
        </View>
      )}

      {actionError && (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {actionError}
        </ThemedText>
      )}

      {isStartOpen && (
        <StartProgramSheet
          visible
          onClose={() => setIsStartOpen(false)}
          profileId={profileId}
          plan={plan}
          onDone={() => {
            setIsStartOpen(false);
            onChanged();
          }}
        />
      )}
      {isDaysOpen && (
        <EditWeekdaysSheet
          visible
          onClose={() => setIsDaysOpen(false)}
          profileId={profileId}
          plan={plan}
          onDone={() => {
            setIsDaysOpen(false);
            onChanged();
          }}
        />
      )}
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.action, disabled && styles.disabled]}>
      <ThemedText type={primary ? 'linkPrimary' : 'default'}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three },
  action: { minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  confirm: { gap: Spacing.one },
});
