import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { type, useTheme } from '@/theme';

import { Text } from './Text';

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text variant="small" tone="muted" style={{ marginBottom: 6 }}>
      {children}
    </Text>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text variant="small" tone="alert" style={{ marginTop: 6 }}>
      {message}
    </Text>
  );
}

/** A ruled line to write on, like a form on paper. */
export function Field({
  label,
  error,
  numeric,
  style,
  ...rest
}: TextInputProps & { label: string; error?: string | null; numeric?: boolean }) {
  const t = useTheme();
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        placeholderTextColor={t.muted}
        selectionColor={t.accent}
        style={[
          numeric ? type.amount : type.body,
          numeric && { fontSize: 22, lineHeight: 28 },
          styles.input,
          { color: t.ink, borderBottomColor: error ? t.alert : t.divider },
          style,
        ]}
        {...rest}
      />
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { paddingVertical: 10, borderBottomWidth: 1 },
});
