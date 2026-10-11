// Quais questões entram em cada bloco e quais ainda faltam responder (itens 19 e 22).
// Funções puras: sem React, sem Firebase, sem estado. O progresso nunca é gravado, sai de `answers`.

import type { Answer, BlocoQuestao, Fase, FormaPre, Question } from '../types/domain';

export type QuestaoDoBloco = Pick<Question, 'id' | 'topicId' | 'bloco'>;
export type RespostaDoBloco = Pick<Answer, 'questionId' | 'fase'>;

// Blocos sem feedback por questão: o diagnóstico, a verificação e a revisão de uma lição.
export type FaseMedida = Exclude<Fase, 'pratica'>;

const BLOCO_DA_FORMA: Record<FormaPre, BlocoQuestao> = { A: 'forma_a', B: 'forma_b' };

/**
 * Questões de um bloco medido, na ordem dos tópicos do roteiro. O pré usa a forma inicial do
 * participante; o pós usa a outra, e o reteste repete as do pós. Dentro de cada tópico vale a
 * ordem em que as questões chegam, que o repositório já entrega pronta.
 */
export function questoesDoBlocoMedido<T extends QuestaoDoBloco>(
    questoes: readonly T[],
    fase: FaseMedida,
    topicos: readonly string[],
    formaPre: FormaPre
): T[] {
    const forma: FormaPre = fase === 'pre' ? formaPre : formaPre === 'A' ? 'B' : 'A';
    const bloco = BLOCO_DA_FORMA[forma];
    return topicos.flatMap((topicId) => questoes.filter((q) => q.bloco === bloco && q.topicId === topicId));
}

export function questoesDaPratica<T extends QuestaoDoBloco>(questoes: readonly T[], topicId: string): T[] {
    return questoes.filter((q) => q.bloco === 'pratica' && q.topicId === topicId);
}

/** Questões do bloco que ainda não têm resposta nesta fase, na mesma ordem. */
export function pendentes<T extends Pick<Question, 'id'>>(
    questoes: readonly T[],
    respostas: readonly RespostaDoBloco[],
    fase: Fase
): T[] {
    const respondidas = new Set(respostas.filter((r) => r.fase === fase).map((r) => r.questionId));
    return questoes.filter((q) => !respondidas.has(q.id));
}

