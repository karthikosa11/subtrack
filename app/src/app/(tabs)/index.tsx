import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextButton } from '@/components/Buttons';
import { Divider, MarginNote, SectionHeading } from '@/components/Ledger';
import { SavedAmount } from '@/components/SavedAmount';
import { SubscriptionRow } from '@/components/SubscriptionRow';
import { Text } from '@/components/Text';
import { UsageCheckIn } from '@/components/UsageCheckIn';
import { useDecision, useNote, useSubscriptions, useSummary } from '@/hooks/queries';
import { money } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Subscription } from '@/lib/types';
import { gutter, space, useTheme } from '@/theme';

export default function Home() {
  const t = useTheme();
  const subs = useSubscriptions();
  const summary = useSummary();
  const decide = useDecision();

  const all = subs.data ?? [];
  const active = all.filter((s) => s.status === 'active');
  const cancelled = all.filter((s) => s.status === 'cancelled');
  const note = useNote(active.length > 0);

  const refresh = () => {
    subs.refetch();
    summary.refetch();
    if (active.length > 0) note.refetch();
  };
  const cancel = (sub: Subscription) => decide.mutate({ id: sub.id, decision: 'cancelled' });

  if (subs.isError || summary.isError) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: t.bg }]}>
        <Text style={{ textAlign: 'center' }}>{(subs.error ?? summary.error)?.message}</Text>
        <TextButton label="Try again" onPress={refresh} />
        <TextButton label="Sign out" tone="muted" onPress={() => supabase.auth.signOut()} />
      </SafeAreaView>
    );
  }

  if (subs.isPending || summary.isPending) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (all.length === 0) {
    return (
      <SafeAreaView style={[styles.empty, { backgroundColor: t.bg }]}>
        <Text variant="hero" tone="muted">
          {money(0)}
        </Text>
        <Text style={{ marginTop: space.lg, maxWidth: 320 }}>
          Nothing tracked yet. Add your first subscription to see where your money&apos;s going.
        </Text>
        <Button
          label="Add subscription"
          onPress={() => router.push('/subscription/new')}
          style={{ marginTop: space.lg, alignSelf: 'stretch' }}
        />
        <TextButton
          label="Sign out"
          tone="muted"
          onPress={() => supabase.auth.signOut()}
          style={{ marginTop: space.xl }}
        />
      </SafeAreaView>
    );
  }

  const s = summary.data;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={subs.isRefetching} onRefresh={refresh} tintColor={t.muted} />}
      >
        <View style={styles.hero}>
          <Text variant="small" tone="muted">
            Spending this month
          </Text>
          <Text variant="hero" accessibilityLabel={`${money(s.monthly_total)} this month`}>
            {money(s.monthly_total)}
          </Text>
          <Text variant="small" tone="muted">
            {money(s.annual_total)} a year across {s.active_count}{' '}
            {s.active_count === 1 ? 'subscription' : 'subscriptions'}
          </Text>
        </View>

        <View style={styles.saved}>
          <Text variant="small" tone="muted">
            Saved by cancelling
          </Text>
          <SavedAmount value={s.money_saved} />
          {s.money_saved === 0 && (
            <Text variant="small" tone="muted">
              Cancel something you don&apos;t use and it adds up here.
            </Text>
          )}
        </View>

        {active.length > 0 && (note.isPending || note.data?.body) && (
          <View style={styles.note}>
            <MarginNote>
              {note.isPending ? (
                <Text variant="small" tone="muted">
                  Looking over what you pay for…
                </Text>
              ) : (
                <View style={{ gap: space.sm }}>
                  <Text>{note.data?.body}</Text>
                  {note.data?.focus_subscription_id && note.data.focus_name && (
                    <TextButton
                      label={`Look at ${note.data.focus_name}`}
                      onPress={() => router.push(`/subscription/${note.data!.focus_subscription_id}`)}
                      style={{ alignSelf: 'flex-start' }}
                    />
                  )}
                </View>
              )}
            </MarginNote>
          </View>
        )}

        <UsageCheckIn subs={active} />

        <SectionHeading
          right={<TextButton label="Add subscription" onPress={() => router.push('/subscription/new')} />}
        >
          Renewing next
        </SectionHeading>
        <Divider />
        {active.length === 0 ? (
          <Text tone="muted" style={styles.inlineEmpty}>
            You&apos;re not paying for anything right now.
          </Text>
        ) : (
          active.map((sub) => (
            <View key={sub.id}>
              <SubscriptionRow sub={sub} onCancel={cancel} />
              <Divider />
            </View>
          ))
        )}
        {active.length > 0 && (
          <Text variant="caption" tone="muted" style={styles.hint}>
            Swipe a row left to mark it as cancelled.
          </Text>
        )}

        {cancelled.length > 0 && (
          <>
            <SectionHeading>Cancelled</SectionHeading>
            <Divider />
            {cancelled.map((sub) => (
              <View key={sub.id}>
                <SubscriptionRow sub={sub} onCancel={cancel} />
                <Divider />
              </View>
            ))}
          </>
        )}

        <TextButton
          label="Sign out"
          tone="muted"
          onPress={() => supabase.auth.signOut()}
          style={{ alignSelf: 'center', marginTop: space.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: gutter },
  empty: { flex: 1, justifyContent: 'center', padding: gutter },
  hero: { paddingHorizontal: gutter, paddingTop: space.xxl, paddingBottom: space.xl, gap: 2 },
  saved: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: 2 },
  note: { paddingHorizontal: gutter, paddingTop: space.md },
  inlineEmpty: { paddingHorizontal: gutter, paddingVertical: space.md },
  hint: { paddingHorizontal: gutter, paddingTop: space.sm },
});
