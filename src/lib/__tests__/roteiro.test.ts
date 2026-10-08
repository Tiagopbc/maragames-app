import type { Fase } from '../../types/domain';
import { dataEmSaoLuis, etapaDoRoteiro, terminoDoPos, type EntradaDoRoteiro, type QuestaoDoRoteiro } from '../roteiro';

// Dois tópicos, cada um com 2 questões da forma A, 2 da forma B e 2 de prática.
const QUESTOES: QuestaoDoRoteiro[] = ['mda', 'engine'].flatMap((topicId) => [
    { id: `${topicId}_a1`, topicId, bloco: 'forma_a' },
    { id: `${topicId}_a2`, topicId, bloco: 'forma_a' },
    { id: `${topicId}_b1`, topicId, bloco: 'forma_b' },
    { id: `${topicId}_b2`, topicId, bloco: 'forma_b' },
    { id: `${topicId}_p1`, topicId, bloco: 'pratica' },
    { id: `${topicId}_p2`, topicId, bloco: 'pratica' },
]);

const FORMA_A = ['mda_a1', 'mda_a2', 'engine_a1', 'engine_a2'];
const FORMA_B = ['mda_b1', 'mda_b2', 'engine_b1', 'engine_b2'];
const PRATICA = ['mda_p1', 'mda_p2', 'engine_p1', 'engine_p2'];

/** Horário de São Luís (UTC−3) em milissegundos. Ex.: em('2026-10-30 20:00'). */
function em(dataHora: string): number {
    return Date.parse(`${dataHora.replace(' ', 'T')}:00-03:00`);
}

const DIA_1 = em('2026-10-30 19:00');

function responder(fase: Fase, questionIds: string[], respondidaEm = DIA_1) {
    return questionIds.map((questionId) => ({ questionId, fase, respondidaEm }));
}

function entrada(parcial: Partial<EntradaDoRoteiro> = {}): EntradaDoRoteiro {
    return {
        respostas: [],
        questoes: QUESTOES,
        topicos: ['mda', 'engine'],
        formaPre: 'A',
        consentiuEm: DIA_1,
        susRespondidoEm: null,
        agora: DIA_1,
        ...parcial,
    };
}

// Participante com forma A no pré que fez a sessão 1 inteira; o pós terminou em `fimDoPos`.
function sessao1Completa(fimDoPos = em('2026-10-30 20:00')) {
    return [...responder('pre', FORMA_A), ...responder('pratica', PRATICA), ...responder('pos', FORMA_B, fimDoPos)];
}

describe('etapaDoRoteiro: consentimento', () => {
    it('começa no consentimento enquanto o termo não foi aceito', () => {
        expect(etapaDoRoteiro(entrada({ consentiuEm: null, formaPre: null }))).toEqual({ tipo: 'consentimento' });
    });

    it('fica no consentimento enquanto a forma inicial não foi sorteada', () => {
        expect(etapaDoRoteiro(entrada({ formaPre: null }))).toEqual({ tipo: 'consentimento' });
    });
});

describe('etapaDoRoteiro: pré-teste', () => {
    it('depois do consentimento vem o pré-teste, na primeira questão da forma inicial', () => {
        expect(etapaDoRoteiro(entrada())).toEqual({
            tipo: 'pre',
            respondidas: 0,
            total: 4,
            proximaQuestaoId: 'mda_a1',
        });
    });

    it('quem recebeu a forma B faz o pré com as questões da forma B', () => {
        expect(etapaDoRoteiro(entrada({ formaPre: 'B' }))).toMatchObject({ tipo: 'pre', proximaQuestaoId: 'mda_b1' });
    });

    it('retoma o pré na primeira questão ainda sem resposta', () => {
        const respostas = responder('pre', ['mda_a1', 'mda_a2']);

        expect(etapaDoRoteiro(entrada({ respostas }))).toEqual({
            tipo: 'pre',
            respondidas: 2,
            total: 4,
            proximaQuestaoId: 'engine_a1',
        });
    });

    it('segue a ordem dos tópicos recebida, não a da lista de questões', () => {
        expect(etapaDoRoteiro(entrada({ topicos: ['engine', 'mda'] }))).toMatchObject({
            tipo: 'pre',
            proximaQuestaoId: 'engine_a1',
        });
    });

    it('ignora questões de tópicos fora do roteiro', () => {
        const questoes: QuestaoDoRoteiro[] = [{ id: 'gdd_a1', topicId: 'gdd', bloco: 'forma_a' }, ...QUESTOES];

        expect(etapaDoRoteiro(entrada({ questoes }))).toMatchObject({
            tipo: 'pre',
            total: 4,
            proximaQuestaoId: 'mda_a1',
        });
    });

    it('resposta dada à mesma questão em outra fase não conta para o pré', () => {
        const respostas = responder('pratica', ['mda_a1']);

        expect(etapaDoRoteiro(entrada({ respostas }))).toMatchObject({ tipo: 'pre', respondidas: 0 });
    });

    it('resposta repetida da mesma questão conta uma vez', () => {
        const respostas = [...responder('pre', ['mda_a1']), ...responder('pre', ['mda_a1'])];

        expect(etapaDoRoteiro(entrada({ respostas }))).toMatchObject({
            tipo: 'pre',
            respondidas: 1,
            proximaQuestaoId: 'mda_a2',
        });
    });
});

