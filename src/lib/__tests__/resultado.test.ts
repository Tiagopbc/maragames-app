import type { Confianca } from '../../types/domain';
import { resultadoDoBloco } from '../resultado';

// Bloco medido de dois tópicos, três questões cada, já na ordem do roteiro.
const QUESTOES = ['mda', 'engine'].flatMap((topicId) =>
    [1, 2, 3].map((n) => ({ id: `${topicId}_${n}`, topicId }))
);

function r(questionId: string, correta: boolean, confianca: Confianca) {
    return { questionId, topicId: questionId.split('_')[0], correta, confianca };
}

describe('resultadoDoBloco', () => {
    it('sem respostas, tudo é zero e não há o que revisar', () => {
        expect(resultadoDoBloco([], QUESTOES)).toEqual({
            total: 0,
            acertos: 0,
            xp: 0,
            quadrantes: { firme: 0, fragil: 0, lacuna: 0, ponto_cego: 0 },
            porTopico: [],
            porConfianca: {
                1: { acertos: 0, total: 0 },
                2: { acertos: 0, total: 0 },
                3: { acertos: 0, total: 0 },
            },
            questoesARevisar: [],
            topicosARevisar: [],
        });
    });

    const respostas = [
        r('mda_1', true, 3), // firme, +3
        r('mda_2', true, 2), // frágil, +2
        r('mda_3', false, 1), // lacuna, 0
        r('engine_1', false, 3), // ponto cego, −4
        r('engine_2', false, 3), // ponto cego, −4
        r('engine_3', true, 1), // frágil, +1
    ];

    it('conta acertos e respostas', () => {
        expect(resultadoDoBloco(respostas, QUESTOES)).toMatchObject({ total: 6, acertos: 3 });
    });

    it('conta as respostas em cada quadrante', () => {
        expect(resultadoDoBloco(respostas, QUESTOES).quadrantes).toEqual({
            firme: 1,
            fragil: 2,
            lacuna: 1,
            ponto_cego: 2,
        });
    });

    it('soma o XP do bloco, que pode ficar negativo', () => {
        expect(resultadoDoBloco(respostas, QUESTOES).xp).toBe(-2);
    });

    it('dá o acerto e os quadrantes de cada tópico, na ordem do bloco', () => {
        expect(resultadoDoBloco(respostas, QUESTOES).porTopico).toEqual([
            { topicId: 'mda', acertos: 2, total: 3, quadrantes: { firme: 1, fragil: 1, lacuna: 1, ponto_cego: 0 } },
            { topicId: 'engine', acertos: 1, total: 3, quadrantes: { firme: 0, fragil: 1, lacuna: 0, ponto_cego: 2 } },
        ]);
    });

    it('dá o acerto em cada nível de confiança', () => {
        expect(resultadoDoBloco(respostas, QUESTOES).porConfianca).toEqual({
            1: { acertos: 1, total: 2 },
            2: { acertos: 1, total: 1 },
            3: { acertos: 1, total: 3 },
        });
    });

    it('manda revisar primeiro os pontos cegos, depois as lacunas, depois os frágeis; firme fica de fora', () => {
        expect(resultadoDoBloco(respostas, QUESTOES).questoesARevisar).toEqual([
            { questionId: 'engine_1', topicId: 'engine', quadrante: 'ponto_cego' },
            { questionId: 'engine_2', topicId: 'engine', quadrante: 'ponto_cego' },
            { questionId: 'mda_3', topicId: 'mda', quadrante: 'lacuna' },
            { questionId: 'mda_2', topicId: 'mda', quadrante: 'fragil' },
            { questionId: 'engine_3', topicId: 'engine', quadrante: 'fragil' },
        ]);
    });

    it('ordena os tópicos a revisar pelo número de pontos cegos', () => {
        expect(resultadoDoBloco(respostas, QUESTOES).topicosARevisar).toEqual(['engine', 'mda']);
    });

    it('sem ponto cego, desempata os tópicos pelas lacunas e depois pelos frágeis', () => {
        const semPontoCego = [
            r('mda_1', true, 1), // frágil
            r('mda_2', true, 2), // frágil
            r('engine_1', false, 1), // lacuna
        ];

        expect(resultadoDoBloco(semPontoCego, QUESTOES).topicosARevisar).toEqual(['engine', 'mda']);
    });

    it('tópico em que tudo está firme não entra na revisão', () => {
        const mdaFirme = [r('mda_1', true, 3), r('mda_2', true, 3), r('engine_1', false, 2)];

        expect(resultadoDoBloco(mdaFirme, QUESTOES).topicosARevisar).toEqual(['engine']);
    });

    it('com tudo firme, não há o que revisar', () => {
        const tudoFirme = [r('mda_1', true, 3), r('engine_1', true, 3)];

        expect(resultadoDoBloco(tudoFirme, QUESTOES)).toMatchObject({ questoesARevisar: [], topicosARevisar: [] });
    });

    it('questão respondida duas vezes conta uma vez, pela resposta mais recente', () => {
        const repetida = [r('mda_1', false, 3), r('mda_1', true, 3)];

        expect(resultadoDoBloco(repetida, QUESTOES)).toMatchObject({ total: 1, acertos: 1, xp: 3 });
    });

    it('ignora resposta de questão que não é do bloco', () => {
        const comIntrusa = [r('mda_1', true, 3), r('pixel_9', false, 3)];

        expect(resultadoDoBloco(comIntrusa, QUESTOES)).toMatchObject({ total: 1, xp: 3 });
    });

    it('segue a ordem das questões do bloco, e não a ordem em que as respostas chegam', () => {
        const foraDeOrdem = [r('engine_2', false, 3), r('engine_1', false, 3), r('mda_1', false, 3)];

        expect(resultadoDoBloco(foraDeOrdem, QUESTOES).questoesARevisar.map((q) => q.questionId)).toEqual([
            'mda_1',
            'engine_1',
            'engine_2',
        ]);
    });
});
