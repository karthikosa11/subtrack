import { StyleSheet, View } from 'react-native';

import { useLogUsage } from '@/hooks/queries';
import { RATINGS, type Subscription } from '@/lib/types';
import { gutter, space } from '@/theme';

import { TextButton } from './Buttons';
import { Divider, SectionHeading } from './Ledger';
import { Text } from './Text';

/**
 * A quick daily check-in: one tap per subscription. Once rated today, a row
 * drops off the list. These ratings are what the AI advice is based on.
 */
export function UsageCheckIn({ subs }: { subs: Subscription[] }) {
  const logUsage = useLogUsage();
  const pending = subs.filter((s) => s.status === 'active' && !s.rated_today);
  if (pending.length === 0) return null;

  return (
    <View>
      <SectionHeading>How much did you use these lately?</SectionHeading>
      <Text variant="small" tone="muted" style={{ paddingHorizontal: gutter, marginBottom: space.sm }}>
        Your answers decide which ones we tell you to drop.
      </Text>
      {pending.map((sub, i) => (
        <View key={sub.id}>
          {i > 0 && <Divider inset={gutter} />}
          <View style={styles.row}>
            <Text variant="body" numberOfLines={1} style={styles.name}>
              {sub.name}
            </Text>
            <View style={styles.options}>
              {RATINGS.map((r) => (
                <TextButton
                  key={r.value}
                  label={r.label}
                  accessibilityLabel={`${sub.name}: ${r.label}`}
                  disabled={logUsage.isPending}
                  onPress={() => logUsage.mutate({ id: sub.id, rating: r.value })}
                />
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: gutter, paddingVertical: 12, gap: 6 },
  name: {},
  options: { flexDirection: 'row', gap: 24 },
});
