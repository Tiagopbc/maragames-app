import type { BlocoQuestao, Fase } from '../../types/domain';
import { cicloDaLicao, estadoDaLicao, licoesDoAluno, type QuestaoDaLicao, type RespostaDaLicao } from '../licao';
import { diaDeCalendario, inicioDoDia } from '../roteiro';

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
// Meio-dia de 06/10/2026 em São Luís (UTC−3).
const DIA_1 = Date.UTC(2026, 9, 6, 15);

const q = (id: string, bloco: BlocoQuestao): QuestaoDaLicao => ({ id, topicId: id.split('_')[0], bloco });
const r = (fase: Fase, questionId: string, respondidaEm = DIA_1): RespostaDaLicao => ({ fase, questionId, respondidaEm });
const varias = (fase: Fase, ids: string[], respondidaEm = DIA_1) => ids.map((id) => r(fase, id, respondidaEm));

// MDA tem o ciclo completo (formas A e B e prática); GDD só tem prática.
const QUESTOES: QuestaoDaLicao[] = [
    q('mda_a1', 'forma_a'),
    q('mda_a2', 'forma_a'),
    q('mda_a3', 'forma_a'),
    q('mda_b1', 'forma_b'),
    q('mda_b2', 'forma_b'),
    q('mda_b3', 'forma_b'),
    q('mda_p1', 'pratica'),
    q('mda_p2', 'pratica'),
    q('gdd_p1', 'pratica'),
    q('gdd_p2', 'pratica'),
];

const FORMA_A = ['mda_a1', 'mda_a2', 'mda_a3'];
const FORMA_B = ['mda_b1', 'mda_b2', 'mda_b3'];
const PRATICA = ['mda_p1', 'mda_p2'];

// Quem tem a forma A faz A no diagnóstico e B na verificação e na revisão.
const ateAVerificacao = (quando = DIA_1) => [
    ...varias('pre', FORMA_A, quando),
    ...varias('pratica', PRATICA, quando),
    ...varias('pos', FORMA_B, quando),
];

function estado(respostas: RespostaDaLicao[], extra: { topicId?: string; formaPre?: 'A' | 'B' | null; agora?: number } = {}) {
    return estadoDaLicao({
        topicId: extra.topicId ?? 'mda',
        respostas,
        questoes: QUESTOES,
        formaPre: extra.formaPre === undefined ? 'A' : extra.formaPre,
        agora: extra.agora ?? DIA_1,
    });
}

describe('cicloDaLicao', () => {
    it('é completo quando o tópico tem questões das formas A e B', () => {
        expect(cicloDaLicao(QUESTOES, 'mda')).toBe('completo');
    });

    it('é curto quando o tópico só tem prática', () => {
        expect(cicloDaLicao(QUESTOES, 'gdd')).toBe('curto');
    });

    it('com uma forma só, não há antes e depois: fica curto', () => {
        const semFormaB = QUESTOES.filter((x) => x.bloco !== 'forma_b');

        expect(cicloDaLicao(semFormaB, 'mda')).toBe('curto');
    });

    it('tópico sem questão não é lição', () => {
        expect(cicloDaLicao(QUESTOES, 'engine')).toBeNull();
    });
});

