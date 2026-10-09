import type { Confianca, Fase } from '../../types/domain';
import { somarXp, xpAcumulado, xpDaResposta } from '../xp';

describe('xpDaResposta', () => {
    it.each([
        [1, 1],
        [2, 2],
        [3, 3],
    ] as const)('acerto no nível %i vale %i', (confianca, xp) => {
        expect(xpDaResposta(true, confianca)).toBe(xp);
    });

    it('erro com palpite não perde ponto', () => {
        expect(xpDaResposta(false, 1)).toBe(0);
    });

    it('erro com dúvida perde 1', () => {
        expect(xpDaResposta(false, 2)).toBe(-1);
    });

    it('erro com certeza perde 4', () => {
        expect(xpDaResposta(false, 3)).toBe(-4);
    });
});

describe('somarXp', () => {
    it('é zero sem respostas', () => {
        expect(somarXp([])).toBe(0);
    });

    it('soma o XP de cada resposta do bloco', () => {
        const respostas = [
            { correta: true, confianca: 3 },
            { correta: true, confianca: 1 },
            { correta: false, confianca: 2 },
        ] as const;

        expect(somarXp(respostas)).toBe(3);
    });

    it('fica negativo quando os erros com certeza pesam mais que os acertos', () => {
        const respostas = [
            { correta: true, confianca: 1 },
            { correta: false, confianca: 3 },
        ] as const;

        expect(somarXp(respostas)).toBe(-3);
    });
});

// O total que a home mostra (item 14): só entra o que a pessoa já viu virar ponto.
describe('xpAcumulado', () => {
    const r = (fase: Fase, questionId: string, correta: boolean, confianca: Confianca) => ({
        fase,
        questionId,
        correta,
        confianca,
    });

    it('sem resposta nenhuma, não há total para mostrar', () => {
        expect(xpAcumulado([], 'pre')).toBeNull();
    });

    it('pré em andamento não entra: o total mudando revelaria o acerto', () => {
        expect(xpAcumulado([r('pre', 'q1', true, 3)], 'pre')).toBeNull();
    });

    it('pré concluído entra, junto com a prática', () => {
        const respostas = [r('pre', 'q1', true, 3), r('pratica', 'p1', true, 2)];

        expect(xpAcumulado(respostas, 'estudo')).toBe(5);
    });

    it('prática entra sempre, mesmo com um bloco medido em andamento', () => {
        const respostas = [r('pre', 'q1', true, 1), r('pratica', 'p1', true, 3), r('pos', 'q2', true, 3)];

        // Pré (+1) e prática (+3); o pós, pela metade, fica de fora.
        expect(xpAcumulado(respostas, 'pos')).toBe(4);
    });

    it('pós entra quando a pessoa chega na espera, e continua contando durante o reteste', () => {
        const respostas = [r('pre', 'q1', true, 1), r('pos', 'q2', true, 3), r('reteste', 'q2', true, 3)];

        expect(xpAcumulado(respostas, 'espera')).toBe(4);
        expect(xpAcumulado(respostas, 'reteste')).toBe(4);
    });

    it('reteste entra depois de concluído, somado ao pós das mesmas questões', () => {
        const respostas = [r('pos', 'q2', true, 3), r('reteste', 'q2', true, 2)];

        expect(xpAcumulado(respostas, 'sus')).toBe(5);
        expect(xpAcumulado(respostas, 'concluido')).toBe(5);
    });

    it('questão respondida duas vezes na mesma fase conta uma vez, pela mais recente', () => {
        const respostas = [r('pratica', 'p1', false, 3), r('pratica', 'p1', true, 3)];

        expect(xpAcumulado(respostas, 'estudo')).toBe(3);
    });

    it('o total não fica abaixo de zero', () => {
        const respostas = [r('pratica', 'p1', false, 3), r('pratica', 'p2', true, 1)];

        expect(xpAcumulado(respostas, 'estudo')).toBe(0);
    });
});

// Propriedade que justifica o esquema (item 14): o melhor nível depende da chance real de acerto.
describe('incentivo à sinceridade', () => {
    const esperado = (p: number, confianca: 1 | 2 | 3) =>
        p * xpDaResposta(true, confianca) + (1 - p) * xpDaResposta(false, confianca);

    it('abaixo de 50% de chance de acerto, palpite rende mais', () => {
        expect(esperado(0.4, 1)).toBeGreaterThan(esperado(0.4, 2));
        expect(esperado(0.4, 1)).toBeGreaterThan(esperado(0.4, 3));
    });

    it('entre 50% e 75%, dúvida rende mais', () => {
        expect(esperado(0.6, 2)).toBeGreaterThan(esperado(0.6, 1));
        expect(esperado(0.6, 2)).toBeGreaterThan(esperado(0.6, 3));
    });

    it('acima de 75%, certeza rende mais', () => {
        expect(esperado(0.9, 3)).toBeGreaterThan(esperado(0.9, 1));
        expect(esperado(0.9, 3)).toBeGreaterThan(esperado(0.9, 2));
    });
});
