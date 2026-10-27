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
    fundoDaLogo: '#FFFFFF',
    // Estado e quadrante: sucesso = Firme, aviso = Frágil, lacuna = Lacuna, erro = Ponto cego.
    sucesso: '#1E7A4C',
    aviso: '#8A6100',
    lacuna: '#1F3C86',
    erro: '#B91E1E',
    // Cards com relevo e carta de jogo (identidade do tema escuro). No claro, cada um repete a
    // cor que aquele lugar já usava: só a estrutura da carta é nova aqui.
    cartao: '#F6F4FA',
    bordaDoCartao: '#E4E0EE',
    cartaoSelecionado: '#F1EDF8',
    fundoDaLetra: '#FFFFFF',
    textoDaLetra: '#5E5873',
    fundoCerta: '#F6F4FA',
    fundoErrada: '#F6F4FA',
    relevoDoBotao: '#3B2781',
    placaDaCarta: '#F1EDF8',
    caixaDaCarta: '#FFFFFF',
    bordaDaCaixa: '#E4E0EE',
    textoDoPe: '#5E5873',
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
    fundoDaLogo: '#FFFFFF', // a logo é roxa: no escuro ela vai sobre um círculo branco
    // No protótipo escuro estas quatro são fundos com texto branco. Aqui elas são texto, ícone
    // e borda sobre fundo escuro, então entram clareadas: as do protótipo não passam no contraste.
    sucesso: '#3DD68C',
    aviso: '#FFCA16',
    lacuna: '#9EB1FF',
    erro: '#FF6369',
    // Roxo da marca + Tátil: superfícies puxadas para o roxo, com borda roxa e relevo embaixo.
    cartao: '#1A1730',
    bordaDoCartao: '#3B2781',
    cartaoSelecionado: '#2A2152',
    fundoDaLetra: '#3B2781',
    textoDaLetra: '#E4DDF3',
    fundoCerta: '#142522',
    fundoErrada: '#24152A',
    relevoDoBotao: '#3B2781',
    placaDaCarta: '#2A2152',
    caixaDaCarta: '#120F22',
    bordaDaCaixa: '#33285F',
    textoDoPe: '#9D92C4',
  },
} as const;

// O relevo dos cards: a espessura que a borda de baixo ganha a mais (1,5 + 3,5 = 5 no escuro) e
// quanto o card desce quando fica apertado (selecionado). No claro não há relevo.
export const Relevo = {
  light: { espessura: 0, afunda: 0 },
  dark: { espessura: 3.5, afunda: 3 },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Lexend, a fonte do protótipo. Com fonte própria, cada peso é um arquivo e tem o seu nome de
// família; os arquivos são carregados no layout raiz. Quem escreve texto usa `ThemedText`, que
// escolhe a família pelo peso pedido.
export const Fonts = {
  regular: 'Lexend_400Regular',
  medium: 'Lexend_500Medium',
  semibold: 'Lexend_600SemiBold',
  bold: 'Lexend_700Bold',
  // Trechos de código seguem na fonte monoespaçada do aparelho.
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)', default: 'monospace' }),
} as const;

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
// As telas de formulário (o perfil) usam uma coluna mais estreita: num computador, um campo da
// largura da tela inteira fica difícil de ler e de preencher.
export const LarguraDoFormulario = 480;
