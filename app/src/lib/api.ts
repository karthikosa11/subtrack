import { localISODate } from './format';
import { supabase } from './supabase';
import type {
  CategoryStat,
  Decision,
  Insight,
  Note,
  Rating,
  Subscription,
  SubscriptionInput,
  Summary,
} from './types';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Local-Date': localISODate(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Can't reach SubTrack right now. Check your connection.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === 'string' ? body.detail : 'Something went wrong. Try again.';
    throw new ApiError(res.status, detail);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  subscriptions: () => request<Subscription[]>('/subscriptions'),
  subscription: (id: string) => request<Subscription>(`/subscriptions/${id}`),
  create: (input: SubscriptionInput) => request<Subscription>('/subscriptions', post(input)),
  update: (id: string, input: Partial<SubscriptionInput>) =>
    request<Subscription>(`/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/subscriptions/${id}`, { method: 'DELETE' }),
  logUsage: (id: string, rating: Rating) => request<Subscription>(`/subscriptions/${id}/usage`, post({ rating })),
  decide: (id: string, decision: Decision) =>
    request<Subscription>(`/subscriptions/${id}/decision`, post({ decision })),
  insight: (id: string) => request<Insight>(`/subscriptions/${id}/insight`),
  summary: () => request<Summary>('/summary'),
  note: () => request<Note>('/summary/note'),
  categories: () => request<CategoryStat[]>('/stats/categories'),
};
