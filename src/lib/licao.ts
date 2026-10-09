// O ciclo de uma lição, calculado a partir das respostas (item 30): diagnóstico, estudo,
// verificação e, 7 dias depois, revisão. No dado, as fases continuam `pre`, `pratica`, `pos` e
// `reteste`. Funções puras: sem React, sem Firebase, sem estado. O estado nunca é gravado.

import type { Answer, Fase, FormaPre, Question } from '../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from './bloco';
import { diaDeCalendario, inicioDoDia } from './roteiro';

export type QuestaoDaLicao = Pick<Question, 'id' | 'topicId' | 'bloco'>;
export type RespostaDaLicao = Pick<Answer, 'questionId' | 'fase' | 'respondidaEm'>;

// Completo: o tópico tem questões das formas A e B, então tem antes e depois. Curto: só prática.
export type Ciclo = 'completo' | 'curto';

interface Progresso {
    respondidas: number;
    total: number;
    proximaQuestaoId: string;
}

// O cartão não é estado: vê-lo não gera evento em `answers`. A tela mostra o cartão quando o
// estudo tem zero respondidas, o mesmo corte do roteiro (item 22).
export type EstadoDaLicao =
    | { tipo: 'nova' }
    | ({ tipo: 'diagnostico' } & Progresso)
    | ({ tipo: 'estudo' } & Progresso)
    | ({ tipo: 'verificacao' } & Progresso)
    // `liberaEm` é o começo do dia em que a revisão abre.
    | { tipo: 'aguardando_revisao'; liberaEm: number; diasRestantes: number }
    | ({ tipo: 'revisao'; liberadaEm: number } & Progresso)
    | { tipo: 'concluida'; concluidaEm: number };

export interface Licao {
    topicId: string;
    ciclo: Ciclo;
    estado: EstadoDaLicao;
    ultimaRespostaEm: number | null; // a resposta mais recente da lição, de qualquer fase
}

// A revisão abre 7 dias de calendário depois do dia da verificação, e não fecha mais: a
// distância real entre as duas fica para a análise, pelos horários do servidor.
export const DIAS_ATE_A_REVISAO = 7;

/** O ciclo que o conteúdo do tópico permite, ou null quando o tópico não tem questão que vire lição. */
export function cicloDaLicao(questoes: readonly QuestaoDaLicao[], topicId: string): Ciclo | null {
    const tem = (bloco: Question['bloco']) => questoes.some((q) => q.topicId === topicId && q.bloco === bloco);

    if (tem('forma_a') && tem('forma_b')) return 'completo';
    return tem('pratica') ? 'curto' : null;
}

export interface EntradaDaLicao {
    topicId: string;
    respostas: readonly RespostaDaLicao[]; // todas as do aluno; as de outros tópicos são ignoradas
    questoes: readonly QuestaoDaLicao[]; // dentro de cada tópico, já na ordem de exibição
    formaPre: FormaPre | null; // users/{uid}.formaPre
    agora: number; // ms; vem de fora para a função continuar pura
}

/**
 * Em que passo a lição está: o primeiro, na ordem do ciclo, que ainda tem questão sem resposta.
 * Não há como pular passo: a prática respondida não adianta a lição com o diagnóstico pela metade.
 */
