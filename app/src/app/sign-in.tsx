import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { Text } from '@/components/Text';
import { googleEnabled, signInWithGoogle } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fonts, gutter, space, useTheme } from '@/theme';

type Mode = 'sign-in' | 'sign-up';

export default function SignIn() {
  const t = useTheme();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email.includes('@')) return setError('Enter your email address.');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');

    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(error.message);
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setError(error.message);
        else if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Try again.');
    }
  };

  const signingIn = mode === 'sign-in';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.sm }}>
            <Text style={{ fontFamily: fonts.numeralStrong, fontSize: 40, lineHeight: 46 }}>SubTrack</Text>
            <Text tone="muted">Know what you&apos;re paying for before it renews.</Text>
          </View>

          <View style={{ gap: space.lg }}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={signingIn ? 'current-password' : 'new-password'}
              textContentType={signingIn ? 'password' : 'newPassword'}
              onSubmitEditing={submit}
            />
            {error && <Text tone="alert">{error}</Text>}
            {notice && <Text tone="accent">{notice}</Text>}
            <Button
              label={busy ? 'One moment…' : signingIn ? 'Sign in' : 'Create account'}
              onPress={submit}
              disabled={busy}
            />
            {googleEnabled && <Button label="Continue with Google" kind="outline" onPress={google} />}
          </View>

          <TextButton
            label={signingIn ? 'New here? Create an account' : 'Already have an account? Sign in'}
            onPress={() => {
              setMode(signingIn ? 'sign-up' : 'sign-in');
              setError(null);
              setNotice(null);
            }}
            style={{ alignSelf: 'flex-start' }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: gutter, gap: space.xl },
});
