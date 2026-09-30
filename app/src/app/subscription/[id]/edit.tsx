import { router, useLocalSearchParams } from 'expo-router';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import { useSubscription, useUpdateSubscription } from '@/hooks/queries';

export default function EditSubscription() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useSubscription(id);
  const update = useUpdateSubscription(id);

  if (!sub.data) return null;

  return (
    <SubscriptionForm
      initial={sub.data}
      submitLabel="Save changes"
      pending={update.isPending}
      serverError={update.error?.message}
      onSubmit={(input) => update.mutate(input, { onSuccess: () => router.back() })}
    />
  );
}
