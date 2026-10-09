// Etapa do roteiro do piloto, calculada a partir das respostas (item 22).
// Função pura: sem React, sem Firebase, sem estado. A etapa nunca é gravada, então não
// tem como contradizer `answers`, e voltar no meio de um bloco sai de graça.

import type { Answer, Fase, FormaPre, Question } from '../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from './bloco';

export type QuestaoDoRoteiro = Pick<Question, 'id' | 'topicId' | 'bloco'>;
export type RespostaDoRoteiro = Pick<Answer, 'questionId' | 'fase' | 'respondidaEm'>;

export interface EntradaDoRoteiro {
    respostas: readonly RespostaDoRoteiro[];
    questoes: readonly QuestaoDoRoteiro[]; // dentro de cada tópico, já na ordem de exibição
    topicos: readonly string[]; // ids dos tópicos medidos, na ordem do roteiro
    formaPre: FormaPre | null; // users/{uid}.formaPre
    consentiuEm: number | null; // users/{uid}.consentiuEm
    susRespondidoEm: number | null; // users/{uid}.susRespondidoEm
    agora: number; // ms; vem de fora para a função continuar pura
}

interface Progresso {
    respondidas: number;
    total: number;
    proximaQuestaoId: string;
}

// Cartão e relatório não são etapas: vê-los não gera evento em `answers`. A tela mostra o
// cartão quando o estudo do tópico tem zero respondidas, e o resultado do dia 1 a partir da espera.
export type Etapa =
    | { tipo: 'consentimento' }
    | ({ tipo: 'pre' } & Progresso)
    | ({ tipo: 'estudo'; topicId: string } & Progresso)
    | ({ tipo: 'pos' } & Progresso)
    // `liberaEm` é o começo do dia em que o reteste abre; `ultimoDiaEm`, o do último dia da janela.
    | { tipo: 'espera'; liberaEm: number; ultimoDiaEm: number; diasRestantes: number }
    | ({ tipo: 'reteste'; foraDaJanela: boolean } & Progresso)
    | { tipo: 'sus' }
    | { tipo: 'concluido' };

// Reteste do dia 7 ao dia 9, em dias de calendário contados a partir do dia do pós.
export const DIAS_ATE_RETESTE = 7;
export const ULTIMO_DIA_DA_JANELA = 9;

// Dia de calendário em São Luís (UTC−3, sem horário de verão), fixo para não depender
// do fuso configurado no aparelho.
const DIA_MS = 24 * 60 * 60 * 1000;
export const FUSO_MS = -3 * 60 * 60 * 1000;

/** Número do dia de calendário de um instante, no fuso fixo do roteiro. */
export function diaDeCalendario(ms: number): number {
    return Math.floor((ms + FUSO_MS) / DIA_MS);
}

/** O instante em que um dia de calendário começa (meia-noite em São Luís). */
export function inicioDoDia(dia: number): number {
    return dia * DIA_MS - FUSO_MS;
}

/** Dia da semana (0 = domingo), dia e mês de um instante, no mesmo fuso fixo do roteiro. */
export function dataEmSaoLuis(ms: number): { diaDaSemana: number; dia: number; mes: number } {
    const local = new Date(ms + FUSO_MS);
    return { diaDaSemana: local.getUTCDay(), dia: local.getUTCDate(), mes: local.getUTCMonth() + 1 };
}

/**
 * Quando o pós-teste terminou: o horário da última resposta dele, ou null enquanto falta
 * questão (ou enquanto não há forma). É de onde a trilha diária começa a contar (item 23).
 */
export function terminoDoPos(
    entrada: Pick<EntradaDoRoteiro, 'respostas' | 'questoes' | 'topicos' | 'formaPre'>
): number | null {
    const { respostas, questoes, topicos, formaPre } = entrada;
    if (formaPre === null) return null;

    const ids = questoesDoBlocoMedido(questoes, 'pos', topicos, formaPre).map((q) => q.id);
    const horarios = new Map<string, number>();
    for (const r of respostas) {
        if (r.fase === 'pos' && ids.includes(r.questionId)) {
            horarios.set(r.questionId, Math.max(horarios.get(r.questionId) ?? 0, r.respondidaEm));
        }
    }
    if (ids.length === 0 || horarios.size < ids.length) return null;
    return Math.max(...horarios.values());
}

export function etapaDoRoteiro(entrada: EntradaDoRoteiro): Etapa {
    const { respostas, questoes, topicos, formaPre, consentiuEm, susRespondidoEm, agora } = entrada;

    if (consentiuEm === null || formaPre === null) return { tipo: 'consentimento' };

    // Quais questões entram em cada fase é regra de src/lib/bloco.ts, a mesma que a tela da pergunta usa.
    const idsDoPre = questoesDoBlocoMedido(questoes, 'pre', topicos, formaPre).map((q) => q.id);
    const idsDoPos = questoesDoBlocoMedido(questoes, 'pos', topicos, formaPre).map((q) => q.id);
    // Sem questões, todo bloco pareceria concluído e o participante pularia a medição.
    if (idsDoPre.length === 0 || idsDoPos.length === 0) {
        throw new Error('Roteiro sem questões nos blocos medidos: o conteúdo não foi carregado.');
    }

    // Progresso de um bloco numa fase, ou null quando todas as questões já têm resposta nessa fase.
    const progresso = (fase: Fase, ids: string[]): Progresso | null => {
        const respondidasNaFase = new Set(respostas.filter((r) => r.fase === fase).map((r) => r.questionId));
        const proximaQuestaoId = ids.find((id) => !respondidasNaFase.has(id));
        if (proximaQuestaoId === undefined) return null;
        return {
            respondidas: ids.filter((id) => respondidasNaFase.has(id)).length,
            total: ids.length,
            proximaQuestaoId,
        };
    };

    const pre = progresso('pre', idsDoPre);
    if (pre) return { tipo: 'pre', ...pre };

    for (const topicId of topicos) {
        const pratica = progresso(
            'pratica',
            questoesDaPratica(questoes, topicId).map((q) => q.id)
        );
        if (pratica) return { tipo: 'estudo', topicId, ...pratica };
    }

    const pos = progresso('pos', idsDoPos);
    if (pos) return { tipo: 'pos', ...pos };

    const reteste = progresso('reteste', idsDoPos);
    if (reteste) {
        const fimDoPos = Math.max(
            ...respostas.filter((r) => r.fase === 'pos' && idsDoPos.includes(r.questionId)).map((r) => r.respondidaEm)
        );
        const diaDoPos = diaDeCalendario(fimDoPos);
        const hoje = diaDeCalendario(agora);
        const diaDaLiberacao = diaDoPos + DIAS_ATE_RETESTE;

        if (hoje < diaDaLiberacao) {
            return {
                tipo: 'espera',
                liberaEm: inicioDoDia(diaDaLiberacao),
                ultimoDiaEm: inicioDoDia(diaDoPos + ULTIMO_DIA_DA_JANELA),
                diasRestantes: diaDaLiberacao - hoje,
            };
        }
        return { tipo: 'reteste', foraDaJanela: hoje > diaDoPos + ULTIMO_DIA_DA_JANELA, ...reteste };
    }

    return susRespondidoEm === null ? { tipo: 'sus' } : { tipo: 'concluido' };
}
