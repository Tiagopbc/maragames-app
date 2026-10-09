import {
    acertosDoTopico,
    contagemDoReteste,
    descreverEtapa,
    formatarAcertos,
    formatarTaxa,
    formatarXp,
    formatarXpTotal,
    janelaDoReteste,
    resumirQuadrantes,
} from '../textos';

describe('formatarXp', () => {
    it('ganho aparece com sinal de mais', () => {
        expect(formatarXp(3)).toBe('+3 XP');
    });

    it('perda aparece com sinal de menos tipográfico', () => {
        expect(formatarXp(-4)).toBe('−4 XP');
    });

    it('zero aparece sem sinal', () => {
        expect(formatarXp(0)).toBe('0 XP');
    });
});

describe('formatarXpTotal', () => {
    it('o total da home leva o rótulo na frente', () => {
        expect(formatarXpTotal(18)).toBe('XP: +18');
    });

    it('zero aparece sem sinal', () => {
        expect(formatarXpTotal(0)).toBe('XP: 0');
    });
});

describe('acertosDoTopico', () => {
    it('diz os acertos do tópico e o XP que ele rendeu', () => {
        expect(acertosDoTopico(6, 6, 'UX/UI em jogos', 18)).toBe(
            'Você acertou 6 de 6 questões de UX/UI em jogos · +18 XP'
        );
    });

    it('saldo negativo aparece como é', () => {
        expect(acertosDoTopico(1, 6, 'GDD', -5)).toBe('Você acertou 1 de 6 questões de GDD · −5 XP');
    });
});

describe('descreverEtapa', () => {
    const progresso = { respondidas: 3, total: 12, proximaQuestaoId: 'q4' };

    it('nos blocos medidos, diz o bloco e quantas questões já foram', () => {
        expect(descreverEtapa({ tipo: 'pre', ...progresso }, null)).toBe('Pré-teste · 3 de 12');
        expect(descreverEtapa({ tipo: 'pos', ...progresso }, null)).toBe('Pós-teste · 3 de 12');
        expect(descreverEtapa({ tipo: 'reteste', foraDaJanela: false, ...progresso }, null)).toBe(
            'Reteste · 3 de 12'
        );
    });

    it('no estudo ainda sem prática, anuncia o cartão do tópico', () => {
        const etapa = { tipo: 'estudo', topicId: 'mda', respondidas: 0, total: 4, proximaQuestaoId: 'p1' } as const;

        expect(descreverEtapa(etapa, 'Framework MDA')).toBe('Cartão de Framework MDA');
        expect(descreverEtapa(etapa, null)).toBe('Cartão de conceito');
    });

    it('no estudo com a prática começada, diz o nome do tópico e o progresso', () => {
        const etapa = { tipo: 'estudo', topicId: 'mda', respondidas: 1, total: 4, proximaQuestaoId: 'p2' } as const;

        expect(descreverEtapa(etapa, 'Framework MDA')).toBe('Prática de Framework MDA · 1 de 4');
    });

    it('no estudo sem nome de tópico, não deixa um buraco na frase', () => {
        const etapa = { tipo: 'estudo', topicId: 'mda', respondidas: 1, total: 4, proximaQuestaoId: 'p2' } as const;

        expect(descreverEtapa(etapa, null)).toBe('Prática · 1 de 4');
    });

    it('na espera, conta os dias até o reteste', () => {
        expect(descreverEtapa({ tipo: 'espera', liberaEm: 0, ultimoDiaEm: 0, diasRestantes: 5 }, null)).toBe(
            'O reteste abre em 5 dias.'
        );
    });

    it('na véspera do reteste, diz "amanhã"', () => {
        expect(descreverEtapa({ tipo: 'espera', liberaEm: 0, ultimoDiaEm: 0, diasRestantes: 1 }, null)).toBe(
            'O reteste abre amanhã.'
        );
    });

    it.each([
        ['consentimento', 'Falta aceitar o termo de consentimento.'],
        ['sus', 'Falta o questionário final.'],
        ['concluido', 'Você concluiu o roteiro.'],
    ] as const)('em %s: %s', (tipo, texto) => {
        expect(descreverEtapa({ tipo }, null)).toBe(texto);
    });
});

describe('resumirQuadrantes', () => {
    it('lista o que há para revisar, do mais urgente ao menos, no plural certo', () => {
        expect(resumirQuadrantes({ firme: 1, fragil: 2, lacuna: 1, ponto_cego: 2 })).toBe(
            '2 pontos cegos · 1 lacuna · 2 frágeis'
        );
    });

    it('usa o singular quando é um só', () => {
        expect(resumirQuadrantes({ firme: 0, fragil: 1, lacuna: 0, ponto_cego: 1 })).toBe('1 ponto cego · 1 frágil');
    });

    it('deixa de fora o que está zerado e o que está firme', () => {
        expect(resumirQuadrantes({ firme: 3, fragil: 0, lacuna: 2, ponto_cego: 0 })).toBe('2 lacunas');
    });
});

describe('formatarTaxa e formatarAcertos', () => {
    it('a taxa diz quantos acertos em quantas respostas', () => {
        expect(formatarTaxa(2, 3)).toBe('2 de 3');
    });

    it('sem resposta naquele grupo, a taxa diz isso em vez de "0 de 0"', () => {
        expect(formatarTaxa(0, 0)).toBe('sem respostas');
    });

    it('o resumo de acertos não depende de plural', () => {
        expect(formatarAcertos(1, 2)).toBe('Acertou 1 de 2');
        expect(formatarAcertos(8, 12)).toBe('Acertou 8 de 12');
    });
});

describe('contagemDoReteste', () => {
    it('com vários dias, destaca a contagem', () => {
        expect(contagemDoReteste(6)).toEqual({ rotulo: 'Seu reteste abre em', destaque: '6 dias' });
    });

    it('faltando um dia, diz amanhã', () => {
        expect(contagemDoReteste(1)).toEqual({ rotulo: 'Seu reteste abre', destaque: 'amanhã' });
    });
});

describe('janelaDoReteste', () => {
    const DIA = 24 * 60 * 60 * 1000;
    // Meia-noite de sexta, 06/11/2026, em São Luís (UTC−3).
    const SEXTA = Date.parse('2026-11-06T00:00:00-03:00');

    it('diz o dia da semana e a data em que abre e até quando fica', () => {
        expect(janelaDoReteste(SEXTA, SEXTA + 2 * DIA)).toBe(
            'Abre na sexta, 06/11, e fica disponível até domingo, 08/11.'
        );
    });

    it('sábado e domingo levam "no"', () => {
        expect(janelaDoReteste(SEXTA + DIA, SEXTA + 3 * DIA)).toBe(
            'Abre no sábado, 07/11, e fica disponível até segunda, 09/11.'
        );
        expect(janelaDoReteste(SEXTA + 2 * DIA, SEXTA + 4 * DIA)).toBe(
            'Abre no domingo, 08/11, e fica disponível até terça, 10/11.'
        );
    });
});
