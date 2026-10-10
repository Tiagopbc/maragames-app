import type { Confianca, Fase } from '../../types/domain';
import type { EstadoDaLicao } from '../licao';
import { somarXp, xpDaResposta, xpDasLicoes } from '../xp';

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

// O total pelo ciclo da lição (item 30): cada tópico fecha os seus blocos sem feedback por conta própria.
describe('xpDasLicoes', () => {
    const r = (fase: Fase, questionId: string, correta: boolean, confianca: Confianca) => ({
        fase,
        questionId,
        topicId: questionId.split('_')[0],
        correta,
        confianca,
    });
    const licao = (topicId: string, tipo: EstadoDaLicao['tipo']) => ({ topicId, estado: { tipo } });

    it('sem resposta nenhuma, não há total para mostrar', () => {
        expect(xpDasLicoes([], [licao('mda', 'nova')])).toBeNull();
    });

    it('diagnóstico pela metade não entra: o total mudando revelaria o acerto', () => {
        expect(xpDasLicoes([r('pre', 'mda_a1', true, 3)], [licao('mda', 'diagnostico')])).toBeNull();
    });

    it('diagnóstico concluído ainda não entra: o resultado dele só aparece no fim da lição', () => {
        const respostas = [r('pre', 'mda_a1', true, 3), r('pratica', 'mda_p1', true, 2)];

        // Só a prática (+2), que já teve feedback.
        expect(xpDasLicoes(respostas, [licao('mda', 'estudo')])).toBe(2);
        expect(xpDasLicoes(respostas, [licao('mda', 'verificacao')])).toBe(2);
    });

    it('cada lição fecha os seus blocos: a que chegou à espera entra, a que está pela metade não', () => {
        const respostas = [r('pre', 'mda_a1', true, 3), r('pre', 'pixel_a1', true, 3), r('pratica', 'gdd_p1', true, 1)];
        const licoes = [licao('mda', 'aguardando_revisao'), licao('pixel', 'estudo'), licao('gdd', 'estudo')];

        // O diagnóstico do MDA (+3) e a prática do GDD (+1); o do Pixel Art fica de fora.
        expect(xpDasLicoes(respostas, licoes)).toBe(4);
    });

    it('diagnóstico e verificação entram juntos, quando a lição passa a aguardar a revisão', () => {
        const respostas = [r('pre', 'mda_a1', true, 1), r('pos', 'mda_b1', true, 3)];

        expect(xpDasLicoes(respostas, [licao('mda', 'verificacao')])).toBeNull();
        expect(xpDasLicoes(respostas, [licao('mda', 'aguardando_revisao')])).toBe(4);
    });

    it('revisão só entra com a lição concluída, somada à verificação das mesmas questões', () => {
        const respostas = [r('pos', 'mda_b1', true, 3), r('reteste', 'mda_b1', true, 2)];

        expect(xpDasLicoes(respostas, [licao('mda', 'revisao')])).toBe(3);
        expect(xpDasLicoes(respostas, [licao('mda', 'concluida')])).toBe(5);
    });

    it('bloco sem feedback de tópico que não é lição fica de fora; a prática dele entra', () => {
        const respostas = [r('pre', 'antigo_a1', true, 3), r('pratica', 'antigo_p1', true, 2)];

        expect(xpDasLicoes(respostas, [licao('mda', 'nova')])).toBe(2);
    });

    it('questão respondida duas vezes na mesma fase conta uma vez, pela mais recente', () => {
        const respostas = [r('pratica', 'mda_p1', false, 3), r('pratica', 'mda_p1', true, 3)];

        expect(xpDasLicoes(respostas, [licao('mda', 'estudo')])).toBe(3);
    });

    it('o total não fica abaixo de zero', () => {
        expect(xpDasLicoes([r('pratica', 'mda_p1', false, 3)], [licao('mda', 'estudo')])).toBe(0);
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
