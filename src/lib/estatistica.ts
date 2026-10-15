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

const ACASO = 0.25; // uma de quatro alternativas

/** Respostas de um nível de confiança, na verificação das lições que tiveram revisão. */
export interface RespostasParaReter {
    respostas: number; // todas, certas e erradas
    acertos: number; // as certas
    mantidos: number; // das certas, as que continuaram certas na revisão
}

/**
 * A retenção só do que a pessoa sabia, descontado o chute (item 37). Do acerto sai a fração
 * sabida, k = (acerto − acaso) / (1 − acaso). O que se sabia e se manteve continua certo; o que
 * se sabia e se esqueceu vira chute; o acerto no chute só se repete por acaso, porque as
 * alternativas mudam de ordem na revisão. Daí:
 *   mantidos / respostas = k·(r + (1 − r)·acaso) + (1 − k)·acaso²
 * e a conta devolve r. Sem nada sabido além do acaso, não há o que reter: null.
 * O valor não é cortado em 0 e 1: com poucas respostas ele sai do intervalo, e cortar enviesaria
 * a reamostragem.
 */
export function retencaoCorrigida({ respostas, acertos, mantidos }: RespostasParaReter, acaso = ACASO): number | null {
    if (respostas === 0) return null;
    const sabida = (acertos / respostas - acaso) / (1 - acaso);
    if (sabida <= 1e-9) return null;
    return (mantidos / respostas - sabida * acaso - (1 - sabida) * acaso * acaso) / (sabida * (1 - acaso));
}

export interface TesteDeSinais {
    media: number; // a diferença média observada
    p: number; // bicaudal
    exato: boolean; // todas as combinações de sinais, e não um sorteio delas
}

const MAXIMO_EXATO = 16; // 2^16 combinações

/**
 * O teste pareado por permutação de sinais (item 37). Se a lição não faz efeito, a diferença de
 * cada pessoa (depois menos antes) tem a mesma chance de sair positiva ou negativa: trocar os
 * sinais ao acaso dá a distribuição da média sem efeito. O p é a fração das trocas com média tão
 * longe de zero quanto a observada. Até 16 pessoas, todas as combinações; acima, 10 mil sorteios
 * com semente fixa, e o p conta a observada entre elas, para nunca dar zero.
 */
export function testePorPermutacaoDeSinais(
    diferencas: readonly number[],
    opcoes: { permutacoes?: number; semente?: number } = {}
): TesteDeSinais | null {
    const n = diferencas.length;
    if (n === 0) return null;
    const media = diferencas.reduce((a, b) => a + b, 0) / n;
    const limite = Math.abs(media) - 1e-12;
    const extrema = (sinais: (i: number) => number) => {
        let soma = 0;
        for (let i = 0; i < n; i++) soma += sinais(i) * diferencas[i];
        return Math.abs(soma / n) >= limite;
    };

    if (n <= MAXIMO_EXATO) {
        const total = 2 ** n;
        let tantas = 0;
        for (let mascara = 0; mascara < total; mascara++) if (extrema((i) => ((mascara >> i) & 1 ? -1 : 1))) tantas += 1;
        return { media, p: tantas / total, exato: true };
    }

    const { permutacoes = 10000, semente = 1 } = opcoes;
    const sorteio = gerador(semente);
    let tantas = 0;
    for (let k = 0; k < permutacoes; k++) {
        const sinais = Array.from({ length: n }, () => (sorteio() < 0.5 ? -1 : 1));
        if (extrema((i) => sinais[i])) tantas += 1;
    }
    return { media, p: (tantas + 1) / (permutacoes + 1), exato: false };
}
