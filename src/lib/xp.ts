// XP pela pontuação por certeza de Gardner-Medwin para mais de duas opções (item 14).
// Função pura: sem React, sem Firebase, sem estado. O XP nunca é gravado, é calculado de `answers`.

import type { Answer, Confianca } from '../types/domain';

// Dúvida compensa a partir de 50% de chance de acerto e certeza a partir de 75%;
// abaixo disso, palpite rende mais e nunca perde ponto.
const XP_ACERTO: Record<Confianca, number> = { 1: 1, 2: 2, 3: 3 };
const XP_ERRO: Record<Confianca, number> = { 1: 0, 2: -1, 3: -4 };

export function xpDaResposta(correta: boolean, confianca: Confianca): number {
    return correta ? XP_ACERTO[confianca] : XP_ERRO[confianca];
}

/** Saldo do conjunto de respostas. Pode ser negativo: o piso do total exibido é decisão da tela (item 24). */
export function somarXp(respostas: readonly Pick<Answer, 'correta' | 'confianca'>[]): number {
    return respostas.reduce((saldo, r) => saldo + xpDaResposta(r.correta, r.confianca), 0);
}
