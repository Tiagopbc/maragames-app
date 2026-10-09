import { formaDoParticipante, participanteDoRoteiro } from '../participante';

describe('formaDoParticipante', () => {
    it.each([
        [1, 'A'],
        [2, 'B'],
        [3, 'A'],
        [15, 'A'],
        [16, 'B'],
    ] as const)('o %iº participante a aceitar recebe a forma %s', (ordem, forma) => {
        expect(formaDoParticipante(ordem)).toBe(forma);
    });

    it.each([0, -1, 1.5, NaN])('recusa %p, que não é posição de ninguém na fila', (ordem) => {
        expect(() => formaDoParticipante(ordem)).toThrow();
    });
});

describe('participanteDoRoteiro', () => {
    it('quem ainda não aceitou o termo não tem forma nem consentimento', () => {
        expect(participanteDoRoteiro({})).toEqual({
            formaPre: null,
            consentiuEm: null,
            susRespondidoEm: null,
        });
    });

    it('depois do aceite, traz a forma e a data gravadas no perfil', () => {
        expect(participanteDoRoteiro({ formaPre: 'B', consentiuEm: 1_760_000_000_000 })).toEqual({
            formaPre: 'B',
            consentiuEm: 1_760_000_000_000,
            susRespondidoEm: null,
        });
    });

    it('sem perfil não há participante', () => {
        expect(participanteDoRoteiro(null)).toEqual({
            formaPre: null,
            consentiuEm: null,
            susRespondidoEm: null,
        });
    });
});
