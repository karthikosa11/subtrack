// Small building blocks for the statement-style layout: hairlines instead of
// cards, a left rule instead of a box.
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { gutter, space, useTheme } from '@/theme';

import { Text } from './Text';

export function Divider({ inset = 0, style }: { inset?: number; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: t.divider, marginLeft: inset }, style]}
    />
  );
}

export function Dot() {
  const t = useTheme();
  return <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: t.alert }} />;
}

export function MarginNote({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginLeft: space.sm, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: t.accent }}>
      {children}
    </View>
  );
}

export function SectionHeading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionHeading}>
      <Text variant="heading">{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
});