describe('etapaDoRoteiro: estudo', () => {
    it('terminado o pré, vem o estudo do primeiro tópico', () => {
        const respostas = responder('pre', FORMA_A);

        expect(etapaDoRoteiro(entrada({ respostas }))).toEqual({
            tipo: 'estudo',
            topicId: 'mda',
            respondidas: 0,
            total: 2,
            proximaQuestaoId: 'mda_p1',
        });
    });

    it('retoma a prática do tópico de onde parou', () => {
        const respostas = [...responder('pre', FORMA_A), ...responder('pratica', ['mda_p1'])];

        expect(etapaDoRoteiro(entrada({ respostas }))).toEqual({
            tipo: 'estudo',
            topicId: 'mda',
            respondidas: 1,
            total: 2,
            proximaQuestaoId: 'mda_p2',
        });
    });

    it('terminada a prática de um tópico, passa ao estudo do seguinte', () => {
        const respostas = [...responder('pre', FORMA_A), ...responder('pratica', ['mda_p1', 'mda_p2'])];

        expect(etapaDoRoteiro(entrada({ respostas }))).toMatchObject({
            tipo: 'estudo',
            topicId: 'engine',
            respondidas: 0,
            proximaQuestaoId: 'engine_p1',
        });
    });
});

describe('etapaDoRoteiro: pós-teste', () => {
    it('terminado o estudo, o pós usa a forma que não caiu no pré', () => {
        const respostas = [...responder('pre', FORMA_A), ...responder('pratica', PRATICA)];

        expect(etapaDoRoteiro(entrada({ respostas }))).toEqual({
            tipo: 'pos',
            respondidas: 0,
            total: 4,
            proximaQuestaoId: 'mda_b1',
        });
    });

    it('quem fez a forma B no pré faz a forma A no pós', () => {
        const respostas = [...responder('pre', FORMA_B), ...responder('pratica', PRATICA)];

        expect(etapaDoRoteiro(entrada({ respostas, formaPre: 'B' }))).toMatchObject({
            tipo: 'pos',
            proximaQuestaoId: 'mda_a1',
        });
    });
});

describe('etapaDoRoteiro: espera e reteste', () => {
    it('logo depois do pós, espera 7 dias de calendário', () => {
        const respostas = sessao1Completa(em('2026-10-30 20:00'));

        expect(etapaDoRoteiro(entrada({ respostas, agora: em('2026-10-30 20:05') }))).toEqual({
            tipo: 'espera',
            liberaEm: em('2026-11-06 00:00'),
            ultimoDiaEm: em('2026-11-08 00:00'),
            diasRestantes: 7,
        });
    });

    it('no último minuto do dia 6 ainda espera, faltando 1 dia', () => {
        const respostas = sessao1Completa(em('2026-10-30 20:00'));

        expect(etapaDoRoteiro(entrada({ respostas, agora: em('2026-11-05 23:59') }))).toMatchObject({
            tipo: 'espera',
            diasRestantes: 1,
        });
    });

    it('à meia-noite do dia 7 libera o reteste, com as mesmas questões do pós', () => {
        const respostas = sessao1Completa(em('2026-10-30 20:00'));

        expect(etapaDoRoteiro(entrada({ respostas, agora: em('2026-11-06 00:00') }))).toEqual({
            tipo: 'reteste',
            foraDaJanela: false,
            respondidas: 0,
            total: 4,
            proximaQuestaoId: 'mda_b1',
        });
    });

    it('conta o dia do pós pelo fuso de São Luís, não pelo UTC', () => {
        // 23:30 de 30/10 em São Luís já é 31/10 no UTC; o dia 7 continua sendo 06/11.
        const respostas = sessao1Completa(em('2026-10-30 23:30'));

        expect(etapaDoRoteiro(entrada({ respostas, agora: em('2026-11-06 00:10') }))).toMatchObject({
            tipo: 'reteste',
        });
    });

    it('conta os 7 dias a partir da última resposta do pós', () => {
        const respostas = [
            ...responder('pre', FORMA_A),
            ...responder('pratica', PRATICA),
            ...responder('pos', ['mda_b1', 'mda_b2', 'engine_b1'], em('2026-10-30 20:00')),
            ...responder('pos', ['engine_b2'], em('2026-10-31 09:00')),
        ];

        expect(etapaDoRoteiro(entrada({ respostas, agora: em('2026-11-06 10:00') }))).toMatchObject({
            tipo: 'espera',
            liberaEm: em('2026-11-07 00:00'),
            diasRestantes: 1,
        });
    });

    it('o dia 9 ainda está dentro da janela', () => {
        const respostas = sessao1Completa(em('2026-10-30 20:00'));

        expect(etapaDoRoteiro(entrada({ respostas, agora: em('2026-11-08 23:59') }))).toMatchObject({
            tipo: 'reteste',
            foraDaJanela: false,
        });
    });

    it('depois do dia 9 o reteste continua aberto, marcado como fora da janela', () => {
        const respostas = sessao1Completa(em('2026-10-30 20:00'));

        expect(etapaDoRoteiro(entrada({ respostas, agora: em('2026-11-09 00:00') }))).toMatchObject({
            tipo: 'reteste',
            foraDaJanela: true,
        });
    });

    it('retoma o reteste contando só as respostas da fase reteste', () => {
        const respostas = [...sessao1Completa(), ...responder('reteste', ['mda_b1'], em('2026-11-06 10:00'))];

        expect(etapaDoRoteiro(entrada({ respostas, agora: em('2026-11-06 10:01') }))).toMatchObject({
            tipo: 'reteste',
            respondidas: 1,
            total: 4,
            proximaQuestaoId: 'mda_b2',
        });
    });
});

