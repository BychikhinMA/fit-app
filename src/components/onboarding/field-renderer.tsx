import { StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/onboarding/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FieldConfig } from '@/lib/onboarding-steps';
import type { OnboardingAnswers } from '@/lib/onboarding-types';

type Props = {
  field: FieldConfig;
  answers: OnboardingAnswers;
  onChange: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
};

export function FieldRenderer({ field, answers, onChange }: Props) {
  const theme = useTheme();
  const value = answers[field.key];

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">
        {field.label}
        {field.type !== 'boolean' && 'optional' in field && !field.optional ? ' *' : ''}
      </ThemedText>

      {field.type === 'text' && (
        <TextInput
          value={(value as string) ?? ''}
          onChangeText={(text) => onChange(field.key, text as never)}
          placeholder={field.placeholder}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={field.label}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
      )}

      {field.type === 'textarea' && (
        <TextInput
          value={(value as string) ?? ''}
          onChangeText={(text) => onChange(field.key, text as never)}
          placeholder={field.placeholder}
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={3}
          accessibilityLabel={field.label}
          style={[
            styles.input,
            styles.textarea,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
        />
      )}

      {field.type === 'number' && (
        <TextInput
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={(text) => {
            const numeric = text.replace(/[^0-9.]/g, '');
            onChange(field.key, (numeric === '' ? null : Number(numeric)) as never);
          }}
          placeholder={field.placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          accessibilityLabel={field.label}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
      )}

      {field.type === 'single-select' && (
        <View style={styles.chips}>
          {field.options.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={value === option.value}
              onPress={() => onChange(field.key, option.value as never)}
            />
          ))}
        </View>
      )}

      {field.type === 'multi-select' && (
        <View style={styles.chips}>
          {field.options.map((option) => {
            const current = (value as string[] | null) ?? [];
            const selected = current.includes(option.value);
            return (
              <Chip
                key={option.value}
                label={option.label}
                selected={selected}
                onPress={() =>
                  onChange(
                    field.key,
                    (selected
                      ? current.filter((v) => v !== option.value)
                      : [...current, option.value]) as never
                  )
                }
              />
            );
          })}
        </View>
      )}

      {field.type === 'boolean' && (
        <View style={styles.chips}>
          <Chip label="Да" selected={value === true} onPress={() => onChange(field.key, true as never)} />
          <Chip label="Нет" selected={value === false} onPress={() => onChange(field.key, false as never)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textarea: {
    textAlignVertical: 'top',
    minHeight: 72,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
