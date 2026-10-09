// XP pela pontuação por certeza de Gardner-Medwin para mais de duas opções (item 14).
// Função pura: sem React, sem Firebase, sem estado. O XP nunca é gravado, é calculado de `answers`.

import type { Answer, Confianca, Fase } from '../types/domain';
import type { Etapa } from './roteiro';

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

// Em que etapas do roteiro cada bloco medido já está concluído. A prática não aparece aqui:
// o feedback dela sai questão a questão, então ela conta sempre.
const CONCLUIDO_EM: Record<Exclude<Fase, 'pratica'>, readonly Etapa['tipo'][]> = {
    pre: ['estudo', 'pos', 'espera', 'reteste', 'sus', 'concluido'],
    pos: ['espera', 'reteste', 'sus', 'concluido'],
    reteste: ['sus', 'concluido'],
};

/**
 * O total que a home mostra, ou null enquanto nada conta. Bloco medido só entra depois de
 * concluído: com ele pela metade, o total mudando a cada questão revelaria o acerto (itens 14 e 19).
 * `respostas` vem da mais antiga para a mais recente; cada questão conta uma vez por fase, pela
 * resposta mais recente, como no resultado do bloco. O piso em 0 vale só aqui, no acumulado.
 */
export function xpAcumulado(
    respostas: readonly Pick<Answer, 'fase' | 'questionId' | 'correta' | 'confianca'>[],
    etapa: Etapa['tipo']
): number | null {
    const ultimaPorQuestao = new Map<string, Pick<Answer, 'correta' | 'confianca'>>();
    for (const r of respostas) {
        if (r.fase !== 'pratica' && !CONCLUIDO_EM[r.fase].includes(etapa)) continue;
        ultimaPorQuestao.set(`${r.fase}|${r.questionId}`, r);
    }
    if (ultimaPorQuestao.size === 0) return null;

    return Math.max(0, somarXp([...ultimaPorQuestao.values()]));
}
