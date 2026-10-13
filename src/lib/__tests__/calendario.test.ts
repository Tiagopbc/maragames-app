import { dataEmSaoLuis, meiaNoiteDe } from '../calendario';

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

describe('meiaNoiteDe', () => {
    it('é o instante em que o dia começa em São Luís', () => {
        expect(meiaNoiteDe('2026-10-30')).toBe(em('2026-10-30 00:00'));
    });

    it('recusa o dia que não existe, em vez de pular para o mês seguinte', () => {
        // O `Date` transforma 31 de fevereiro em 3 de março sem avisar.
        expect(meiaNoiteDe('2026-02-31')).toBeNull();
        expect(meiaNoiteDe('2026-13-01')).toBeNull();
    });

    it('aceita 29 de fevereiro só em ano bissexto', () => {
        expect(meiaNoiteDe('2028-02-29')).toBe(em('2028-02-29 00:00'));
        expect(meiaNoiteDe('2026-02-29')).toBeNull();
    });

    it('recusa o que não está escrito como AAAA-MM-DD', () => {
        expect(meiaNoiteDe('30/10/2026')).toBeNull();
        expect(meiaNoiteDe('2026-10-30T12:00')).toBeNull();
        expect(meiaNoiteDe('')).toBeNull();
    });
});
