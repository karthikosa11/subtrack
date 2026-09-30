import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { localISODate } from '@/lib/format';
import {
  CATEGORIES,
  CYCLES,
  type BillingCycle,
  type Category,
  type Subscription,
  type SubscriptionInput,
} from '@/lib/types';
import { gutter, space, useTheme } from '@/theme';

import { Button, Choice } from './Buttons';
import { DateField } from './DateField';
import { Field, FieldError, FieldLabel } from './Field';

type Errors = Partial<Record<'name' | 'cost' | 'renewal', string>>;

function validate(name: string, cost: string, renewal: string): Errors {
  const errors: Errors = {};
  if (!name.trim()) errors.name = 'Enter a name.';
  const normalized = cost.replace(',', '.').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    errors.cost = 'Enter what you pay, like 9.99.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(renewal) || Number.isNaN(Date.parse(renewal))) {
    errors.renewal = 'Pick the date it next renews.';
  }
  return errors;
}

export function SubscriptionForm({
  initial,
  submitLabel,
  pending,
  serverError,
  onSubmit,
}: {
  initial?: Subscription;
  submitLabel: string;
  pending: boolean;
  serverError?: string | null;
  onSubmit: (input: SubscriptionInput) => void;
}) {
  const t = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [cost, setCost] = useState(initial ? initial.cost.toFixed(2) : '');
  const [cycle, setCycle] = useState<BillingCycle>(initial?.billing_cycle ?? 'monthly');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'streaming');
  const [renewal, setRenewal] = useState(initial?.next_renewal ?? localISODate());
  const [errors, setErrors] = useState<Errors>({});

  const submit = () => {
    const found = validate(name, cost, renewal);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({
      name: name.trim(),
      cost: Number(cost.replace(',', '.')),
      billing_cycle: cycle,
      category,
      renewal_date: renewal,
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Netflix, Spotify, gym…"
          autoCapitalize="words"
          returnKeyType="next"
          error={errors.name}
        />
        <Field
          label="What you pay"
          value={cost}
          onChangeText={setCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
          numeric
          error={errors.cost}
        />
        <View>
          <FieldLabel>Billed</FieldLabel>
          <Choice options={CYCLES} value={cycle} onChange={setCycle} />
        </View>
        <DateField label="Next renewal" value={renewal} onChange={setRenewal} error={errors.renewal} />
        <View>
          <FieldLabel>Category</FieldLabel>
          <Choice options={CATEGORIES} value={category} onChange={setCategory} />
        </View>
        <View style={{ gap: space.sm }}>
          <FieldError message={serverError} />
          <Button label={pending ? 'Saving…' : submitLabel} onPress={submit} disabled={pending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: gutter, paddingBottom: space.xxl, gap: space.lg + 4 },
});
