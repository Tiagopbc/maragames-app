import { ordemDasAlternativas } from '../embaralhar';

const IDS = ['a', 'b', 'c', 'd'];
const UIDS = Array.from({ length: 400 }, (_, i) => `uid-${i}`);

describe('ordemDasAlternativas', () => {
    it('devolve as mesmas alternativas, sem perder nem repetir', () => {
        const ordem = ordemDasAlternativas('uid-1', 'mda_framework_01', 'pre', IDS);

        expect([...ordem].sort()).toEqual(IDS);
    });

    it('não altera a lista recebida', () => {
        const ids = ['a', 'b', 'c', 'd'];

        ordemDasAlternativas('uid-1', 'mda_framework_01', 'pre', ids);

        expect(ids).toEqual(['a', 'b', 'c', 'd']);
    });

    it('é estável: a mesma semente dá sempre a mesma ordem', () => {
        const primeira = ordemDasAlternativas('uid-1', 'mda_framework_01', 'pos', IDS);
        const segunda = ordemDasAlternativas('uid-1', 'mda_framework_01', 'pos', IDS);

        expect(segunda).toEqual(primeira);
    });

    it('não depende da ordem em que as alternativas chegam', () => {
        const direta = ordemDasAlternativas('uid-1', 'mda_framework_01', 'pos', ['a', 'b', 'c', 'd']);
        const invertida = ordemDasAlternativas('uid-1', 'mda_framework_01', 'pos', ['d', 'c', 'b', 'a']);

        expect(invertida).toEqual(direta);
    });

    it('muda de um participante para outro', () => {
        const ordens = new Set(UIDS.map((uid) => ordemDasAlternativas(uid, 'mda_framework_01', 'pre', IDS).join('')));

        // 4 alternativas têm 24 ordens possíveis; 400 participantes devem passar por todas.
        expect(ordens.size).toBe(24);
    });

    it('muda de uma questão para outra no mesmo participante', () => {
        const questoes = Array.from({ length: 40 }, (_, i) => `questao_${i}`);
        const ordens = new Set(questoes.map((q) => ordemDasAlternativas('uid-1', q, 'pre', IDS).join('')));

        expect(ordens.size).toBeGreaterThan(10);
    });

    it.each(['pre', 'pratica', 'pos', 'reteste'] as const)(
        'na fase %s, cada alternativa aparece em primeiro em cerca de um quarto das vezes',
        (fase) => {
            const primeiras: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
            for (const uid of UIDS) primeiras[ordemDasAlternativas(uid, 'mda_framework_01', fase, IDS)[0]] += 1;

            for (const id of IDS) {
                expect(primeiras[id] / UIDS.length).toBeGreaterThan(0.18);
                expect(primeiras[id] / UIDS.length).toBeLessThan(0.32);
            }
        }
    );

    it('no reteste, nenhuma alternativa fica na posição que tinha no pós', () => {
        for (const uid of UIDS) {
            const pos = ordemDasAlternativas(uid, 'mda_framework_01', 'pos', IDS);
            const reteste = ordemDasAlternativas(uid, 'mda_framework_01', 'reteste', IDS);

            reteste.forEach((id, i) => expect(id).not.toBe(pos[i]));
        }
    });

    it('com ids repetidos, em que não existe ordem sem posição repetida, ainda devolve uma ordem', () => {
        expect(ordemDasAlternativas('uid-1', 'q', 'reteste', ['a', 'a'])).toEqual(['a', 'a']);
    });

    it('com uma alternativa só, devolve a própria lista em qualquer fase', () => {
        expect(ordemDasAlternativas('uid-1', 'q', 'pos', ['a'])).toEqual(['a']);
        expect(ordemDasAlternativas('uid-1', 'q', 'reteste', ['a'])).toEqual(['a']);
    });
});
