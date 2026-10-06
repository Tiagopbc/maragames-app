// Ordem das alternativas por semente uid + questão + fase (item 22).
// Função pura: sem React, sem Firebase, sem estado, e sem Math.random nem crypto,
// para dar a mesma ordem em qualquer aparelho e rodar no Expo Go.

import type { Fase } from '../types/domain';

const TENTATIVAS = 100;

// FNV-1a de 32 bits: transforma a semente em texto num inteiro.
function hash(texto: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

// mulberry32: gerador determinístico de números em [0, 1) a partir de um inteiro.
function gerador(semente: number): () => number {
    let a = semente;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Fisher-Yates numa cópia.
function embaralhar(ids: readonly string[], sorteio: () => number): string[] {
    const ordem = [...ids];
    for (let i = ordem.length - 1; i > 0; i--) {
        const j = Math.floor(sorteio() * (i + 1));
        [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    }
    return ordem;
}

/**
 * Ordem em que as alternativas aparecem para este participante, nesta questão e nesta fase.
 * Estável se a pessoa sair e voltar. No reteste, nenhuma alternativa repete a posição que
 * teve no pós, para a pessoa não acertar por lembrar a letra marcada.
 */
export function ordemDasAlternativas(
    uid: string,
    questionId: string,
    fase: Fase,
    ids: readonly string[]
): string[] {
    // Parte da lista ordenada para o resultado não depender da ordem em que os ids chegam.
    const base = [...ids].sort();
    const sorteio = gerador(hash(`${uid}|${questionId}|${fase}`));
    if (fase !== 'reteste' || base.length < 2) return embaralhar(base, sorteio);

    const noPos = ordemDasAlternativas(uid, questionId, 'pos', base);
    // Sorteia de novo até nenhuma posição coincidir. Com 4 alternativas, 9 das 24 ordens servem,
    // então o limite só é atingido com ids repetidos, caso em que essa ordem pode não existir.
    for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
        const ordem = embaralhar(base, sorteio);
        if (ordem.every((id, i) => id !== noPos[i])) return ordem;
    }
    return [...noPos.slice(1), noPos[0]];
}
