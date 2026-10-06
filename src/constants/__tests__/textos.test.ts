import { descreverEtapa, formatarAcertos, formatarTaxa, formatarXp, resumirQuadrantes } from '../textos';

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
        expect(descreverEtapa({ tipo: 'espera', liberaEm: 0, diasRestantes: 5 }, null)).toBe(
            'O reteste abre em 5 dias.'
        );
    });

    it('na véspera do reteste, diz "amanhã"', () => {
        expect(descreverEtapa({ tipo: 'espera', liberaEm: 0, diasRestantes: 1 }, null)).toBe(
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
