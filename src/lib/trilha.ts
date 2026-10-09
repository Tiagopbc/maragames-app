// Trilha diária (item 23): depois do pós-teste, um tópico novo por dia, fora da medição.
// Funções puras: sem React, sem Firebase, sem estado. Nada aqui é gravado: a fila dos tópicos
// e a sequência de dias saem de `answers`, e o horário atual entra como parâmetro.

import type { Answer, Question } from '../types/domain';
import { questoesDaPratica } from './bloco';
import { dataEmSaoLuis, diaDeCalendario, inicioDoDia } from './roteiro';

export type QuestaoDaTrilha = Pick<Question, 'id' | 'topicId' | 'bloco'>;
export type RespostaDaTrilha = Pick<Answer, 'questionId' | 'fase' | 'respondidaEm'>;

export interface EntradaDaTrilha {
    respostas: readonly RespostaDaTrilha[];
    questoes: readonly QuestaoDaTrilha[];
    topicos: readonly string[]; // ids dos tópicos da trilha, na ordem de apresentação
    fimDoPos: number | null; // ms da última resposta do pós; null enquanto o pós não terminou
    agora: number; // ms; vem de fora para a função continuar pura
}

// `posicao` e `de` contam os tópicos da trilha: "tópico 2 de 5".
export type Trilha =
    | { tipo: 'fechada' } // o pós ainda não terminou, ou o conteúdo não tem tópicos de trilha
    | { tipo: 'hoje'; topicId: string; respondidas: number; total: number; posicao: number; de: number }
    // O próximo tópico só abre amanhã. `feitoHoje` é o que a pessoa terminou hoje, se terminou.
    | { tipo: 'amanha'; topicId: string; liberaEm: number; feitoHoje: string | null; posicao: number; de: number }
    | { tipo: 'concluida' };

/**
 * Em que ponto da trilha a pessoa está. Uma regra só decide a fila: o próximo tópico abre no
 * dia de calendário seguinte ao da conclusão do anterior (o primeiro, no dia seguinte ao do
 * pós-teste). Tópico começado continua aberto até terminar, e quem pula dias encontra o
 * mesmo tópico esperando.
 */
export function estadoDaTrilha(entrada: EntradaDaTrilha): Trilha {
    const { respostas, questoes, fimDoPos, agora } = entrada;
    // Tópico sem questão de prática não tem como ser concluído: fica fora, para a fila não travar nele.
    const topicos = entrada.topicos.filter((topicId) => questoesDaPratica(questoes, topicId).length > 0);
    if (fimDoPos === null || topicos.length === 0) return { tipo: 'fechada' };

    const daPratica = new Map<string, number>(); // questão -> horário da resposta mais recente
    for (const r of respostas) {
        if (r.fase === 'pratica') daPratica.set(r.questionId, Math.max(daPratica.get(r.questionId) ?? 0, r.respondidaEm));
    }

    let anteriorConcluidoEm = fimDoPos;
    let anterior: string | null = null;

    for (const [indice, topicId] of topicos.entries()) {
        const ids = questoesDaPratica(questoes, topicId).map((q) => q.id);
        const horarios = ids.flatMap((id) => (daPratica.has(id) ? [daPratica.get(id)!] : []));

        if (horarios.length === ids.length) {
            anteriorConcluidoEm = Math.max(...horarios);
            anterior = topicId;
            continue;
        }

        const lugar = { posicao: indice + 1, de: topicos.length };
        const liberaEm = inicioDoDia(diaDeCalendario(anteriorConcluidoEm) + 1);
        // Começado, continua aberto em qualquer dia; sem começar, só a partir da liberação.
        if (horarios.length > 0 || agora >= liberaEm) {
            return { tipo: 'hoje', topicId, respondidas: horarios.length, total: ids.length, ...lugar };
        }
        return { tipo: 'amanha', topicId, liberaEm, feitoHoje: anterior, ...lugar };
    }

    return { tipo: 'concluida' };
}

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

export interface DiaDaSemana {
    inicio: number; // ms do começo do dia
    diaDaSemana: number; // 0 = domingo
    ativo: boolean; // teve resposta
    hoje: boolean;
}

const DIAS_NA_SEMANA = 7;

/**
 * Os sete dias que a tela da sequência mostra: do dia do pós-teste (o dia 1) em diante. Passada
 * a primeira semana, a janela anda para terminar em hoje.
 */
export function semanaDoPiloto(
    respostas: readonly Pick<Answer, 'respondidaEm'>[],
    fimDoPos: number,
    agora: number
): DiaDaSemana[] {
    const dias = new Set(respostas.map((r) => diaDeCalendario(r.respondidaEm)));
    const hoje = diaDeCalendario(agora);
    const primeiro = Math.max(diaDeCalendario(fimDoPos), hoje - (DIAS_NA_SEMANA - 1));

    return Array.from({ length: DIAS_NA_SEMANA }, (_, i) => {
        const dia = primeiro + i;
        const inicio = inicioDoDia(dia);
        return { inicio, diaDaSemana: dataEmSaoLuis(inicio).diaDaSemana, ativo: dias.has(dia), hoje: dia === hoje };
    });
}
