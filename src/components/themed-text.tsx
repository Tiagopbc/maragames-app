import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

// Cada peso da Lexend é um arquivo, com nome de família próprio. No Android, `fontWeight`
// sozinho não troca de arquivo, então o peso pedido vira a família daquele peso.
function familiaDoPeso(peso: TextStyle['fontWeight']): string {
  const numero = peso === 'bold' ? 700 : peso === undefined || peso === 'normal' ? 400 : Number(peso);
  if (numero >= 700) return Fonts.bold;
  if (numero >= 600) return Fonts.semibold;
  if (numero >= 500) return Fonts.medium;
  return Fonts.regular;
}

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  // Tipo e estilo de quem usa são juntados antes, para saber que peso e que família valem no fim.
  const junto: TextStyle = StyleSheet.flatten([styles[type], style]) ?? {};
  const { fontFamily, fontWeight, ...resto } = junto;

  return (
    <Text
      style={[
        // O link primário tem cor própria, a menos que quem usa peça outra.
        { color: theme[themeColor ?? (type === 'linkPrimary' ? 'primaria' : 'text')] },
        resto,
        // Quem escolhe a família (o código, monoespaçado) fica com ela e com o peso que pediu.
        fontFamily ? { fontFamily, fontWeight } : { fontFamily: familiaDoPeso(fontWeight) },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 700,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 600,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
