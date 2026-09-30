import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Choice, TextButton } from '@/components/Buttons';
import { Divider, Dot, MarginNote, SectionHeading } from '@/components/Ledger';
import { Text } from '@/components/Text';
import {
  useDecision,
  useDeleteSubscription,
  useInsight,
  useLogUsage,
  useSubscription,
} from '@/hooks/queries';
import { longDate, money, RENEWAL_WARNING_DAYS, renewsIn, shortDate } from '@/lib/format';
import { label, RATINGS, type Insight, type Subscription } from '@/lib/types';
import { gutter, space, useTheme } from '@/theme';

const VERDICT = {
  cancel: { text: 'Worth cancelling', tone: 'alert' },
  downgrade: { text: 'Worth downgrading', tone: 'ink' },
  keep: { text: 'Worth keeping', tone: 'accent' },
} as const;

function confirmDelete(sub: Subscription, onConfirm: () => void) {
  const message = 'This removes it and its usage history. Any money it saved stops counting.';
  if (Platform.OS === 'web') {
    if (window.confirm(`Delete ${sub.name}? ${message}`)) onConfirm();
    return;
  }
  Alert.alert(`Delete ${sub.name}?`, message, [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

function Advice({ insight, loading }: { insight?: Insight; loading: boolean }) {
  if (loading) {
    return (
      <Text variant="small" tone="muted">
        Weighing what you pay against how much you use it…
      </Text>
    );
  }
  if (!insight?.body) {
    return <Text tone="muted">Advice isn&apos;t available right now. Try again later.</Text>;
  }
  const verdict = insight.recommendation ? VERDICT[insight.recommendation] : null;
  return (
    <View style={{ gap: space.xs }}>
      {verdict && (
        <Text variant="heading" tone={verdict.tone}>
          {verdict.text}
        </Text>
      )}
      <Text>{insight.body}</Text>
      {insight.stale && (
        <Text variant="caption" tone="muted">
          Couldn&apos;t update this just now, so it doesn&apos;t count your latest rating yet.
        </Text>
      )}
    </View>
  );
}

export default function SubscriptionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const query = useSubscription(id);
  const sub = query.data;
  const active = sub?.status === 'active';
  const insight = useInsight(id, active);
  const logUsage = useLogUsage();
  const decide = useDecision();
  const remove = useDeleteSubscription();

  if (!sub) {
    return (
      <View style={[styles.centered, { backgroundColor: t.bg }]}>
        {query.isError && <Text>{query.error.message}</Text>}
      </View>
    );
  }

  const todaysRating = sub.rated_today ? sub.ratings[0].rating : null;
  const soon = active && sub.days_until_renewal <= RENEWAL_WARNING_DAYS;
  const busy = decide.isPending || remove.isPending;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: space.xxl }}>
      <View style={styles.header}>
        <Text variant="title">{sub.name}</Text>
        <Text variant="small" tone="muted">
          {label.category(sub.category)} · billed {label.cycle(sub.billing_cycle).toLowerCase()}
        </Text>
        <View style={styles.amountRow}>
          <Text variant="amountLarge" tone={active ? 'ink' : 'muted'}>
            {money(sub.cost, sub.currency)}
          </Text>
          <Text tone="muted">a {label.per(sub.billing_cycle)}</Text>
        </View>
        {sub.billing_cycle !== 'monthly' && (
          <Text variant="small" tone="muted">
            About {money(sub.monthly_cost, sub.currency)} a month
          </Text>
        )}
        {active ? (
          <View style={styles.renewal}>
            {soon && <Dot />}
            <Text variant="small" tone={soon ? 'alert' : 'muted'}>
              {soon
                ? `${renewsIn(sub.days_until_renewal)}, on ${shortDate(sub.next_renewal)}`
                : `Renews ${longDate(sub.next_renewal)}`}
            </Text>
          </View>
        ) : (
          <Text variant="small" tone="muted" style={{ marginTop: space.sm }}>
            Cancelled on {longDate(sub.cancelled_on!)}.{' '}
            <Text variant="small" tone="ink">
              Saved {money(sub.saved, sub.currency)} so far.
            </Text>
          </Text>
        )}
      </View>

      {active && (
        <>
          <SectionHeading>How often do you use it?</SectionHeading>
          <View style={styles.padded}>
            <Choice
              options={RATINGS}
              value={todaysRating}
              disabled={logUsage.isPending}
              onChange={(rating) => logUsage.mutate({ id: sub.id, rating })}
            />
            {sub.ratings.length > 0 && (
              <View style={{ marginTop: space.md }}>
                {sub.ratings.map((r) => (
                  <View key={r.on} style={styles.historyRow}>
                    <Text variant="small" tone="muted">
                      {shortDate(r.on)}
                    </Text>
                    <Text variant="small">{label.rating(r.rating)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <SectionHeading>Should you keep paying for it?</SectionHeading>
          <View style={styles.padded}>
            <MarginNote>
              <Advice insight={insight.data} loading={insight.isPending || insight.isFetching} />
            </MarginNote>
          </View>
        </>
      )}

      <View style={[styles.padded, styles.actions]}>
        {active ? (
          <>
            <Button
              label="Mark as cancelled"
              kind="alert"
              disabled={busy}
              onPress={() => decide.mutate({ id: sub.id, decision: 'cancelled' })}
            />
            <Button
              label={sub.decision === 'keeping' ? "You're keeping this" : 'Keeping it'}
              kind="outline"
              disabled={busy || sub.decision === 'keeping'}
              onPress={() => decide.mutate({ id: sub.id, decision: 'keeping' })}
            />
          </>
        ) : (
          <Button
            label="Start tracking again"
            kind="outline"
            disabled={busy}
            onPress={() => decide.mutate({ id: sub.id, decision: 'keeping' })}
          />
        )}
        {decide.error && <Text tone="alert">{decide.error.message}</Text>}
      </View>

      <Divider style={{ marginTop: space.xl }} />
      <View style={[styles.padded, styles.footer]}>
        <TextButton label="Edit details" onPress={() => router.push(`/subscription/${sub.id}/edit`)} />
        <TextButton
          label="Delete"
          tone="alert"
          disabled={busy}
          onPress={() =>
            confirmDelete(sub, () => remove.mutate(sub.id, { onSuccess: () => router.back() }))
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: gutter },
  header: { paddingHorizontal: gutter, paddingTop: space.md, gap: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg },
  renewal: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm },
  padded: { paddingHorizontal: gutter },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  actions: { gap: space.md, marginTop: space.xl },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.lg },
});
