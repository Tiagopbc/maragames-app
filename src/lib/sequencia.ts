// A sequência de dias (item 23): quantos dias de calendário seguidos o aluno respondeu.
// Função pura: sem React, sem Firebase, sem estado. Nada aqui é gravado: sai de `answers`, e o
// horário atual entra como parâmetro.

import type { Answer } from '../types/domain';
import { diaDeCalendario } from './roteiro';

/**
 * Dias seguidos com pelo menos uma resposta confirmada, de qualquer fase. Antes de responder
 * hoje, a sequência que vinha até ontem continua valendo; um dia inteiro sem resposta zera.
 */
export function sequenciaDeDias(respostas: readonly Pick<Answer, 'respondidaEm'>[], agora: number): number {
    const dias = new Set(respostas.map((r) => diaDeCalendario(r.respondidaEm)));
    const hoje = diaDeCalendario(agora);

    let dia = dias.has(hoje) ? hoje : hoje - 1;
    let sequencia = 0;
    while (dias.has(dia)) {
        sequencia += 1;
        dia -= 1;
    }
    return sequencia;
}
