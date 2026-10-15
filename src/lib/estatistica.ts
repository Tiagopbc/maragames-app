// Intervalos de confiança para o relatório (item 36). Função pura: sem React, sem Firebase.
//
// O intervalo sai por reamostragem (bootstrap) das PESSOAS: sorteia, com reposição, tantas pessoas
// quantas há, recalcula o número e repete. As respostas de uma mesma pessoa não são independentes
// entre si (quem sabe acerta várias), então reamostrar respostas daria um intervalo estreito demais.
// O sorteio tem semente fixa: a mesma entrada dá sempre o mesmo intervalo.

import { gerador } from './embaralhar';

export interface Intervalo {
    estimativa: number;
    inferior: number;
    superior: number;
}

export interface OpcoesDoIntervalo {
    reamostras?: number; // por padrão, 2000
    nivel?: number; // por padrão, 0,95
    semente?: number; // por padrão, 1
}

/** O valor no ponto `p` (de 0 a 1) dos valores ordenados, interpolando entre vizinhos. */
export function percentil(valores: readonly number[], p: number): number {
    const ordem = [...valores].sort((a, b) => a - b);
    const posicao = (ordem.length - 1) * p;
    const abaixo = Math.floor(posicao);
    const acima = Math.ceil(posicao);
    return ordem[abaixo] + (ordem[acima] - ordem[abaixo]) * (posicao - abaixo);
}

/**
 * A estimativa sobre todas as pessoas e o intervalo percentil por reamostragem delas. Reamostra em
 * que o número não dá para calcular (por exemplo, ninguém com revisão) fica de fora.
 */
export function intervaloPorReamostragem<T>(
    pessoas: readonly T[],
    estatistica: (amostra: readonly T[]) => number | null,
    opcoes: OpcoesDoIntervalo = {}
): Intervalo | null {
    const estimativa = estatistica(pessoas);
    if (estimativa === null) return null;
    const { reamostras = 2000, nivel = 0.95, semente = 1 } = opcoes;
    const sorteio = gerador(semente);

    const valores: number[] = [];
    for (let k = 0; k < reamostras; k++) {
        const amostra = Array.from({ length: pessoas.length }, () => pessoas[Math.floor(sorteio() * pessoas.length)]);
        const valor = estatistica(amostra);
        if (valor !== null) valores.push(valor);
    }
    if (valores.length === 0) return { estimativa, inferior: estimativa, superior: estimativa };

    const cauda = (1 - nivel) / 2;
    return { estimativa, inferior: percentil(valores, cauda), superior: percentil(valores, 1 - cauda) };
}

/** Se o intervalo cruza o zero: aí não há evidência de diferença. */
export function incluiZero(intervalo: Intervalo): boolean {
    return intervalo.inferior <= 0 && intervalo.superior >= 0;
}
