/**
 * Cores, fontes e espaçamentos do app. É o único arquivo onde uma cor pode ser escrita:
 * telas e componentes pegam tudo daqui, por `useTheme` (item 28 das decisões).
 */

import '@/global.css';

import { Platform } from 'react-native';

// Identidade da Beast Maragames, a partir do protótipo do grupo: roxo da marca sobre fundos
// claros lilases, e o mesmo roxo clareado no tema escuro. Os dois temas têm os mesmos nomes.
// Todo par de texto e fundo usado nas telas é conferido em __tests__/theme.test.ts.
export const Colors = {
  light: {
    text: '#1A1530',
    textSecondary: '#5E5873',
    background: '#FFFFFF',
    backgroundElement: '#F6F4FA', // cartões e itens de lista
    backgroundSelected: '#F1EDF8',
    borda: '#E4E0EE',
    bordaSelecionada: '#554495',
    primaria: '#3B2781', // links, ícones e destaques sobre o fundo
    botao: '#3B2781',
    textoDoBotao: '#FFFFFF',
    // Estado e quadrante: sucesso = Firme, aviso = Frágil, lacuna = Lacuna, erro = Ponto cego.
    sucesso: '#1E7A4C',
    aviso: '#8A6100',
    lacuna: '#1F3C86',
    erro: '#B91E1E',
  },
  dark: {
    text: '#F2F1F6',
    textSecondary: '#9AA0AE',
    background: '#0E1015',
    backgroundElement: '#181B22',
    backgroundSelected: '#3B2781',
    borda: '#2C313C',
    bordaSelecionada: '#BEB1D7',
    primaria: '#BEB1D7',
    botao: '#554495',
    textoDoBotao: '#FFFFFF',
    // No protótipo escuro estas quatro são fundos com texto branco. Aqui elas são texto, ícone
    // e borda sobre fundo escuro, então entram clareadas: as do protótipo não passam no contraste.
    sucesso: '#3DD68C',
    aviso: '#FFCA16',
    lacuna: '#9EB1FF',
    erro: '#FF6369',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
