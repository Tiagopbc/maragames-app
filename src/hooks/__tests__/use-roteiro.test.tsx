import { act, renderHook } from '@testing-library/react-native';

import { repositorio } from '@/data/repositorio';
import type { Participante } from '@/lib/participante';
import type { RepositorioFalso } from '@/test/repositorio-falso';
import type { BlocoQuestao, Fase, Question } from '@/types/domain';

import { useRoteiro } from '../use-roteiro';

// O hook só enxerga a interface ProgressRepository; aqui ele recebe a versão em memória.
jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

const repo = repositorio as unknown as RepositorioFalso;

const UID = 'u1';
const ACEITOU: Participante = { formaPre: 'A', consentiuEm: 500, susRespondidoEm: null };
const NAO_ACEITOU: Participante = { formaPre: null, consentiuEm: null, susRespondidoEm: null };

function questao(id: string, topicId: string, bloco: BlocoQuestao, order: number): Question {
    return {
        id,
        lessonId: `licao_${topicId}`,
        topicId,
        order,
        bloco,
        dificuldade: 'basico',
        formato: 'multipla_escolha',
        enunciado: id,
        alternativas: [],
        fonte: null,
        versaoConteudo: 'v1',
    };
}

function responder(fase: Fase, questionIds: string[]) {
    for (const questionId of questionIds) {
        repo.respostas.push({
            id: `r${repo.respostas.length + 1}`,
            uid: UID,
            questionId,
            topicId: questionId.split('_')[0],
            attemptId: 't1',
            fase,
            escolha: 'a',
            ordemExibida: ['a', 'b', 'c', 'd'],
            correta: true,
            confianca: 1,
            tempoMs: 1,
            respondidaEm: 1_000,
        });
    }
}

// Um tópico medido (MDA: uma questão por forma e uma de prática) e um da trilha diária (GDD: só prática).
beforeEach(() => {
    repo.reiniciar();
    repo.licoes = [
        { id: 'licao_mda', title: 'Framework MDA', order: 1, topicId: 'mda' },
        { id: 'licao_gdd', title: 'GDD', order: 2, topicId: 'gdd' },
    ];
    repo.questoes = [
        questao('mda_a1', 'mda', 'forma_a', 1),
        questao('mda_b1', 'mda', 'forma_b', 2),
        questao('mda_p1', 'mda', 'pratica', 3),
        questao('gdd_p1', 'gdd', 'pratica', 1),
    ];
});

async function abrir(participante: Participante = ACEITOU, agora = 1_000) {
    const hook = await renderHook(() => useRoteiro({ uid: UID, participante, relogio: () => agora }));
    await act(() => hook.result.current.recarregar());
    return hook;
}

describe('useRoteiro', () => {
    it('começa carregando', async () => {
        const { result } = await renderHook(() => useRoteiro({ uid: UID, participante: ACEITOU }));

        expect(result.current.estado).toEqual({ tipo: 'carregando' });
    });

    it('quem não aceitou o termo fica no consentimento', async () => {
        const { result } = await abrir(NAO_ACEITOU);

        expect(result.current.estado).toEqual({
            tipo: 'pronto',
            etapa: { tipo: 'consentimento' },
            nomeDoTopico: null,
        });
    });

    it('depois do aceite, a etapa é o pré-teste na forma do participante', async () => {
        const { result } = await abrir();

        expect(result.current.estado).toEqual({
            tipo: 'pronto',
            etapa: { tipo: 'pre', respondidas: 0, total: 1, proximaQuestaoId: 'mda_a1' },
            nomeDoTopico: null,
        });
    });

    it('no estudo, traz o nome do tópico da vez', async () => {
        responder('pre', ['mda_a1']);

        const { result } = await abrir();

        expect(result.current.estado).toMatchObject({
            tipo: 'pronto',
            etapa: { tipo: 'estudo', topicId: 'mda' },
            nomeDoTopico: 'Framework MDA',
        });
    });

    it('o estudo segue a ordem de apresentação do conteúdo, e não o número da lição', async () => {
        // Engine é a lição 2 e Pixel Art, a 4; no piloto, Pixel Art vem antes (item 23).
        repo.licoes = [
            { id: 'licao_mda', title: 'Framework MDA', order: 1, ordem: 1, topicId: 'mda' },
            { id: 'licao_engine', title: 'Escolhendo a Engine Certa', order: 2, ordem: 3, topicId: 'engine' },
            { id: 'licao_pixel', title: 'Pixel Art Básico', order: 4, ordem: 2, topicId: 'pixel' },
        ];
        repo.questoes = ['mda', 'engine', 'pixel'].flatMap((t) => [
            questao(`${t}_a1`, t, 'forma_a', 1),
            questao(`${t}_b1`, t, 'forma_b', 2),
            questao(`${t}_p1`, t, 'pratica', 3),
        ]);
        responder('pre', ['mda_a1', 'engine_a1', 'pixel_a1']);
        responder('pratica', ['mda_p1']);

        const { result } = await abrir();

        expect(result.current.estado).toMatchObject({
            tipo: 'pronto',
            etapa: { tipo: 'estudo', topicId: 'pixel' },
            nomeDoTopico: 'Pixel Art Básico',
        });
    });

    it('tópico da trilha diária não entra no roteiro: depois da prática do medido vem o pós', async () => {
        responder('pre', ['mda_a1']);
        responder('pratica', ['mda_p1']);

        const { result } = await abrir();

        expect(result.current.estado).toMatchObject({
            tipo: 'pronto',
            etapa: { tipo: 'pos', proximaQuestaoId: 'mda_b1' },
        });
    });

    it('depois do pós, espera os dias do reteste contados pelo relógio recebido', async () => {
        responder('pre', ['mda_a1']);
        responder('pratica', ['mda_p1']);
        responder('pos', ['mda_b1']);

        const { result } = await abrir(ACEITOU, 1_000);

        expect(result.current.estado).toMatchObject({ tipo: 'pronto', etapa: { tipo: 'espera', diasRestantes: 7 } });
    });

    it('recarregar recalcula a etapa com as respostas novas', async () => {
        const { result } = await abrir();
        responder('pre', ['mda_a1']);

        await act(() => result.current.recarregar());

        expect(result.current.estado).toMatchObject({ tipo: 'pronto', etapa: { tipo: 'estudo' } });
    });

    describe('quando a leitura falha', () => {
        beforeEach(() => {
            jest.spyOn(console, 'warn').mockImplementation(() => {});
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('fica em erro, e recarregar tenta de novo', async () => {
            repo.falhaAoCarregar = true;
            const { result } = await abrir();
            expect(result.current.estado).toEqual({ tipo: 'erro' });

            repo.falhaAoCarregar = false;
            await act(() => result.current.recarregar());

            expect(result.current.estado).toMatchObject({ tipo: 'pronto', etapa: { tipo: 'pre' } });
        });

        it('conteúdo sem questões medidas é erro, não roteiro concluído', async () => {
            repo.questoes = repo.questoes.filter((q) => q.bloco === 'pratica');

            const { result } = await abrir();

            expect(result.current.estado).toEqual({ tipo: 'erro' });
        });
    });
});