describe('estadoDaLicao, no ciclo completo', () => {
    it('sem resposta no tópico, a lição é nova', () => {
        expect(estado([])).toEqual({ tipo: 'nova' });
    });

    it('resposta de outro tópico não tira a lição de nova', () => {
        expect(estado([r('pratica', 'gdd_p1')])).toEqual({ tipo: 'nova' });
    });

    it('com o diagnóstico pela metade, diz quantas foram e qual é a próxima', () => {
        expect(estado([r('pre', 'mda_a1')])).toEqual({
            tipo: 'diagnostico',
            respondidas: 1,
            total: 3,
            proximaQuestaoId: 'mda_a2',
        });
    });

    it('quem tem a forma B faz o diagnóstico com as questões da forma B', () => {
        expect(estado([r('pre', 'mda_b1')], { formaPre: 'B' })).toMatchObject({
            tipo: 'diagnostico',
            respondidas: 1,
            proximaQuestaoId: 'mda_b2',
        });
    });

    it('diagnóstico completo leva ao estudo, que começa sem resposta de prática', () => {
        expect(estado(varias('pre', FORMA_A))).toEqual({
            tipo: 'estudo',
            respondidas: 0,
            total: 2,
            proximaQuestaoId: 'mda_p1',
        });
    });

    it('o diagnóstico não se pula: prática feita não adianta a lição com ele pela metade', () => {
        const respostas = [r('pre', 'mda_a1'), ...varias('pratica', PRATICA)];

        expect(estado(respostas)).toMatchObject({ tipo: 'diagnostico', respondidas: 1 });
    });

    it('a mesma questão respondida em outra fase não conta para o passo', () => {
        // As questões da forma A respondidas como prática não são o diagnóstico.
        expect(estado(varias('pratica', FORMA_A))).toMatchObject({ tipo: 'diagnostico', respondidas: 0 });
    });

    it('prática completa leva à verificação, com as questões da outra forma', () => {
        const respostas = [...varias('pre', FORMA_A), ...varias('pratica', PRATICA)];

        expect(estado(respostas)).toEqual({
            tipo: 'verificacao',
            respondidas: 0,
            total: 3,
            proximaQuestaoId: 'mda_b1',
        });
    });

    it('verificação completa: espera 7 dias de calendário pela revisão', () => {
        const liberaEm = inicioDoDia(diaDeCalendario(DIA_1) + 7);

        expect(estado(ateAVerificacao(), { agora: DIA_1 + 2 * DIA })).toEqual({
            tipo: 'aguardando_revisao',
            liberaEm,
            diasRestantes: 5,
        });
    });

    it('os 7 dias contam por dia de calendário, e não por 168 horas', () => {
        // Verificação às 23h de 06/10; a revisão abre à meia-noite de 13/10, em São Luís.
        const as23h = DIA_1 + 11 * HORA;
        const meiaNoiteDo7oDia = inicioDoDia(diaDeCalendario(as23h) + 7);

        expect(estado(ateAVerificacao(as23h), { agora: meiaNoiteDo7oDia - 1 })).toMatchObject({
            tipo: 'aguardando_revisao',
            diasRestantes: 1,
        });
        expect(estado(ateAVerificacao(as23h), { agora: meiaNoiteDo7oDia })).toMatchObject({ tipo: 'revisao' });
    });

    it('os 7 dias contam da última resposta da verificação', () => {
        const respostas = [
            ...varias('pre', FORMA_A),
            ...varias('pratica', PRATICA),
            r('pos', 'mda_b1', DIA_1),
            r('pos', 'mda_b2', DIA_1),
            r('pos', 'mda_b3', DIA_1 + DIA),
        ];

        expect(estado(respostas, { agora: DIA_1 + 7 * DIA })).toMatchObject({ tipo: 'aguardando_revisao', diasRestantes: 1 });
    });

    it('passados os 7 dias, a revisão fica disponível, com as questões da verificação', () => {
        expect(estado(ateAVerificacao(), { agora: DIA_1 + 7 * DIA })).toEqual({
            tipo: 'revisao',
            liberadaEm: inicioDoDia(diaDeCalendario(DIA_1) + 7),
            respondidas: 0,
            total: 3,
            proximaQuestaoId: 'mda_b1',
        });
    });

    it('a revisão não tem fim de janela: um mês depois continua disponível', () => {
        expect(estado(ateAVerificacao(), { agora: DIA_1 + 30 * DIA })).toMatchObject({ tipo: 'revisao' });
    });

    it('revisão pela metade continua sendo a revisão', () => {
        const respostas = [...ateAVerificacao(), r('reteste', 'mda_b1', DIA_1 + 7 * DIA)];

        expect(estado(respostas, { agora: DIA_1 + 7 * DIA })).toMatchObject({
            tipo: 'revisao',
            respondidas: 1,
            proximaQuestaoId: 'mda_b2',
        });
    });

    it('resposta de revisão dada antes da hora não abre a revisão', () => {
        const respostas = [...ateAVerificacao(), r('reteste', 'mda_b1', DIA_1 + DIA)];

        expect(estado(respostas, { agora: DIA_1 + 2 * DIA })).toMatchObject({ tipo: 'aguardando_revisao' });
    });

    it('revisão completa conclui a lição, no horário da última resposta', () => {
        const fim = DIA_1 + 8 * DIA;
        const respostas = [...ateAVerificacao(), ...varias('reteste', ['mda_b1', 'mda_b2'], DIA_1 + 7 * DIA), r('reteste', 'mda_b3', fim)];

        expect(estado(respostas, { agora: fim })).toEqual({ tipo: 'concluida', concluidaEm: fim });
    });

    it('sem a forma do participante, a lição fica em nova: não há como escolher o diagnóstico', () => {
        expect(estado([], { formaPre: null })).toEqual({ tipo: 'nova' });
    });
});

describe('estadoDaLicao, no ciclo curto', () => {
    const gdd = (respostas: RespostaDaLicao[], formaPre: 'A' | null = 'A') => estado(respostas, { topicId: 'gdd', formaPre });

    it('sem resposta, a lição é nova', () => {
        expect(gdd([])).toEqual({ tipo: 'nova' });
    });

    it('com a prática pela metade, está no estudo', () => {
        expect(gdd([r('pratica', 'gdd_p1')])).toEqual({
            tipo: 'estudo',
            respondidas: 1,
            total: 2,
            proximaQuestaoId: 'gdd_p2',
        });
    });

    it('prática completa conclui a lição, sem verificação nem revisão', () => {
        const fim = DIA_1 + HORA;

        expect(gdd([r('pratica', 'gdd_p1'), r('pratica', 'gdd_p2', fim)])).toEqual({ tipo: 'concluida', concluidaEm: fim });
    });

    it('não depende da forma do participante', () => {
        expect(gdd([r('pratica', 'gdd_p1')], null)).toMatchObject({ tipo: 'estudo', respondidas: 1 });
    });
});

