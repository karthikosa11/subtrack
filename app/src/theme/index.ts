import { useColorScheme } from 'react-native';

import { dark, light, type Tokens } from './tokens';

export { fonts, type, type TypeVariant } from './typography';
export type { Tokens };

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 } as const;
export const gutter = 20;

export function useTheme(): Tokens {
  return useColorScheme() === 'dark' ? dark : light;
}
