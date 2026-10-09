import type { Fase } from '../../types/domain';
import { estadoDaTrilha, semanaDoPiloto, sequenciaDeDias, type EntradaDaTrilha, type QuestaoDaTrilha } from '../trilha';

// Três tópicos da trilha, duas questões de prática cada.
const QUESTOES: QuestaoDaTrilha[] = ['gdd', 'ux', 'som'].flatMap((topicId) => [
    { id: `${topicId}_1`, topicId, bloco: 'pratica' as const },
    { id: `${topicId}_2`, topicId, bloco: 'pratica' as const },
]);

/** Horário de São Luís (UTC−3) em milissegundos. Ex.: em('2026-10-30 20:00'). */
function em(dataHora: string): number {
    return Date.parse(`${dataHora.replace(' ', 'T')}:00-03:00`);
}

// O pós-teste terminou na sexta, 30/10, à noite: é o dia 1.
const FIM_DO_POS = em('2026-10-30 20:00');

function r(questionId: string, quando: string, fase: Fase = 'pratica') {
    return { questionId, fase, respondidaEm: em(quando) };
}

function entrada(parcial: Partial<EntradaDaTrilha> = {}): EntradaDaTrilha {
    return {
        respostas: [],
        questoes: QUESTOES,
        topicos: ['gdd', 'ux', 'som'],
        fimDoPos: FIM_DO_POS,
        agora: em('2026-10-31 10:00'),
        ...parcial,
    };
}

describe('estadoDaTrilha: a fila dos tópicos', () => {
    it('antes de o pós terminar, a trilha está fechada', () => {
        expect(estadoDaTrilha(entrada({ fimDoPos: null }))).toEqual({ tipo: 'fechada' });
    });

    it('sem tópicos de trilha no conteúdo, está fechada', () => {
        expect(estadoDaTrilha(entrada({ topicos: [] }))).toEqual({ tipo: 'fechada' });
    });

    it('no dia do pós, o primeiro tópico só libera amanhã', () => {
        expect(estadoDaTrilha(entrada({ agora: em('2026-10-30 21:00') }))).toEqual({
            tipo: 'amanha',
            topicId: 'gdd',
            liberaEm: em('2026-10-31 00:00'),
            feitoHoje: null,
            posicao: 1,
            de: 3,
        });
    });

    it('no dia seguinte ao pós, o primeiro tópico é o de hoje', () => {
        expect(estadoDaTrilha(entrada())).toEqual({
            tipo: 'hoje',
            topicId: 'gdd',
            respondidas: 0,
            total: 2,
            posicao: 1,
            de: 3,
        });
    });

    it('à meia-noite de São Luís o tópico já está liberado; um minuto antes, não', () => {
        expect(estadoDaTrilha(entrada({ agora: em('2026-10-30 23:59') })).tipo).toBe('amanha');
        expect(estadoDaTrilha(entrada({ agora: em('2026-10-31 00:00') })).tipo).toBe('hoje');
    });

    it('tópico começado continua sendo o de hoje, com o que já foi respondido', () => {
        const respostas = [r('gdd_1', '2026-10-31 10:05')];

        expect(estadoDaTrilha(entrada({ respostas, agora: em('2026-10-31 10:06') }))).toMatchObject({
            tipo: 'hoje',
            topicId: 'gdd',
            respondidas: 1,
            total: 2,
        });
    });

    it('terminado o tópico de hoje, o próximo só libera amanhã', () => {
        const respostas = [r('gdd_1', '2026-10-31 10:05'), r('gdd_2', '2026-10-31 10:07')];

        expect(estadoDaTrilha(entrada({ respostas, agora: em('2026-10-31 10:08') }))).toEqual({
            tipo: 'amanha',
            topicId: 'ux',
            liberaEm: em('2026-11-01 00:00'),
            feitoHoje: 'gdd',
            posicao: 2,
            de: 3,
        });
    });

    it('no dia seguinte à conclusão, o próximo tópico é o de hoje', () => {
        const respostas = [r('gdd_1', '2026-10-31 10:05'), r('gdd_2', '2026-10-31 10:07')];

        expect(estadoDaTrilha(entrada({ respostas, agora: em('2026-11-01 08:00') }))).toMatchObject({
            tipo: 'hoje',
            topicId: 'ux',
            respondidas: 0,
            posicao: 2,
        });
    });

    // Ninguém perde conteúdo: quem some por uns dias encontra o próximo tópico esperando.
    it('quem pula dias encontra o mesmo tópico esperando', () => {
        expect(estadoDaTrilha(entrada({ agora: em('2026-11-04 09:00') }))).toMatchObject({ tipo: 'hoje', topicId: 'gdd' });
    });

    // O dia que vale é o da conclusão, não o do começo: terminar hoje um tópico de ontem
    // deixa o próximo para amanhã.
    it('tópico começado num dia e terminado no outro libera o próximo no dia seguinte ao fim', () => {
        const respostas = [r('gdd_1', '2026-10-31 23:50'), r('gdd_2', '2026-11-01 00:10')];

        expect(estadoDaTrilha(entrada({ respostas, agora: em('2026-11-01 00:11') }))).toMatchObject({
            tipo: 'amanha',
            topicId: 'ux',
            liberaEm: em('2026-11-02 00:00'),
            feitoHoje: 'gdd',
        });
    });

    it('com todos os tópicos feitos, a trilha está concluída', () => {
        const respostas = [
            r('gdd_1', '2026-10-31 10:00'),
            r('gdd_2', '2026-10-31 10:01'),
            r('ux_1', '2026-11-01 10:00'),
            r('ux_2', '2026-11-01 10:01'),
            r('som_1', '2026-11-02 10:00'),
            r('som_2', '2026-11-02 10:01'),
        ];

        expect(estadoDaTrilha(entrada({ respostas, agora: em('2026-11-02 10:02') }))).toEqual({ tipo: 'concluida' });
    });

    it('só a prática do tópico conta: resposta de outra fase não conclui nada', () => {
        const respostas = [r('gdd_1', '2026-10-31 10:00', 'pos'), r('gdd_2', '2026-10-31 10:01', 'pos')];

        expect(estadoDaTrilha(entrada({ respostas }))).toMatchObject({ tipo: 'hoje', topicId: 'gdd', respondidas: 0 });
    });

    it('tópico sem questão de prática é pulado, para a fila não travar nele', () => {
        expect(estadoDaTrilha(entrada({ topicos: ['vazio', 'gdd'] }))).toMatchObject({ tipo: 'hoje', topicId: 'gdd' });
    });
});

