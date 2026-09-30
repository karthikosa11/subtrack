import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextButton } from '@/components/Buttons';
import { CategoryChart } from '@/components/CategoryChart';
import { Divider } from '@/components/Ledger';
import { Text } from '@/components/Text';
import { useCategoryStats } from '@/hooks/queries';
import { money } from '@/lib/format';
import { label } from '@/lib/types';
import { gutter, space, useTheme } from '@/theme';

export default function Breakdown() {
  const t = useTheme();
  const stats = useCategoryStats();
  const rows = stats.data ?? [];
  const total = rows.reduce((sum, r) => sum + r.monthly_total, 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={styles.header}>
          <Text variant="title">Where it goes</Text>
          <Text variant="small" tone="muted">
            Monthly cost by category. Yearly and weekly plans are converted to a monthly amount.
          </Text>
        </View>

        {stats.isError ? (
          <View style={styles.padded}>
            <Text>{stats.error.message}</Text>
            <TextButton label="Try again" onPress={() => stats.refetch()} style={{ marginTop: space.sm }} />
          </View>
        ) : stats.isPending ? null : rows.length === 0 ? (
          <Text style={styles.padded}>
            Nothing to break down yet. Add a subscription and it&apos;ll show up here.
          </Text>
        ) : (
          <>
            {Platform.OS !== 'web' && (
              <View style={{ paddingHorizontal: gutter - 4, paddingBottom: space.lg }}>
                <CategoryChart stats={rows} />
              </View>
            )}

            <Divider />
            {rows.map((r) => (
              <View key={r.category}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{label.category(r.category)}</Text>
                    <Text variant="caption" tone="muted">
                      {r.count} {r.count === 1 ? 'subscription' : 'subscriptions'} ·{' '}
                      {Math.round((r.monthly_total / total) * 100)}% of the total
                    </Text>
                  </View>
                  <Text variant="amount">{money(r.monthly_total)}</Text>
                </View>
                <Divider />
              </View>
            ))}
            <View style={styles.row}>
              <Text variant="heading">Total a month</Text>
              <Text variant="amount" style={{ fontSize: 20 }}>
                {money(total)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.lg, gap: 4 },
  padded: { paddingHorizontal: gutter },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: 14,
    gap: 16,
  },
});
