// Resultado de um bloco de questões (M4): acertos, XP, quadrantes e o que revisar primeiro.
// Função pura: sem React, sem Firebase, sem estado. Nada aqui é gravado; reabrir o bloco
// recalcula tudo a partir de `answers`.

import type { Answer, Confianca, Question } from '../types/domain';
import { quadranteDe, type Quadrante } from './quadrante';
import { xpDaResposta } from './xp';

export type RespostaDoResultado = Pick<Answer, 'questionId' | 'topicId' | 'correta' | 'confianca'>;
export type QuestaoDoResultado = Pick<Question, 'id' | 'topicId'>;

export interface Taxa {
    acertos: number;
    total: number;
}

export interface ResultadoDoTopico extends Taxa {
    topicId: string;
    quadrantes: Record<Quadrante, number>;
}

// Só o que não está firme entra na revisão.
export type QuadranteARevisar = Exclude<Quadrante, 'firme'>;

export interface QuestaoARevisar {
    questionId: string;
    topicId: string;
    quadrante: QuadranteARevisar;
}

export interface ResultadoDoBloco extends Taxa {
    xp: number; // saldo do bloco; pode ser negativo (item 14)
    quadrantes: Record<Quadrante, number>;
    porTopico: ResultadoDoTopico[]; // na ordem do bloco; só tópicos com resposta
    porConfianca: Record<Confianca, Taxa>;
    questoesARevisar: QuestaoARevisar[];
    topicosARevisar: string[]; // ids, do mais urgente ao menos
}

// Ponto cego é o equívoco a corrigir primeiro; lacuna é o que falta aprender; frágil é o
// acerto que pode ter sido sorte.
export const ORDEM_DE_REVISAO: readonly QuadranteARevisar[] = ['ponto_cego', 'lacuna', 'fragil'];

const semQuadrantes = (): Record<Quadrante, number> => ({ firme: 0, fragil: 0, lacuna: 0, ponto_cego: 0 });

/**
 * Resume as respostas dadas às questões do bloco. `questoes` é o bloco inteiro, na ordem de
 * exibição; `respostas` vem da mais antiga para a mais recente, só da fase do bloco. Cada questão
 * conta uma vez, pela resposta mais recente, e resposta de questão de fora do bloco é ignorada.
 */
export function resultadoDoBloco(
    respostas: readonly RespostaDoResultado[],
    questoes: readonly QuestaoDoResultado[]
): ResultadoDoBloco {
    const ultimaPorQuestao = new Map<string, RespostaDoResultado>();
    for (const r of respostas) ultimaPorQuestao.set(r.questionId, r);

    const resultado: ResultadoDoBloco = {
        total: 0,
        acertos: 0,
        xp: 0,
        quadrantes: semQuadrantes(),
        porTopico: [],
        porConfianca: { 1: { acertos: 0, total: 0 }, 2: { acertos: 0, total: 0 }, 3: { acertos: 0, total: 0 } },
        questoesARevisar: [],
        topicosARevisar: [],
    };
    const topicos = new Map<string, ResultadoDoTopico>();

    // Percorrer as questões, e não as respostas, é o que põe tudo na ordem do bloco.
    for (const questao of questoes) {
        const r = ultimaPorQuestao.get(questao.id);
        if (!r) continue;

        const quadrante = quadranteDe(r.correta, r.confianca);
        let topico = topicos.get(questao.topicId);
        if (!topico) {
            topico = { topicId: questao.topicId, acertos: 0, total: 0, quadrantes: semQuadrantes() };
            topicos.set(questao.topicId, topico);
            resultado.porTopico.push(topico);
        }

        const acerto = r.correta ? 1 : 0;
        for (const taxa of [resultado, topico, resultado.porConfianca[r.confianca]]) {
            taxa.total += 1;
            taxa.acertos += acerto;
        }
        resultado.xp += xpDaResposta(r.correta, r.confianca);
        resultado.quadrantes[quadrante] += 1;
        topico.quadrantes[quadrante] += 1;

        if (quadrante !== 'firme') {
            resultado.questoesARevisar.push({ questionId: questao.id, topicId: questao.topicId, quadrante });
        }
    }

    // `sort` é estável: dentro do mesmo quadrante, fica a ordem do bloco.
    resultado.questoesARevisar.sort(
        (a, b) => ORDEM_DE_REVISAO.indexOf(a.quadrante) - ORDEM_DE_REVISAO.indexOf(b.quadrante)
    );

    // Tópico com mais pontos cegos vem primeiro; no empate, mais lacunas; depois, mais frágeis.
    resultado.topicosARevisar = resultado.porTopico
        .filter((t) => ORDEM_DE_REVISAO.some((q) => t.quadrantes[q] > 0))
        .sort((a, b) => {
            for (const q of ORDEM_DE_REVISAO) {
                if (a.quadrantes[q] !== b.quadrantes[q]) return b.quadrantes[q] - a.quadrantes[q];
            }
            return 0;
        })
        .map((t) => t.topicId);

    return resultado;
}