export function estadoDaLicao(entrada: EntradaDaLicao): EstadoDaLicao {
    const { topicId, respostas, questoes, formaPre, agora } = entrada;
    const ciclo = cicloDaLicao(questoes, topicId);
    if (ciclo === null) throw new Error(`O tópico ${topicId} não tem questões: o conteúdo não foi carregado.`);

    const doTopico = new Set(questoes.filter((q) => q.topicId === topicId).map((q) => q.id));
    if (!respostas.some((r) => doTopico.has(r.questionId))) return { tipo: 'nova' };

    // Horário da resposta mais recente de cada questão, numa fase.
    const horariosDa = (fase: Fase, ids: readonly string[]): Map<string, number> => {
        const horarios = new Map<string, number>();
        for (const r of respostas) {
            if (r.fase === fase && ids.includes(r.questionId)) {
                horarios.set(r.questionId, Math.max(horarios.get(r.questionId) ?? 0, r.respondidaEm));
            }
        }
        return horarios;
    };
    // Progresso de um passo, ou null quando todas as questões dele já têm resposta.
    const progresso = (ids: readonly string[], horarios: Map<string, number>): Progresso | null => {
        const proximaQuestaoId = ids.find((id) => !horarios.has(id));
        if (proximaQuestaoId === undefined) return null;
        return { respondidas: horarios.size, total: ids.length, proximaQuestaoId };
    };

    const idsDaPratica = questoesDaPratica(questoes, topicId).map((q) => q.id);
    const daPratica = horariosDa('pratica', idsDaPratica);

    if (ciclo === 'curto') {
        const pratica = progresso(idsDaPratica, daPratica);
        return pratica ? { tipo: 'estudo', ...pratica } : { tipo: 'concluida', concluidaEm: Math.max(...daPratica.values()) };
    }

    // Sem a forma, não há como saber quais questões são o diagnóstico: a lição nem começou.
    if (formaPre === null) return { tipo: 'nova' };

    // Quais questões entram em cada fase é regra de src/lib/bloco.ts, a mesma que a tela da pergunta usa.
    const idsDoPre = questoesDoBlocoMedido(questoes, 'pre', [topicId], formaPre).map((q) => q.id);
    const idsDoPos = questoesDoBlocoMedido(questoes, 'pos', [topicId], formaPre).map((q) => q.id);

    const pre = progresso(idsDoPre, horariosDa('pre', idsDoPre));
    if (pre) return { tipo: 'diagnostico', ...pre };

    const pratica = progresso(idsDaPratica, daPratica);
    if (pratica) return { tipo: 'estudo', ...pratica };

    const doPos = horariosDa('pos', idsDoPos);
    const pos = progresso(idsDoPos, doPos);
    if (pos) return { tipo: 'verificacao', ...pos };

    const doReteste = horariosDa('reteste', idsDoPos);
    const reteste = progresso(idsDoPos, doReteste);
    if (!reteste) return { tipo: 'concluida', concluidaEm: Math.max(...doReteste.values()) };

    const diaDaLiberacao = diaDeCalendario(Math.max(...doPos.values())) + DIAS_ATE_A_REVISAO;
    const hoje = diaDeCalendario(agora);
    const liberaEm = inicioDoDia(diaDaLiberacao);

    if (hoje < diaDaLiberacao) return { tipo: 'aguardando_revisao', liberaEm, diasRestantes: diaDaLiberacao - hoje };
    return { tipo: 'revisao', liberadaEm: liberaEm, ...reteste };
}

export interface EntradaDasLicoes extends Omit<EntradaDaLicao, 'topicId'> {
    topicos: readonly string[]; // ids, na ordem sugerida do conteúdo
}

/**
 * Todas as lições do aluno, na ordem recebida. Tópico sem questão fica de fora; conteúdo sem
 * lição nenhuma é erro, para a tela não confundir banco vazio com "tudo concluído".
 */
export function licoesDoAluno(entrada: EntradaDasLicoes): Licao[] {
    const { topicos, respostas, questoes } = entrada;

    const licoes = topicos.flatMap((topicId): Licao[] => {
        const ciclo = cicloDaLicao(questoes, topicId);
        if (ciclo === null) return [];

        const doTopico = new Set(questoes.filter((q) => q.topicId === topicId).map((q) => q.id));
        const horarios = respostas.filter((r) => doTopico.has(r.questionId)).map((r) => r.respondidaEm);
        return [
            {
                topicId,
                ciclo,
                estado: estadoDaLicao({ ...entrada, topicId }),
                ultimaRespostaEm: horarios.length > 0 ? Math.max(...horarios) : null,
            },
        ];
    });

    if (licoes.length === 0) throw new Error('Conteúdo sem lições: nenhum tópico tem questões.');
    return licoes;
}
