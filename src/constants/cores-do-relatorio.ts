// As cores da página do relatório (src/lib/relatorio.ts). Ficam fora de theme.ts porque o
// relatório é gerado por um script, no Node, e theme.ts importa o React Native, que não roda lá.
//
// As cores de base são as do tema do app, repetidas aqui; um teste compara as duas listas
// (src/lib/__tests__/relatorio.test.ts), então mudar o tema sem mudar este arquivo quebra o teste.
//
// As cores dos gráficos são os tons do app ajustados para preenchimento de barra, e foram
// conferidas no claro e no escuro: separação entre vizinhas para quem não distingue cores,
// contraste com o fundo, luminosidade e saturação. Trocar uma delas pede conferir de novo.

export const CoresDoRelatorio = {
    claro: {
        fundo: '#FFFFFF',
        elemento: '#F6F4FA',
        borda: '#E4E0EE',
        texto: '#1A1530',
        texto2: '#5E5873',
        marca: '#3B2781',
        // O mesmo indicador em três momentos: diagnóstico, verificação e revisão.
        antes: '#9A86D6',
        depois: '#5236B8',
        revisao: '#0B9A8D',
        // Os quadrantes, nas cores que o aluno vê no app.
        firme: '#1E7A4C',
        fragil: '#B8860B',
        lacuna: '#3558B8',
        ponto_cego: '#C8322F',
    },
    escuro: {
        fundo: '#0E1015',
        elemento: '#181B22',
        borda: '#2C313C',
        texto: '#F2F1F6',
        texto2: '#9AA0AE',
        marca: '#BEB1D7',
        antes: '#644EC6',
        depois: '#A07AEA',
        revisao: '#1DA08F',
        firme: '#19A383',
        fragil: '#B88A00',
        lacuna: '#6F86EC',
        ponto_cego: '#EC4F56',
    },
} as const;
