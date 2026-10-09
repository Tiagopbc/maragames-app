// Regras da tela da pergunta (item 25): o que precisa estar marcado para confirmar, o evento
// que a confirmação gera e o que o feedback da prática mostra.
// Funções puras: sem React, sem Firebase, sem estado.

import type { Answer, Confianca, Fase, NovaResposta, Question } from '../types/domain';
import { quadranteDe, type Quadrante } from './quadrante';
import { xpDaResposta } from './xp';

// Alternativa e confiança são seleções independentes, marcadas em qualquer ordem.
// Nada disso é gravado: só a confirmação vira evento em `answers`.
export interface Selecao {
    escolha: string | null; // id da alternativa
    confianca: Confianca | null;
}

export type SelecaoCompleta = { escolha: string; confianca: Confianca };

export const SELECAO_VAZIA: Selecao = { escolha: null, confianca: null };

// Não existe "em branco": sem as duas seleções não há o que confirmar, e não há como pular.
export function podeConfirmar(selecao: Selecao): selecao is SelecaoCompleta {
    return selecao.escolha !== null && selecao.confianca !== null;
}

export type Falta = 'alternativa_e_confianca' | 'alternativa' | 'confianca';

/** O que ainda falta marcar, para a tela explicar por que o Confirmar está apagado. */
export function oQueFalta(selecao: Selecao): Falta | null {
    if (selecao.escolha === null) return selecao.confianca === null ? 'alternativa_e_confianca' : 'alternativa';
    return selecao.confianca === null ? 'confianca' : null;
}

// Nos blocos medidos (pré, pós e reteste) nada aparece por questão: feedback ensinaria e
// contaminaria a medida, e o XP revelaria o acerto (itens 14 e 19).
export function faseTemFeedback(fase: Fase): boolean {
    return fase === 'pratica';
}

type QuestaoRespondida = Pick<Question, 'id' | 'topicId' | 'alternativas'>;

export interface EntradaDaResposta extends SelecaoCompleta {
    uid: string;
    attemptId: string;
    fase: Fase;
    questao: QuestaoRespondida;
    ordemExibida: readonly string[]; // ids das alternativas, na ordem em que apareceram
    tempoMs: number; // de quando a questão apareceu até o Confirmar
}

/** O evento que a confirmação gera. `correta` é conferida aqui, no aparelho (item 5). */
export function montarResposta(entrada: EntradaDaResposta): NovaResposta {
    const { questao, escolha } = entrada;
    const alternativa = questao.alternativas.find((a) => a.id === escolha);
    if (!alternativa) throw new Error(`A alternativa "${escolha}" não é da questão ${questao.id}.`);

    return {
        uid: entrada.uid,
        questionId: questao.id,
        topicId: questao.topicId,
        attemptId: entrada.attemptId,
        fase: entrada.fase,
        escolha,
        ordemExibida: [...entrada.ordemExibida],
        correta: alternativa.correta,
        confianca: entrada.confianca,
        tempoMs: Math.max(0, Math.round(entrada.tempoMs)),
    };
}

export interface Feedback {
    correta: boolean;
    quadrante: Quadrante;
    xp: number;
    corretaId: string;
    explicacaoDaEscolha: string;
    explicacaoDaCorreta: string | null; // só quando errou; no acerto é a mesma da escolha
}

/** O que a prática mostra depois de confirmar. Calculado da resposta, nunca gravado. */
export function feedbackDaResposta(
    questao: Pick<Question, 'id' | 'alternativas'>,
    resposta: Pick<Answer, 'escolha' | 'confianca'>
): Feedback {
    const escolhida = questao.alternativas.find((a) => a.id === resposta.escolha);
    const certa = questao.alternativas.find((a) => a.correta);
    if (!escolhida || !certa) throw new Error(`Questão ${questao.id} sem a alternativa escolhida ou sem gabarito.`);

    return {
        correta: escolhida.correta,
        quadrante: quadranteDe(escolhida.correta, resposta.confianca),
        xp: xpDaResposta(escolhida.correta, resposta.confianca),
        corretaId: certa.id,
        explicacaoDaEscolha: escolhida.explicacao,
        explicacaoDaCorreta: escolhida.correta ? null : certa.explicacao,
    };
}
