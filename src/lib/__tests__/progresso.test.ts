import type { Confianca, Fase } from '../../types/domain';
import { historicoDoTopico, resumoDasRespostas, revisaoPorTopico } from '../progresso';

const r = (fase: Fase, questionId: string, correta: boolean, confianca: Confianca, respondidaEm = 1_000) => ({
    fase,
    questionId,
    topicId: questionId.split('_')[0],
    correta,
    confianca,
    respondidaEm,
});

describe('resumoDasRespostas', () => {
    it('sem respostas, tudo zerado', () => {
        expect(resumoDasRespostas([])).toEqual({
            quadrantes: { firme: 0, fragil: 0, lacuna: 0, ponto_cego: 0 },
            porConfianca: { 1: { acertos: 0, total: 0 }, 2: { acertos: 0, total: 0 }, 3: { acertos: 0, total: 0 } },
        });
    });

    it('conta um quadrante por questão, pela resposta mais recente em qualquer fase', () => {
        const respostas = [
            r('pratica', 'mda_p1', true, 3), // firme
            r('pratica', 'mda_p2', true, 1), // frágil
            r('pos', 'mda_b1', false, 3, 1_000), // era ponto cego...
            r('reteste', 'mda_b1', true, 3, 2_000), // ...e virou firme na revisão
            r('pre', 'mda_a1', false, 2), // lacuna
        ];

        expect(resumoDasRespostas(respostas).quadrantes).toEqual({ firme: 2, fragil: 1, lacuna: 1, ponto_cego: 0 });
    });

    it('no acerto por confiança, cada declaração conta: a mesma questão em duas fases entra duas vezes', () => {
        const respostas = [
            r('pos', 'mda_b1', false, 3, 1_000),
            r('reteste', 'mda_b1', true, 3, 2_000),
            r('pratica', 'mda_p1', true, 1),
            r('pratica', 'mda_p2', false, 1),
        ];

        expect(resumoDasRespostas(respostas).porConfianca).toEqual({
            1: { acertos: 1, total: 2 },
            2: { acertos: 0, total: 0 },
            3: { acertos: 1, total: 2 },
        });
    });

    it('questão respondida duas vezes na mesma fase conta uma vez, pela mais recente', () => {
        const respostas = [r('pratica', 'mda_p1', false, 3, 1_000), r('pratica', 'mda_p1', true, 3, 2_000)];

        expect(resumoDasRespostas(respostas).porConfianca[3]).toEqual({ acertos: 1, total: 1 });
        expect(resumoDasRespostas(respostas).quadrantes.firme).toBe(1);
    });
});

describe('historicoDoTopico', () => {
    it('lista os passos feitos, na ordem em que aconteceram, com a data da última resposta de cada um', () => {
        const respostas = [
            r('pre', 'mda_a1', true, 1, 100),
            r('pre', 'mda_a2', true, 1, 150),
            r('pratica', 'mda_p1', true, 1, 300),
            r('pos', 'mda_b1', true, 1, 400),
            r('pratica', 'gdd_p1', true, 1, 500),
        ];

        expect(historicoDoTopico(respostas, 'mda')).toEqual([
            { fase: 'pre', em: 150, respostas: 2 },
            { fase: 'pratica', em: 300, respostas: 1 },
            { fase: 'pos', em: 400, respostas: 1 },
        ]);
    });

    it('tópico sem resposta não tem histórico', () => {
        expect(historicoDoTopico([], 'mda')).toEqual([]);
    });
});

// Onde o aluno precisa melhorar: os tópicos, do mais fraco para o mais forte (item 27).
describe('revisaoPorTopico', () => {
    const ORDEM = ['mda', 'pixel', 'engine', 'gdd'];
    const topicos = (respostas: ReturnType<typeof r>[]) => revisaoPorTopico(respostas, ORDEM).map((t) => t.topicId);

    it('conta os quadrantes de cada tópico, uma vez por questão, pela resposta mais recente', () => {
        const respostas = [
            r('pratica', 'mda_p1', false, 3, 1_000), // era ponto cego...
            r('pratica', 'mda_p1', true, 3, 2_000), // ...e virou firme
            r('pratica', 'mda_p2', false, 1),
            r('pratica', 'gdd_p1', true, 2),
        ];

        expect(revisaoPorTopico(respostas, ORDEM)).toEqual([
            { topicId: 'mda', quadrantes: { firme: 1, fragil: 0, lacuna: 1, ponto_cego: 0 } },
            { topicId: 'gdd', quadrantes: { firme: 0, fragil: 1, lacuna: 0, ponto_cego: 0 } },
        ]);
    });

    it('o tópico com mais pontos cegos vem primeiro', () => {
        const respostas = [
            r('pratica', 'mda_p1', false, 3),
            r('pratica', 'pixel_p1', false, 3),
            r('pratica', 'pixel_p2', false, 3),
            r('pratica', 'engine_p1', false, 1),
            r('pratica', 'engine_p2', false, 1),
            r('pratica', 'engine_p3', false, 1),
        ];

        // Três lacunas não passam na frente de um ponto cego.
        expect(topicos(respostas)).toEqual(['pixel', 'mda', 'engine']);
    });

    it('no empate de pontos cegos, mais lacunas; depois, mais frágeis', () => {
        const respostas = [
            r('pratica', 'mda_p1', true, 1), // frágil
            r('pratica', 'pixel_p1', false, 1), // lacuna
            r('pratica', 'engine_p1', true, 1),
            r('pratica', 'engine_p2', true, 2), // duas frágeis
        ];

        expect(topicos(respostas)).toEqual(['pixel', 'engine', 'mda']);
    });

    it('tópico em que tudo está firme vai para o fim; no empate, vale a ordem sugerida', () => {
        const respostas = [
            r('pratica', 'mda_p1', true, 3),
            r('pratica', 'gdd_p1', true, 3),
            r('pratica', 'engine_p1', false, 2),
        ];

        expect(topicos(respostas)).toEqual(['engine', 'mda', 'gdd']);
    });

    it('tópico sem resposta fica de fora', () => {
        expect(revisaoPorTopico([], ORDEM)).toEqual([]);
    });
});
