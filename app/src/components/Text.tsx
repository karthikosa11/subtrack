import { Text as RNText, type TextProps } from 'react-native';

import { type, useTheme, type Tokens, type TypeVariant } from '@/theme';

export type Tone = Exclude<keyof Tokens, 'bg' | 'divider'>;

type Props = TextProps & { variant?: TypeVariant; tone?: Tone };

export function Text({ variant = 'body', tone = 'ink', style, ...rest }: Props) {
  const t = useTheme();
  return <RNText {...rest} style={[type[variant], { color: t[tone] }, style]} />;
}
