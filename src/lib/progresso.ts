// Os números da tela de Progresso (Fase 5 do plano), calculados das respostas que já podem
// aparecer (`respostasAVista`, em src/lib/licao.ts). Funções puras: sem React, sem Firebase,
// sem estado. Nada aqui é gravado.

import type { Answer, Confianca, Fase } from '../types/domain';
import { quadranteDe, type Quadrante } from './quadrante';
import { ORDEM_DE_REVISAO, type Taxa } from './resultado';

type RespostaDoResumo = Pick<Answer, 'fase' | 'questionId' | 'correta' | 'confianca' | 'respondidaEm'>;

export interface ResumoDasRespostas {
    quadrantes: Record<Quadrante, number>; // uma vez por questão: o que o aluno sabe agora
    porConfianca: Record<Confianca, Taxa>; // a calibração: acerto em cada nível declarado
}

/**
 * Resume um conjunto de respostas. No quadrante, cada questão conta uma vez, pela resposta mais
 * recente em qualquer fase, como no domínio (item 14). No acerto por confiança, cada declaração
 * conta: a questão da verificação que volta na revisão entra duas vezes, porque são duas vezes
 * em que o aluno disse quanto confiava. Dentro da mesma fase, vale a resposta mais recente.
 */
export function resumoDasRespostas(respostas: readonly RespostaDoResumo[]): ResumoDasRespostas {
    const maisRecente = (chave: (r: RespostaDoResumo) => string) => {
        const ultimas = new Map<string, RespostaDoResumo>();
        for (const r of respostas) {
            const atual = ultimas.get(chave(r));
            if (!atual || r.respondidaEm >= atual.respondidaEm) ultimas.set(chave(r), r);
        }
        return [...ultimas.values()];
    };

    const resumo: ResumoDasRespostas = {
        quadrantes: { firme: 0, fragil: 0, lacuna: 0, ponto_cego: 0 },
        porConfianca: { 1: { acertos: 0, total: 0 }, 2: { acertos: 0, total: 0 }, 3: { acertos: 0, total: 0 } },
    };

    for (const r of maisRecente((x) => x.questionId)) resumo.quadrantes[quadranteDe(r.correta, r.confianca)] += 1;
    for (const r of maisRecente((x) => `${x.fase}|${x.questionId}`)) {
        resumo.porConfianca[r.confianca].total += 1;
        if (r.correta) resumo.porConfianca[r.confianca].acertos += 1;
    }
    return resumo;
}

export interface PassoFeito {
    fase: Fase;
    em: number; // ms da última resposta da fase
    respostas: number;
}

/** Os passos em que o aluno já respondeu algo no tópico, na ordem em que aconteceram. */
export function historicoDoTopico(
    respostas: readonly Pick<Answer, 'fase' | 'topicId' | 'respondidaEm'>[],
    topicId: string
): PassoFeito[] {
    const porFase = new Map<Fase, PassoFeito>();
    for (const r of respostas) {
        if (r.topicId !== topicId) continue;
        const passo = porFase.get(r.fase) ?? { fase: r.fase, em: 0, respostas: 0 };
        passo.em = Math.max(passo.em, r.respondidaEm);
        passo.respostas += 1;
        porFase.set(r.fase, passo);
    }
    return [...porFase.values()].sort((a, b) => a.em - b.em);
}

export interface RevisaoDoTopico {
    topicId: string;
    quadrantes: Record<Quadrante, number>; // uma vez por questão, pela resposta mais recente
}

/**
 * Os tópicos com resposta, do mais fraco para o mais forte: mais pontos cegos primeiro; no
 * empate, mais lacunas; depois, mais frágeis. É a ordem de revisão do resultado do bloco (item
 * 27): o erro com certeza é o equívoco a corrigir antes. `topicos` vem na ordem sugerida do
 * conteúdo, que desempata o resto; tópico sem resposta fica de fora.
 */
export function revisaoPorTopico(
    respostas: readonly (RespostaDoResumo & Pick<Answer, 'topicId'>)[],
    topicos: readonly string[]
): RevisaoDoTopico[] {
    return topicos
        .flatMap((topicId): RevisaoDoTopico[] => {
            const doTopico = respostas.filter((r) => r.topicId === topicId);
            return doTopico.length === 0 ? [] : [{ topicId, quadrantes: resumoDasRespostas(doTopico).quadrantes }];
        })
        // `sort` é estável: no empate completo, fica a ordem sugerida.
        .sort((a, b) => {
            for (const q of ORDEM_DE_REVISAO) {
                if (a.quadrantes[q] !== b.quadrantes[q]) return b.quadrantes[q] - a.quadrantes[q];
            }
            return 0;
        });
}