describe('etapaDoRoteiro: SUS e fim', () => {
    const tudo = [...sessao1Completa(), ...responder('reteste', FORMA_B, em('2026-11-06 10:00'))];

    it('terminado o reteste, falta o SUS', () => {
        expect(etapaDoRoteiro(entrada({ respostas: tudo, agora: em('2026-11-06 10:10') }))).toEqual({ tipo: 'sus' });
    });

    it('com o SUS respondido, o roteiro está concluído', () => {
        const fim = entrada({
            respostas: tudo,
            susRespondidoEm: em('2026-11-06 10:15'),
            agora: em('2026-11-06 10:20'),
        });

        expect(etapaDoRoteiro(fim)).toEqual({ tipo: 'concluido' });
    });
});

describe('etapaDoRoteiro: conteúdo do piloto', () => {
    const questoes = require('../../../content/questoes.json') as QuestaoDoRoteiro[];
    const topicos = ['mda_framework', 'pixel_art_basico', 'escolha_de_engine', 'logica_programacao'];
    const idsDe = (bloco: string) => questoes.filter((q) => q.bloco === bloco).map((q) => q.id);

    it('o pré tem 12 questões, 3 por tópico', () => {
        expect(etapaDoRoteiro(entrada({ questoes, topicos }))).toMatchObject({ tipo: 'pre', total: 12 });
    });

    it('cada tópico tem 4 questões de prática', () => {
        const respostas = responder('pre', idsDe('forma_a'));

        expect(etapaDoRoteiro(entrada({ questoes, topicos, respostas }))).toMatchObject({
            tipo: 'estudo',
            topicId: 'mda_framework',
            total: 4,
        });
    });

    it('o pós tem as 12 questões da outra forma', () => {
        const respostas = [...responder('pre', idsDe('forma_a')), ...responder('pratica', idsDe('pratica'))];

        expect(etapaDoRoteiro(entrada({ questoes, topicos, respostas }))).toMatchObject({ tipo: 'pos', total: 12 });
    });
});

describe('etapaDoRoteiro: conteúdo incompleto', () => {
    it('recusa calcular a etapa sem as questões dos blocos medidos, em vez de pular o pré', () => {
        expect(() => etapaDoRoteiro(entrada({ questoes: [] }))).toThrow('Roteiro sem questões');
    });
});

describe('dataEmSaoLuis', () => {
    it('dá o dia da semana, o dia e o mês no fuso de São Luís', () => {
        // 06/11/2026 é uma sexta-feira (0 = domingo).
        expect(dataEmSaoLuis(em('2026-11-06 00:00'))).toEqual({ diaDaSemana: 5, dia: 6, mes: 11 });
    });

    it('às 23:30 ainda é o mesmo dia, mesmo que no UTC já seja o seguinte', () => {
        expect(dataEmSaoLuis(em('2026-10-31 23:30'))).toEqual({ diaDaSemana: 6, dia: 31, mes: 10 });
    });

    it('à meia-noite já é o dia seguinte', () => {
        expect(dataEmSaoLuis(em('2026-11-01 00:00'))).toEqual({ diaDaSemana: 0, dia: 1, mes: 11 });
    });
});

describe('terminoDoPos', () => {
    const base = { questoes: QUESTOES, topicos: ['mda', 'engine'], formaPre: 'A' as const };

    it('é o horário da última resposta do pós, quando o pós está completo', () => {
        const respostas = [
            ...responder('pos', ['mda_b1', 'mda_b2', 'engine_b1'], em('2026-10-30 20:00')),
            ...responder('pos', ['engine_b2'], em('2026-10-30 20:30')),
        ];

        expect(terminoDoPos({ ...base, respostas })).toBe(em('2026-10-30 20:30'));
    });

    it('é null enquanto falta questão do pós', () => {
        const respostas = responder('pos', ['mda_b1', 'mda_b2', 'engine_b1']);

        expect(terminoDoPos({ ...base, respostas })).toBeNull();
    });

    it('é null sem a forma do participante', () => {
        expect(terminoDoPos({ ...base, formaPre: null, respostas: responder('pos', FORMA_B) })).toBeNull();
    });

    it('resposta do reteste nas mesmas questões não conta como pós', () => {
        expect(terminoDoPos({ ...base, respostas: responder('reteste', FORMA_B) })).toBeNull();
    });
});
