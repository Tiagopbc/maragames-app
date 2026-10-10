import { dataEmSaoLuis } from '../calendario';

/** Horário de São Luís (UTC−3) em milissegundos. Ex.: em('2026-10-30 20:00'). */
function em(dataHora: string): number {
    return Date.parse(`${dataHora.replace(' ', 'T')}:00-03:00`);
}

describe('dataEmSaoLuis', () => {
    it('dá o dia da semana, o dia, o mês e o ano no fuso de São Luís', () => {
        // 06/11/2026 é uma sexta-feira (0 = domingo).
        expect(dataEmSaoLuis(em('2026-11-06 00:00'))).toEqual({ diaDaSemana: 5, dia: 6, mes: 11, ano: 2026 });
    });

    it('às 23:30 ainda é o mesmo dia, mesmo que no UTC já seja o seguinte', () => {
        expect(dataEmSaoLuis(em('2026-10-31 23:30'))).toEqual({ diaDaSemana: 6, dia: 31, mes: 10, ano: 2026 });
    });

    it('à meia-noite já é o dia seguinte', () => {
        expect(dataEmSaoLuis(em('2026-11-01 00:00'))).toEqual({ diaDaSemana: 0, dia: 1, mes: 11, ano: 2026 });
    });
});
