import { incluiZero, intervaloPorReamostragem, percentil, retencaoCorrigida, testePorPermutacaoDeSinais } from '../estatistica';

// O intervalo do relatório (item 36): reamostra as pessoas, e não as respostas, porque as
// respostas de uma mesma pessoa não são independentes entre si.

const media = (xs: readonly number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

describe('percentil', () => {
    it('interpola entre os valores ordenados', () => {
        expect(percentil([1, 2, 3, 4, 5], 0.5)).toBe(3);
        expect(percentil([5, 1, 4, 2, 3], 0)).toBe(1);
        expect(percentil([1, 2, 3, 4, 5], 1)).toBe(5);
        expect(percentil([0, 10], 0.25)).toBeCloseTo(2.5);
    });
});

describe('intervaloPorReamostragem', () => {
    const notas = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1, 0.3, 0.7, 0.9];

    it('traz a estimativa calculada sobre as pessoas, e o intervalo em volta dela', () => {
        const intervalo = intervaloPorReamostragem(notas, media)!;

        expect(intervalo.estimativa).toBeCloseTo(0.54);
        expect(intervalo.inferior).toBeLessThan(intervalo.estimativa);
        expect(intervalo.superior).toBeGreaterThan(intervalo.estimativa);
    });

    it('a mesma entrada dá o mesmo intervalo: o sorteio tem semente', () => {
        expect(intervaloPorReamostragem(notas, media)).toEqual(intervaloPorReamostragem(notas, media));
        expect(intervaloPorReamostragem(notas, media, { semente: 2 })).not.toEqual(intervaloPorReamostragem(notas, media));
    });

    it('com mais pessoas parecidas, o intervalo fica mais estreito', () => {
        const largura = (i: { inferior: number; superior: number }) => i.superior - i.inferior;
        const muitas = Array.from({ length: 10 }, () => notas).flat();

        expect(largura(intervaloPorReamostragem(muitas, media)!)).toBeLessThan(largura(intervaloPorReamostragem(notas, media)!));
    });

    it('com todo mundo igual, o intervalo é o próprio valor', () => {
        expect(intervaloPorReamostragem([0.5, 0.5, 0.5], media)).toEqual({ estimativa: 0.5, inferior: 0.5, superior: 0.5 });
    });

    it('sem estimativa possível, não há intervalo', () => {
        expect(intervaloPorReamostragem([], media)).toBeNull();
    });

    it('reamostra que não dá para calcular fica de fora, sem derrubar o intervalo', () => {
        // Só uma das três pessoas tem valor; reamostras só com as outras duas não contam.
        const soUma = (xs: readonly (number | null)[]) => media(xs.filter((x): x is number => x !== null));

        expect(intervaloPorReamostragem([1, null, null], soUma)).toEqual({ estimativa: 1, inferior: 1, superior: 1 });
    });
});

describe('incluiZero', () => {
    it('diz se o intervalo cruza o zero', () => {
        expect(incluiZero({ estimativa: 0.1, inferior: -0.05, superior: 0.3 })).toBe(true);
        expect(incluiZero({ estimativa: 0.2, inferior: 0.05, superior: 0.3 })).toBe(false);
        expect(incluiZero({ estimativa: 0, inferior: 0, superior: 0 })).toBe(true);
    });
});

// A retenção só da parte sabida (item 37): os acertos no chute não têm o que reter, e misturá-los
// faz a confiança baixa parecer esquecer mais mesmo quando ninguém esquece nada.
describe('retencaoCorrigida', () => {
    it('quem sabia tudo e manteve tudo retém 100%', () => {
        expect(retencaoCorrigida({ respostas: 10, acertos: 10, mantidos: 10 })).toBeCloseTo(1);
    });

    it('sem nada sabido além do acaso, não há o que corrigir', () => {
        // 25% de acerto é o acaso com quatro alternativas.
        expect(retencaoCorrigida({ respostas: 8, acertos: 2, mantidos: 1 })).toBeNull();
        expect(retencaoCorrigida({ respostas: 8, acertos: 1, mantidos: 0 })).toBeNull();
        expect(retencaoCorrigida({ respostas: 0, acertos: 0, mantidos: 0 })).toBeNull();
    });

    it('desconta os acertos no chute, que só se repetem por acaso', () => {
        // Metade sabida: de 100 respostas, 50 sabidas e 12,5 acertos no chute. Sem esquecer nada,
        // as 50 continuam certas e os chutes acertam de novo uma vez em quatro: 53,125 mantidos.
        expect(retencaoCorrigida({ respostas: 100, acertos: 62.5, mantidos: 53.125 })).toBeCloseTo(1);
        // A conta bruta diria 85%: a perda aparente vem toda do chute.
        expect(53.125 / 62.5).toBeCloseTo(0.85);
    });

    it('quem esqueceu tudo o que sabia volta ao acaso', () => {
        // 50 sabidas, todas esquecidas: viram chute de novo, e acertam uma em quatro.
        const mantidos = 50 * 0.25 + 12.5 * 0.25;
        expect(retencaoCorrigida({ respostas: 100, acertos: 62.5, mantidos })).toBeCloseTo(0);
    });
});

// O teste pareado por permutação de sinais (item 37): se a lição não faz efeito, a diferença de
// cada pessoa tem a mesma chance de ser positiva ou negativa, e trocar os sinais não muda nada.
describe('testePorPermutacaoDeSinais', () => {
    it('com todos melhorando, o p é o menor possível', () => {
        // Com 6 pessoas, só 2 das 64 combinações de sinais são tão extremas quanto a observada.
        const teste = testePorPermutacaoDeSinais([0.2, 0.3, 0.1, 0.4, 0.2, 0.3])!;

        expect(teste.media).toBeCloseTo(0.25);
        expect(teste.p).toBeCloseTo(2 / 64);
        expect(teste.exato).toBe(true);
    });

    it('com diferenças que se anulam, o p é 1', () => {
        expect(testePorPermutacaoDeSinais([0.2, -0.2, 0.1, -0.1])!.p).toBeCloseTo(1);
    });

    it('é bicaudal: piorar conta como melhorar', () => {
        expect(testePorPermutacaoDeSinais([-0.2, -0.3, -0.1])!.p).toBeCloseTo(testePorPermutacaoDeSinais([0.2, 0.3, 0.1])!.p);
    });

    it('com muita gente, sorteia os sinais com semente', () => {
        const diferencas = Array.from({ length: 40 }, (_, i) => ((i % 7) - 2) / 10);
        const teste = testePorPermutacaoDeSinais(diferencas)!;

        expect(teste.exato).toBe(false);
        expect(teste).toEqual(testePorPermutacaoDeSinais(diferencas));
        expect(teste.p).toBeGreaterThan(0);
        expect(teste.p).toBeLessThanOrEqual(1);
    });

    it('sem ninguém, não há teste', () => {
        expect(testePorPermutacaoDeSinais([])).toBeNull();
    });
});
