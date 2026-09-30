import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { money, RENEWAL_WARNING_DAYS, renewsIn, shortDate } from '@/lib/format';
import { label, type Subscription } from '@/lib/types';
import { useUI } from '@/store/ui';
import { gutter, useTheme } from '@/theme';

import { Dot } from './Ledger';
import { Text } from './Text';

function RowBody({ sub }: { sub: Subscription }) {
  const t = useTheme();
  const cancelled = sub.status === 'cancelled';
  const soon = !cancelled && sub.days_until_renewal <= RENEWAL_WARNING_DAYS;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens details"
      onPress={() => router.push(`/subscription/${sub.id}`)}
      style={({ pressed }) => [styles.row, { backgroundColor: t.bg, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.left}>
        <Text variant="bodyMedium" tone={cancelled ? 'muted' : 'ink'} numberOfLines={1}>
          {sub.name}
        </Text>
        <Text variant="caption" tone="muted">
          {label.category(sub.category)} · {label.cycle(sub.billing_cycle)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text variant="amount" tone={cancelled ? 'muted' : 'ink'}>
          {money(sub.cost, sub.currency)}
        </Text>
        {cancelled ? (
          <Text variant="caption" tone="muted">
            Saved {money(sub.saved, sub.currency)}
          </Text>
        ) : soon ? (
          <View style={styles.soon}>
            <Dot />
            <Text variant="caption" tone="alert">
              {renewsIn(sub.days_until_renewal)}
            </Text>
          </View>
        ) : (
          <Text variant="caption" tone="muted">
            Renews {shortDate(sub.next_renewal)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** A statement line. Active rows swipe left to reveal "Mark as cancelled". */
export function SubscriptionRow({ sub, onCancel }: { sub: Subscription; onCancel: (sub: Subscription) => void }) {
  const t = useTheme();
  const ref = useRef<SwipeableMethods>(null);
  const openRowId = useUI((s) => s.openRowId);
  const setOpenRow = useUI((s) => s.setOpenRow);

  useEffect(() => {
    if (openRowId !== sub.id) ref.current?.close();
  }, [openRowId, sub.id]);

  if (sub.status === 'cancelled') return <RowBody sub={sub} />;

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.5}
      rightThreshold={48}
      overshootRight={false}
      onSwipeableWillOpen={() => setOpenRow(sub.id)}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            ref.current?.close();
            onCancel(sub);
          }}
          style={[styles.action, { backgroundColor: t.alert }]}
        >
          <Text variant="bodyMedium" style={{ color: t.onAccent }}>
            Mark as cancelled
          </Text>
        </Pressable>
      )}
    >
      <RowBody sub={sub} />
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: gutter,
    paddingVertical: 14,
    gap: 16,
  },
  left: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  action: { justifyContent: 'center', paddingHorizontal: gutter },
});