describe('sequenciaDeDias', () => {
    const DIA_1 = [r('q1', '2026-10-30 19:00', 'pre'), r('q2', '2026-10-30 20:00', 'pos')];

    it('sem resposta nenhuma, é zero', () => {
        expect(sequenciaDeDias([], em('2026-10-30 12:00'))).toBe(0);
    });

    it('o dia 1 conta: várias respostas no mesmo dia valem um dia', () => {
        expect(sequenciaDeDias(DIA_1, em('2026-10-30 21:00'))).toBe(1);
    });

    it('no dia seguinte, antes de responder, a sequência de ontem continua valendo', () => {
        expect(sequenciaDeDias(DIA_1, em('2026-10-31 09:00'))).toBe(1);
    });

    it('respondendo no dia seguinte, sobe para 2', () => {
        const respostas = [...DIA_1, r('gdd_1', '2026-10-31 09:05')];

        expect(sequenciaDeDias(respostas, em('2026-10-31 09:06'))).toBe(2);
    });

    it('pulou um dia inteiro: zera', () => {
        expect(sequenciaDeDias(DIA_1, em('2026-11-01 09:00'))).toBe(0);
    });

    it('depois de zerar, recomeça do 1', () => {
        const respostas = [...DIA_1, r('gdd_1', '2026-11-02 09:00')];

        expect(sequenciaDeDias(respostas, em('2026-11-02 09:01'))).toBe(1);
    });

    it('conta só os dias seguidos mais recentes', () => {
        const respostas = [
            r('a', '2026-10-27 10:00'),
            r('b', '2026-10-28 10:00'),
            // 29/10 pulado
            r('c', '2026-10-30 10:00'),
            r('d', '2026-10-31 10:00'),
            r('e', '2026-11-01 10:00'),
        ];

        expect(sequenciaDeDias(respostas, em('2026-11-01 11:00'))).toBe(3);
    });

    it('o dia vira à meia-noite de São Luís, não do UTC', () => {
        // 22:00 de 30/10 em São Luís já é 31/10 no UTC; continua sendo o mesmo dia do pós.
        const respostas = [r('a', '2026-10-30 22:00'), r('b', '2026-10-31 00:30')];

        expect(sequenciaDeDias(respostas, em('2026-10-31 00:31'))).toBe(2);
    });
});

describe('semanaDoPiloto', () => {
    it('mostra sete dias a partir do dia do pós, marcando os dias com resposta e o de hoje', () => {
        const respostas = [r('a', '2026-10-30 20:00', 'pos'), r('b', '2026-10-31 10:00')];

        const semana = semanaDoPiloto(respostas, FIM_DO_POS, em('2026-10-31 10:01'));

        expect(semana).toHaveLength(7);
        // 30/10/2026 é sexta (5).
        expect(semana.map((d) => d.diaDaSemana)).toEqual([5, 6, 0, 1, 2, 3, 4]);
        expect(semana.map((d) => d.ativo)).toEqual([true, true, false, false, false, false, false]);
        expect(semana.map((d) => d.hoje)).toEqual([false, true, false, false, false, false, false]);
    });

    it('dia pulado fica vazio', () => {
        const respostas = [r('a', '2026-10-30 20:00', 'pos'), r('b', '2026-11-01 10:00')];

        expect(semanaDoPiloto(respostas, FIM_DO_POS, em('2026-11-01 10:01')).map((d) => d.ativo)).toEqual([
            true,
            false,
            true,
            false,
            false,
            false,
            false,
        ]);
    });

    it('passados os sete dias, a janela anda para terminar em hoje', () => {
        const semana = semanaDoPiloto([], FIM_DO_POS, em('2026-11-10 10:00'));

        expect(semana).toHaveLength(7);
        expect(semana[6].hoje).toBe(true);
        expect(semana.filter((d) => d.hoje)).toHaveLength(1);
    });
});
