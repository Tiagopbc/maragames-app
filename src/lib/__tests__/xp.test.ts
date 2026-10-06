import { somarXp, xpDaResposta } from '../xp';

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
