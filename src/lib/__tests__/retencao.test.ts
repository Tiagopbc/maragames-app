import type { Confianca, Fase } from '../../types/domain';
import { retencao, type QuestaoDaRetencao, type RespostaDaRetencao } from '../retencao';

// O bloco do pós-teste: dois tópicos, três questões cada. O reteste repete essas questões.
const QUESTOES: QuestaoDaRetencao[] = [
    { id: 'mda_1', topicId: 'mda' },
    { id: 'mda_2', topicId: 'mda' },
    { id: 'mda_3', topicId: 'mda' },
    { id: 'engine_1', topicId: 'engine' },
    { id: 'engine_2', topicId: 'engine' },
    { id: 'engine_3', topicId: 'engine' },
];

const TODAS = QUESTOES.map((q) => q.id);

function r(fase: Fase, questionId: string, correta: boolean, confianca: Confianca = 3): RespostaDaRetencao {
    return { fase, questionId, correta, confianca };
}

/** Responde as questões dadas numa fase: as de `certas` certo, as outras errado. */
function bloco(fase: Fase, ids: string[], certas: string[], confianca: Confianca = 3) {
    return ids.map((id) => r(fase, id, certas.includes(id), confianca));
}

describe('retencao: o quanto do pós ainda está lá no reteste', () => {
    it('divide os acertos do reteste pelos do pós', () => {
        const respostas = [
            ...bloco('pos', TODAS, ['mda_1', 'mda_2', 'engine_1', 'engine_2']),
            ...bloco('reteste', TODAS, ['mda_1', 'mda_2', 'engine_1']),
        ];

        expect(retencao(respostas, QUESTOES)).toMatchObject({
            pares: 6,
            acertosNoPos: 4,
            acertosNoReteste: 3,
            razao: 0.75,
        });
    });

    it('passa de 1 quando a pessoa acerta mais no reteste do que no pós', () => {
        const respostas = [...bloco('pos', TODAS, ['mda_1', 'mda_2']), ...bloco('reteste', TODAS, ['mda_1', 'mda_2', 'mda_3'])];

        expect(retencao(respostas, QUESTOES).razao).toBe(1.5);
    });

    // Zero acertos no pós não é "reteve zero": não havia o que reter. A divisão não existe.
    it('com zero acertos no pós, a razão é indefinida, e não zero', () => {
        const respostas = [...bloco('pos', TODAS, []), ...bloco('reteste', TODAS, ['mda_1'])];

        expect(retencao(respostas, QUESTOES)).toMatchObject({ acertosNoPos: 0, acertosNoReteste: 1, razao: null });
    });

    it('sem reteste, não há pares nem razão', () => {
        const respostas = bloco('pos', TODAS, TODAS);

        expect(retencao(respostas, QUESTOES)).toMatchObject({ pares: 0, acertosNoPos: 0, acertosNoReteste: 0, razao: null });
    });

    // Quem parou o reteste no meio é comparado só nas questões que respondeu das duas vezes:
    // senão, as que faltam contariam como esquecidas.
    it('com o reteste pela metade, só entram as questões respondidas nas duas fases', () => {
        const respostas = [
            ...bloco('pos', TODAS, TODAS),
            ...bloco('reteste', ['mda_1', 'mda_2', 'mda_3'], ['mda_1', 'mda_2']),
        ];

        expect(retencao(respostas, QUESTOES)).toMatchObject({ pares: 3, acertosNoPos: 3, acertosNoReteste: 2 });
        expect(retencao(respostas, QUESTOES).razao).toBeCloseTo(2 / 3);
    });

    it('questão respondida duas vezes na mesma fase conta uma vez, pela resposta mais recente', () => {
        const respostas = [
            r('pos', 'mda_1', false),
            r('pos', 'mda_1', true),
            r('reteste', 'mda_1', true),
            r('reteste', 'mda_1', false),
        ];

        expect(retencao(respostas, QUESTOES)).toMatchObject({ pares: 1, acertosNoPos: 1, acertosNoReteste: 0, razao: 0 });
    });

    it('pré-teste e prática não entram na conta', () => {
        const respostas = [
            ...bloco('pre', TODAS, TODAS),
            ...bloco('pratica', TODAS, TODAS),
            ...bloco('pos', TODAS, ['mda_1']),
            ...bloco('reteste', TODAS, ['mda_1']),
        ];

        expect(retencao(respostas, QUESTOES)).toMatchObject({ pares: 6, acertosNoPos: 1, acertosNoReteste: 1, razao: 1 });
    });

    it('resposta de questão que não é do bloco é ignorada', () => {
        const respostas = [r('pos', 'gdd_1', true), r('reteste', 'gdd_1', true), r('pos', 'mda_1', true), r('reteste', 'mda_1', true)];

        expect(retencao(respostas, QUESTOES).pares).toBe(1);
    });

    it('sem resposta nenhuma, devolve tudo zerado', () => {
        expect(retencao([], QUESTOES)).toEqual({
            pares: 0,
            acertosNoPos: 0,
            acertosNoReteste: 0,
            razao: null,
            porTopico: [],
            mantidas: { firme: { acertos: 0, total: 0 }, fragil: { acertos: 0, total: 0 } },
        });
    });
});

