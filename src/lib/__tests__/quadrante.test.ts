import { contarQuadrantes, quadranteDe } from '../quadrante';

describe('quadranteDe', () => {
    it('acerto com certeza é firme', () => {
        expect(quadranteDe(true, 3)).toBe('firme');
    });

    it('acerto com palpite é frágil', () => {
        expect(quadranteDe(true, 1)).toBe('fragil');
    });

    it('acerto com dúvida é frágil: o nível 2 conta como confiança baixa', () => {
        expect(quadranteDe(true, 2)).toBe('fragil');
    });

    it('erro com palpite é lacuna', () => {
        expect(quadranteDe(false, 1)).toBe('lacuna');
    });

    it('erro com dúvida é lacuna: o nível 2 conta como confiança baixa', () => {
        expect(quadranteDe(false, 2)).toBe('lacuna');
    });

    it('erro com certeza é ponto cego', () => {
        expect(quadranteDe(false, 3)).toBe('ponto_cego');
    });
});

describe('contarQuadrantes', () => {
    it('devolve os quatro quadrantes zerados quando não há respostas', () => {
        expect(contarQuadrantes([])).toEqual({ firme: 0, fragil: 0, lacuna: 0, ponto_cego: 0 });
    });

    it('conta cada resposta no seu quadrante', () => {
        const respostas = [
            { correta: true, confianca: 3 },
            { correta: true, confianca: 3 },
            { correta: true, confianca: 2 },
            { correta: false, confianca: 1 },
            { correta: false, confianca: 2 },
            { correta: false, confianca: 3 },
        ] as const;

        expect(contarQuadrantes(respostas)).toEqual({ firme: 2, fragil: 1, lacuna: 2, ponto_cego: 1 });
    });
});
