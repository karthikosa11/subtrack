import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { money, parseISODate, shortDate } from './format';
import type { Subscription } from './types';

const CHANNEL = 'renewals';
const REMINDER_DAYS_BEFORE = 3;
const REMINDER_HOUR = 9;
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Ask once, the first time the user adds something worth reminding them about. */
export async function ensureReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Renewal reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export function reminderDate(nextRenewal: string): Date {
  const d = parseISODate(nextRenewal);
  d.setDate(d.getDate() - REMINDER_DAYS_BEFORE);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d;
}

/**
 * Make scheduled reminders match the server: one per active subscription,
 * 3 days before its next renewal at 9am. Cheap to call repeatedly.
 */
export async function syncRenewalReminders(subs: Subscription[]): Promise<void> {
  if (!supported) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === 'renewal')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const now = Date.now();
  await Promise.all(
    subs
      .filter((s) => s.status === 'active')
      .map((s) => ({ s, at: reminderDate(s.next_renewal) }))
      .filter(({ at }) => at.getTime() > now)
      .map(({ s, at }) =>
        Notifications.scheduleNotificationAsync({
          identifier: `renewal-${s.id}`,
          content: {
            title: `${s.name} renews in ${REMINDER_DAYS_BEFORE} days`,
            body: `${money(s.cost, s.currency)} will be charged on ${shortDate(s.next_renewal)}.`,
            data: { kind: 'renewal', subscriptionId: s.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: at,
            channelId: CHANNEL,
          },
        }),
      ),
  );
}
