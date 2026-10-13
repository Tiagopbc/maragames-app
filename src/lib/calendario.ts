// O dia de calendário do app, num fuso fixo. Funções puras: sem React, sem Firebase, sem estado.
// Os 7 dias da revisão, a sequência de dias e as datas mostradas na tela contam por aqui.

// Dia de calendário em São Luís (UTC−3, sem horário de verão), fixo para não depender
// do fuso configurado no aparelho.
const DIA_MS = 24 * 60 * 60 * 1000;
export const FUSO_MS = -3 * 60 * 60 * 1000;

/** Número do dia de calendário de um instante, no fuso fixo do app. */
export function diaDeCalendario(ms: number): number {
    return Math.floor((ms + FUSO_MS) / DIA_MS);
}

/** O instante em que um dia de calendário começa (meia-noite em São Luís). */
export function inicioDoDia(dia: number): number {
    return dia * DIA_MS - FUSO_MS;
}

/**
 * A meia-noite de um dia escrito como AAAA-MM-DD, em São Luís. Devolve null se o texto não está
 * nesse formato ou se o dia não existe: o `Date` aceitaria 31 de fevereiro e devolveria 3 de março.
 */
export function meiaNoiteDe(data: string): number | null {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
    if (!partes) return null;
    const [ano, mes, dia] = partes.slice(1).map(Number);
    const ms = Date.UTC(ano, mes - 1, dia) - FUSO_MS;
    const lido = dataEmSaoLuis(ms);
    return lido.ano === ano && lido.mes === mes && lido.dia === dia ? ms : null;
}

/** Dia da semana (0 = domingo), dia, mês e ano de um instante, no mesmo fuso fixo do app. */
export function dataEmSaoLuis(ms: number): { diaDaSemana: number; dia: number; mes: number; ano: number } {
    const local = new Date(ms + FUSO_MS);
    return {
        diaDaSemana: local.getUTCDay(),
        dia: local.getUTCDate(),
        mes: local.getUTCMonth() + 1,
        ano: local.getUTCFullYear(),
    };
}
