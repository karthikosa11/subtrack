import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { localISODate, longDate, parseISODate } from '@/lib/format';
import { useTheme } from '@/theme';

import { Field, FieldError, FieldLabel } from './Field';
import { Text } from './Text';

type Props = { label: string; value: string; onChange: (iso: string) => void; error?: string | null };

export function DateField({ label, value, onChange, error }: Props) {
  const t = useTheme();
  const scheme = useColorScheme();

  if (Platform.OS === 'web') {
    return (
      <Field label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" error={error} />
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <View>
        <FieldLabel>{label}</FieldLabel>
        <View style={styles.iosRow}>
          <DateTimePicker
            value={parseISODate(value)}
            mode="date"
            display="compact"
            accentColor={t.accent}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            onValueChange={(_e, d) => onChange(localISODate(d))}
          />
        </View>
        <FieldError message={error} />
      </View>
    );
  }

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens a calendar"
        onPress={() =>
          DateTimePickerAndroid.open({
            value: parseISODate(value),
            mode: 'date',
            onValueChange: (_e, d) => onChange(localISODate(d)),
          })
        }
        style={[styles.androidField, { borderBottomColor: error ? t.alert : t.divider }]}
      >
        <Text>{longDate(value)}</Text>
      </Pressable>
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  iosRow: { alignItems: 'flex-start', paddingVertical: 4 },
  androidField: { paddingVertical: 10, borderBottomWidth: 1 },
});
