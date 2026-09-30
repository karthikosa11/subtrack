import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/lib/api';
import { syncRenewalReminders } from '@/lib/notifications';
import type { Decision, Rating, Subscription, SubscriptionInput } from '@/lib/types';

export const keys = {
  subscriptions: ['subscriptions'] as const,
  subscription: (id: string) => ['subscriptions', id] as const,
  insight: (id: string) => ['insight', id] as const,
  summary: ['summary'] as const,
  note: ['note'] as const,
  categories: ['categories'] as const,
};

export function useSubscriptions() {
  const query = useQuery({ queryKey: keys.subscriptions, queryFn: api.subscriptions });

  // Reminders always mirror what the server says is active and when it renews.
  const data = query.data;
  useEffect(() => {
    if (data) syncRenewalReminders(data).catch(() => {});
  }, [data]);

  return query;
}

export function useSubscription(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.subscription(id),
    queryFn: () => api.subscription(id),
    initialData: () => qc.getQueryData<Subscription[]>(keys.subscriptions)?.find((s) => s.id === id),
  });
}

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: api.summary });

// The note is cached on the server and only regenerates when the inputs change,
// so a long client staleTime just avoids needless round trips.
export const useNote = (enabled: boolean) =>
  useQuery({ queryKey: keys.note, queryFn: api.note, enabled, staleTime: 5 * 60_000 });

export const useInsight = (id: string, enabled: boolean) =>
  useQuery({ queryKey: keys.insight(id), queryFn: () => api.insight(id), enabled, staleTime: Infinity });

export const useCategoryStats = () => useQuery({ queryKey: keys.categories, queryFn: api.categories });

function afterChange(qc: QueryClient, sub?: Subscription) {
  if (sub) qc.setQueryData(keys.subscription(sub.id), sub);
  qc.invalidateQueries({ queryKey: keys.subscriptions });
  qc.invalidateQueries({ queryKey: keys.summary });
  qc.invalidateQueries({ queryKey: keys.note });
  qc.invalidateQueries({ queryKey: keys.categories });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.create, onSuccess: (sub) => afterChange(qc, sub) });
}

export function useUpdateSubscription(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SubscriptionInput>) => api.update(id, input),
    onSuccess: (sub) => {
      afterChange(qc, sub);
      qc.invalidateQueries({ queryKey: keys.insight(id) });
    },
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.remove,
    onSuccess: (_void, id) => {
      qc.removeQueries({ queryKey: keys.subscription(id) });
      afterChange(qc);
    },
  });
}

export function useLogUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: Rating }) => api.logUsage(id, rating),
    onSuccess: (sub) => {
      afterChange(qc, sub);
      qc.invalidateQueries({ queryKey: keys.insight(sub.id) });
    },
  });
}

export function useDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: Decision }) => api.decide(id, decision),
    onSuccess: (sub) => afterChange(qc, sub),
  });
}
