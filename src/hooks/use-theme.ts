/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Relevo } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  return Colors[useColorScheme()];
}

// O relevo dos cards no esquema em uso (zero no claro).
export function useRelevo() {
  return Relevo[useColorScheme()];
}
