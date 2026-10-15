import { incluiZero, intervaloPorReamostragem, percentil } from '../estatistica';

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