describe('retencao por tópico', () => {
    it('dá a conta de cada tópico, na ordem do bloco', () => {
        const respostas = [
            ...bloco('pos', TODAS, ['mda_1', 'mda_2', 'engine_1']),
            ...bloco('reteste', TODAS, ['mda_1', 'engine_1', 'engine_2']),
        ];

        expect(retencao(respostas, QUESTOES).porTopico).toEqual([
            { topicId: 'mda', pares: 3, acertosNoPos: 2, acertosNoReteste: 1, razao: 0.5 },
            { topicId: 'engine', pares: 3, acertosNoPos: 1, acertosNoReteste: 2, razao: 2 },
        ]);
    });

    it('tópico sem par nenhum não aparece', () => {
        const respostas = [...bloco('pos', TODAS, TODAS), ...bloco('reteste', ['mda_1'], ['mda_1'])];

        expect(retencao(respostas, QUESTOES).porTopico.map((t) => t.topicId)).toEqual(['mda']);
    });
});

// O indicador central do piloto (item 23): o acerto Firme no pós é mais lembrado que o Frágil?
// Se for, a confiança declarada prevê o esquecimento.
describe('retencao: o que foi mantido, pelo quadrante do pós', () => {
    it('separa os acertos Firmes dos Frágeis e conta quantos continuam certos no reteste', () => {
        const respostas = [
            r('pos', 'mda_1', true, 3), // firme, mantida
            r('pos', 'mda_2', true, 3), // firme, esquecida
            r('pos', 'mda_3', true, 2), // frágil, mantida
            r('pos', 'engine_1', true, 1), // frágil (palpite), esquecida
            r('pos', 'engine_2', true, 1), // frágil, esquecida
            r('reteste', 'mda_1', true),
            r('reteste', 'mda_2', false),
            r('reteste', 'mda_3', true),
            r('reteste', 'engine_1', false),
            r('reteste', 'engine_2', false),
        ];

        expect(retencao(respostas, QUESTOES).mantidas).toEqual({
            firme: { acertos: 1, total: 2 },
            fragil: { acertos: 1, total: 3 },
        });
    });

    it('o que estava errado no pós não entra, mesmo que acerte no reteste', () => {
        const respostas = [r('pos', 'mda_1', false, 3), r('pos', 'mda_2', false, 1), r('reteste', 'mda_1', true), r('reteste', 'mda_2', true)];

        expect(retencao(respostas, QUESTOES).mantidas).toEqual({
            firme: { acertos: 0, total: 0 },
            fragil: { acertos: 0, total: 0 },
        });
    });

    it('a confiança que vale é a do pós, não a do reteste', () => {
        const respostas = [r('pos', 'mda_1', true, 1), r('reteste', 'mda_1', true, 3)];

        expect(retencao(respostas, QUESTOES).mantidas).toEqual({
            firme: { acertos: 0, total: 0 },
            fragil: { acertos: 1, total: 1 },
        });
    });

    it('acerto do pós sem resposta no reteste não entra', () => {
        const respostas = [r('pos', 'mda_1', true, 3)];

        expect(retencao(respostas, QUESTOES).mantidas.firme).toEqual({ acertos: 0, total: 0 });
    });
});
