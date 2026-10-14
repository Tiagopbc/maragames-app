import type { Confianca } from '../../types/domain';
import { MINIMO_DE_RESPOSTAS, PERFIS_DE_RESPOSTA, perfilDeResposta, type RespostaDoPerfil } from '../perfis-de-resposta';

// O perfil de resposta de uma pessoa sai só das respostas dela: quanto acerta, com que certeza,
// quanto erra achando que sabe e em quanto tempo responde (item 35). É o que o relatório consegue
// dizer de cada um sem perguntar nada.

/** `n` respostas iguais: certa ou errada, com a confiança e o tempo dados. */
function vezes(n: number, correta: boolean, confianca: Confianca, tempoMs = 15_000): RespostaDoPerfil[] {
    return Array.from({ length: n }, () => ({ correta, confianca, tempoMs }));
}

describe('perfilDeResposta', () => {
    it('com menos respostas que o mínimo, não diz nada', () => {
        expect(MINIMO_DE_RESPOSTAS).toBe(6);
        expect(perfilDeResposta(vezes(5, true, 3))).toBe('poucas_respostas');
        expect(perfilDeResposta([])).toBe('poucas_respostas');
    });

    it('quem acerta três de cada quatro, quase sempre com certeza, domina', () => {
        expect(perfilDeResposta([...vezes(8, true, 3), ...vezes(2, false, 1)])).toBe('domina');
    });

    it('quem acerta muito, mas sem certeza, sabe e duvida', () => {
        expect(perfilDeResposta([...vezes(7, true, 1), ...vezes(1, true, 3), ...vezes(2, false, 1)])).toBe('inseguro');
    });

    it('quem erra com certeza em um quarto das respostas ou mais é confiante demais', () => {
        expect(perfilDeResposta([...vezes(5, true, 3), ...vezes(3, false, 3), ...vezes(2, false, 2)])).toBe('confiante_demais');
    });

    it('quem acerta menos da metade, sem se iludir, tem dificuldade', () => {
        expect(perfilDeResposta([...vezes(3, true, 2), ...vezes(7, false, 1)])).toBe('com_dificuldade');
    });

    it('quem responde rápido e acerta perto do acaso responde no chute', () => {
        expect(perfilDeResposta([...vezes(3, true, 2, 3_000), ...vezes(7, false, 2, 2_500)])).toBe('chuta');
    });

    it('rápido, mas acertando, não é chute: é quem sabe', () => {
        expect(perfilDeResposta([...vezes(9, true, 3, 3_000), ...vezes(1, false, 1, 3_000)])).toBe('domina');
    });

    it('o chute vem antes do ponto cego: quem chuta com certeza, rápido, continua chutando', () => {
        expect(perfilDeResposta([...vezes(3, true, 3, 2_000), ...vezes(7, false, 3, 2_000)])).toBe('chuta');
    });

    it('o resto está em progresso: acerta boa parte, com a confiança acompanhando', () => {
        expect(perfilDeResposta([...vezes(4, true, 3), ...vezes(2, true, 2), ...vezes(3, false, 1), ...vezes(1, false, 3)])).toBe('em_progresso');
    });

    it('cada perfil tem um nome e uma frase que diz como foi reconhecido', () => {
        expect(Object.keys(PERFIS_DE_RESPOSTA)).toEqual([
            'domina',
            'em_progresso',
            'inseguro',
            'com_dificuldade',
            'confiante_demais',
            'chuta',
            'poucas_respostas',
        ]);
        for (const perfil of Object.values(PERFIS_DE_RESPOSTA)) {
            expect(perfil.rotulo.length).toBeGreaterThan(3);
            expect(perfil.criterio.length).toBeGreaterThan(15);
        }
    });
});