describe('estadoDaLicao, sem conteúdo', () => {
    it('tópico sem questão é erro, e não lição concluída', () => {
        expect(() => estado([], { topicId: 'engine' })).toThrow('engine');
    });
});

describe('licoesDoAluno', () => {
    const licoes = (respostas: RespostaDaLicao[], topicos = ['mda', 'gdd'], agora = DIA_1) =>
        licoesDoAluno({ topicos, respostas, questoes: QUESTOES, formaPre: 'A', agora });

    it('devolve uma lição por tópico, na ordem recebida, com o ciclo de cada uma', () => {
        expect(licoes([], ['gdd', 'mda'])).toEqual([
            { topicId: 'gdd', ciclo: 'curto', estado: { tipo: 'nova' }, ultimaRespostaEm: null },
            { topicId: 'mda', ciclo: 'completo', estado: { tipo: 'nova' }, ultimaRespostaEm: null },
        ]);
    });

    it('guarda o horário da resposta mais recente de cada lição, de qualquer fase', () => {
        const respostas = [r('pre', 'mda_a1', DIA_1), r('pre', 'mda_a2', DIA_1 + HORA), r('pratica', 'gdd_p1', DIA_1 + 2 * HORA)];

        expect(licoes(respostas).map((l) => l.ultimaRespostaEm)).toEqual([DIA_1 + HORA, DIA_1 + 2 * HORA]);
    });

    it('tópico sem questão fica fora da lista', () => {
        expect(licoes([], ['mda', 'engine', 'gdd']).map((l) => l.topicId)).toEqual(['mda', 'gdd']);
    });

    it('conteúdo sem nenhuma lição é erro, e não lista vazia', () => {
        expect(() => licoes([], ['engine'])).toThrow();
    });
});

// A prova da Fase 1: quem fez o roteiro antigo (pré, prática e pós gerais, e depois um tópico
// da trilha por dia) é lido pelo modelo novo sem migração, porque a fase está em cada resposta.
describe('conta do roteiro antigo, lida pelo modelo novo', () => {
    const MEDIDOS = ['mda', 'pixel', 'engine', 'logica'];
    const TRILHA = ['gdd', 'ux', 'som'];
    const questoes: QuestaoDaLicao[] = [
        ...MEDIDOS.flatMap((t) => [
            ...[1, 2, 3].map((n) => q(`${t}_a${n}`, 'forma_a')),
            ...[1, 2, 3].map((n) => q(`${t}_b${n}`, 'forma_b')),
            ...[1, 2, 3, 4].map((n) => q(`${t}_p${n}`, 'pratica')),
        ]),
        ...TRILHA.flatMap((t) => [1, 2].map((n) => q(`${t}_p${n}`, 'pratica'))),
    ];
    const ids = (bloco: BlocoQuestao, topicos: string[]) =>
        questoes.filter((x) => x.bloco === bloco && topicos.includes(x.topicId)).map((x) => x.id);

    // Dia 1: pré de 12 questões, prática dos quatro tópicos e pós de 12. Depois, GDD e UX/UI.
    const respostas: RespostaDaLicao[] = [
        ...varias('pre', ids('forma_a', MEDIDOS), DIA_1),
        ...varias('pratica', ids('pratica', MEDIDOS), DIA_1 + HORA),
        ...varias('pos', ids('forma_b', MEDIDOS), DIA_1 + 2 * HORA),
        ...varias('pratica', ids('pratica', ['gdd']), DIA_1 + 2 * DIA),
        ...varias('pratica', ids('pratica', ['ux']), DIA_1 + 3 * DIA),
    ];

    it('os quatro tópicos medidos aguardam a revisão, e os da trilha feitos estão concluídos', () => {
        const licoes = licoesDoAluno({
            topicos: [...MEDIDOS, ...TRILHA],
            respostas,
            questoes,
            formaPre: 'A',
            agora: DIA_1 + 3 * DIA,
        });

        expect(licoes.map((l) => [l.topicId, l.estado.tipo])).toEqual([
            ['mda', 'aguardando_revisao'],
            ['pixel', 'aguardando_revisao'],
            ['engine', 'aguardando_revisao'],
            ['logica', 'aguardando_revisao'],
            ['gdd', 'concluida'],
            ['ux', 'concluida'],
            ['som', 'nova'],
        ]);
        expect(licoes[0].estado).toMatchObject({ diasRestantes: 4 });
    });
});
