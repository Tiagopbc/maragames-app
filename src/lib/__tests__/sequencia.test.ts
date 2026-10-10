import type { Fase } from '../../types/domain';
import { sequenciaDeDias } from '../sequencia';

function em(dataHora: string): number {
    return Date.parse(`${dataHora.replace(' ', 'T')}:00-03:00`);
}

// O pós-teste terminou na sexta, 30/10, à noite: é o dia 1.

function r(questionId: string, quando: string, fase: Fase = 'pratica') {
    return { questionId, fase, respondidaEm: em(quando) };
}

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
