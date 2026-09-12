import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ContextAnswer, OnboardingAnswers } from '@/lib/onboarding-types';

const PRESET_CONTEXTS: { name: string; equipmentOptions: string[] }[] = [
  {
    name: 'Дом',
    equipmentOptions: [
      'Коврик',
      'Гантели',
      'Резинки',
      'Турник',
      'TRX',
      'Скакалка',
      'Скамья',
      'Гиря',
      'Ничего из этого',
    ],
  },
  {
    name: 'Зал',
    equipmentOptions: ['Тренажёры', 'Свободные веса', 'Кардио-зона'],
  },
  {
    name: 'Дорога / командировка',
    equipmentOptions: ['Только вес тела', 'Резинка с собой'],
  },
];

type Props = {
  answers: OnboardingAnswers;
  onChange: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
};

export function ContextsField({ answers, onChange }: Props) {
  const theme = useTheme();
  const [customName, setCustomName] = useState('');

  const contexts = answers.contexts;

  function findContext(name: string) {
    return contexts.find((c) => c.name === name);
  }

  function upsertContext(next: ContextAnswer) {
    const exists = contexts.some((c) => c.name === next.name);
    onChange(
      'contexts',
      exists ? contexts.map((c) => (c.name === next.name ? next : c)) : [...contexts, next]
    );
  }

  function removeContext(name: string) {
    onChange('contexts', contexts.filter((c) => c.name !== name));
  }

  function togglePreset(name: string) {
    const existing = findContext(name);
    if (existing) {
      removeContext(name);
    } else {
      upsertContext({ name, equipment: [], typicalFrequency: '' });
    }
  }

  function toggleEquipment(contextName: string, equipment: string) {
    const existing = findContext(contextName);
    if (!existing) return;
    const has = existing.equipment.includes(equipment);
    upsertContext({
      ...existing,
      equipment: has
        ? existing.equipment.filter((e) => e !== equipment)
        : [...existing.equipment, equipment],
    });
  }

  function setFrequency(contextName: string, typicalFrequency: string) {
    const existing = findContext(contextName);
    if (!existing) return;
    upsertContext({ ...existing, typicalFrequency });
  }

  const customContexts = contexts.filter(
    (c) => !PRESET_CONTEXTS.some((p) => p.name === c.name)
  );

  return (
    <View style={styles.container}>
      {PRESET_CONTEXTS.map((preset) => {
        const active = findContext(preset.name);
        return (
          <ThemedView key={preset.name} type="backgroundElement" style={styles.card}>
            <Chip label={preset.name} selected={!!active} onPress={() => togglePreset(preset.name)} />

            {active && (
              <View style={styles.cardBody}>
                <ThemedText type="small" themeColor="textSecondary">
                  Что доступно
                </ThemedText>
                <View style={styles.chips}>
                  {preset.equipmentOptions.map((eq) => (
                    <Chip
                      key={eq}
                      label={eq}
                      selected={active.equipment.includes(eq)}
                      onPress={() => toggleEquipment(preset.name, eq)}
                    />
                  ))}
                </View>
                <TextInput
                  value={active.typicalFrequency}
                  onChangeText={(text) => setFrequency(preset.name, text)}
                  placeholder="Как часто тут бываешь? Например: почти всегда / раз в месяц в командировках"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={`Как часто бываешь в контексте «${preset.name}»`}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
              </View>
            )}
          </ThemedView>
        );
      })}

      {customContexts.map((c) => (
        <ThemedView key={c.name} type="backgroundElement" style={styles.card}>
          <View style={styles.customHeader}>
            <ThemedText type="smallBold">{c.name}</ThemedText>
            <Chip label="Убрать" selected={false} onPress={() => removeContext(c.name)} />
          </View>
          <TextInput
            value={c.equipment.join(', ')}
            onChangeText={(text) =>
              upsertContext({
                ...c,
                equipment: text
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Что там доступно (через запятую)"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={`Доступное оборудование в контексте «${c.name}»`}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          />
          <TextInput
            value={c.typicalFrequency}
            onChangeText={(text) => setFrequency(c.name, text)}
            placeholder="Как часто тут бываешь?"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={`Как часто бываешь в контексте «${c.name}»`}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          />
        </ThemedView>
      ))}

      <View style={styles.addCustom}>
        <TextInput
          value={customName}
          onChangeText={setCustomName}
          placeholder="Свой вариант (например: улица/парк)"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Название своего варианта места тренировки"
          style={[styles.input, styles.addInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        <Chip
          label="+ Добавить"
          selected={false}
          onPress={() => {
            const name = customName.trim();
            if (!name || findContext(name)) return;
            upsertContext({ name, equipment: [], typicalFrequency: '' });
            setCustomName('');
          }}
        />
      </View>

      <View style={styles.consent}>
        <ThemedText type="smallBold">
          Разрешаешь при «сегодня я в [контекст]» сразу подбирать тренировку под него без
          повторного опроса?
        </ThemedText>
        <View style={styles.chips}>
          <Chip
            label="Да"
            selected={answers.contextSwitchConsent === true}
            onPress={() => onChange('contextSwitchConsent', true)}
          />
          <Chip
            label="Нет, каждый раз спрашивай подробности"
            selected={answers.contextSwitchConsent === false}
            onPress={() => onChange('contextSwitchConsent', false)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardBody: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addInput: {
    flex: 1,
  },
  consent: {
    gap: Spacing.two,
  },
});
