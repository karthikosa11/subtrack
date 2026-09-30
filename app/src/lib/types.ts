export type BillingCycle = 'weekly' | 'monthly' | 'yearly';
export type Category = 'streaming' | 'software' | 'fitness' | 'other';
export type Rating = 'rarely' | 'sometimes' | 'often';
export type Decision = 'keeping' | 'cancelled';
export type Recommendation = 'keep' | 'downgrade' | 'cancel';

export type Subscription = {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billing_cycle: BillingCycle;
  category: Category;
  monthly_cost: number;
  next_renewal: string; // YYYY-MM-DD
  days_until_renewal: number;
  status: 'active' | 'cancelled';
  decision: Decision | null;
  cancelled_on: string | null;
  saved: number;
  ratings: { rating: Rating; on: string }[]; // newest first
  rated_today: boolean;
};

export type SubscriptionInput = {
  name: string;
  cost: number;
  billing_cycle: BillingCycle;
  category: Category;
  renewal_date: string;
};

export type Summary = {
  monthly_total: number;
  annual_total: number;
  money_saved: number;
  active_count: number;
};

export type Note = {
  body: string | null;
  focus_subscription_id: string | null;
  focus_name: string | null;
  stale: boolean;
};

export type Insight = {
  recommendation: Recommendation | null;
  body: string | null;
  stale: boolean;
};

export type CategoryStat = {
  category: Category;
  monthly_total: number;
  count: number;
};

export const CYCLES: { value: BillingCycle; label: string; per: string }[] = [
  { value: 'weekly', label: 'Weekly', per: 'week' },
  { value: 'monthly', label: 'Monthly', per: 'month' },
  { value: 'yearly', label: 'Yearly', per: 'year' },
];

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'streaming', label: 'Streaming' },
  { value: 'software', label: 'Software' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'other', label: 'Other' },
];

export const RATINGS: { value: Rating; label: string }[] = [
  { value: 'rarely', label: 'Rarely' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'often', label: 'Often' },
];

export const label = {
  cycle: (c: BillingCycle) => CYCLES.find((x) => x.value === c)!.label,
  per: (c: BillingCycle) => CYCLES.find((x) => x.value === c)!.per,
  category: (c: Category) => CATEGORIES.find((x) => x.value === c)!.label,
  rating: (r: Rating) => RATINGS.find((x) => x.value === r)!.label,
};
