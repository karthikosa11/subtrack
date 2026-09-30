// Two token sets with the same shape. Contrast against `bg` (WCAG):
//   light: ink 11.9, muted 5.0, accent 6.3, alert 5.3, saved 3.6 (hero-size only, where 3:1 applies)
//   dark:  ink 13.6, muted 6.5, accent 5.4, alert 4.6, saved 6.7
export type Tokens = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
  alert: string;
  saved: string;
  divider: string;
};

export const light: Tokens = {
  bg: '#EDEAE3',
  ink: '#2B2A28',
  muted: '#67635C',
  accent: '#3D5A4C',
  onAccent: '#F4F2ED',
  alert: '#A3402E',
  saved: '#6B7F5C',
  divider: '#D8D3C8',
};

export const dark: Tokens = {
  bg: '#1C1B19',
  ink: '#E8E4DB',
  muted: '#A39E94',
  accent: '#6F9A84',
  onAccent: '#1C1B19',
  alert: '#D0654F',
  saved: '#95A884',
  divider: '#34322E',
};
