import type { TextStyle } from 'react-native';

// Numbers are set in Fraunces (a soft slab-ish serif) with tabular figures so
// columns of money line up. Everything else is Inter, sentence case.
export const fonts = {
  numeral: 'Fraunces_400Regular',
  numeralStrong: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyStrong: 'Inter_600SemiBold',
} as const;

const tabular: TextStyle = { fontVariant: ['tabular-nums', 'lining-nums'] };

export const type = {
  hero: { fontFamily: fonts.numeral, fontSize: 64, lineHeight: 72, letterSpacing: -1.5, ...tabular },
  heroSecondary: { fontFamily: fonts.numeral, fontSize: 36, lineHeight: 42, letterSpacing: -0.5, ...tabular },
  amount: { fontFamily: fonts.numeral, fontSize: 17, lineHeight: 22, ...tabular },
  amountLarge: { fontFamily: fonts.numeral, fontSize: 44, lineHeight: 50, letterSpacing: -1, ...tabular },
  title: { fontFamily: fonts.bodyStrong, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.bodyStrong, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
