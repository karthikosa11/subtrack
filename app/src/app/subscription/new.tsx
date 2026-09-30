import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import { keys, useCreateSubscription } from '@/hooks/queries';
import { ensureReminderPermission } from '@/lib/notifications';

export default function NewSubscription() {
  const qc = useQueryClient();
  const create = useCreateSubscription();

  return (
    <SubscriptionForm
      submitLabel="Add subscription"
      pending={create.isPending}
      serverError={create.error?.message}
      onSubmit={(input) =>
        create.mutate(input, {
          onSuccess: async () => {
            router.back();
            // Ask for notification permission at the moment it's obviously useful,
            // then refetch so reminders get scheduled for everything.
            if (await ensureReminderPermission()) {
              qc.invalidateQueries({ queryKey: keys.subscriptions });
            }
          },
        })
      }
    />
  );
}
