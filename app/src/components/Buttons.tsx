import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text, type Tone } from './Text';

type BaseProps = Omit<PressableProps, 'children' | 'style'> & { label: string; style?: ViewStyle };

/** An inline action that reads as a link. */
export function TextButton({ label, tone = 'accent', style, ...rest }: BaseProps & { tone?: Tone }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={10}
      style={({ pressed }) => [{ opacity: pressed || rest.disabled ? 0.5 : 1 }, style]}
      {...rest}
    >
      <Text variant="bodyMedium" tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Full-width actions. `solid` is the one main action on a screen; `outline`
 * sits beside it; `alert` is for the irreversible-feeling one (cancelling).
 */
export function Button({
  label,
  kind = 'solid',
  style,
  ...rest
}: BaseProps & { kind?: 'solid' | 'outline' | 'alert' }) {
  const t = useTheme();
  const color = kind === 'alert' ? t.alert : t.accent;
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        kind === 'solid' ? { backgroundColor: color } : { borderColor: color, borderWidth: 1 },
        { opacity: pressed || rest.disabled ? 0.6 : 1 },
        style,
      ]}
      {...rest}
    >
      <Text variant="bodyMedium" style={{ color: kind === 'solid' ? t.onAccent : color }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A row of mutually exclusive options; the chosen one is underlined. */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={styles.choice} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            hitSlop={8}
            onPress={() => onChange(o.value)}
            style={[styles.option, { borderBottomColor: selected ? t.accent : 'transparent' }]}
          >
            <Text variant={selected ? 'bodyMedium' : 'body'} tone={selected ? 'ink' : 'muted'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  choice: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 8 },
  option: { paddingVertical: 6, borderBottomWidth: 2 },
});
