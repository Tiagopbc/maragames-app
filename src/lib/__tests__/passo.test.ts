import { destinoDaEtapa } from '../passo';

const PROGRESSO = { respondidas: 1, total: 12, proximaQuestaoId: 'q2' };

describe('destinoDaEtapa', () => {
    it('o pré-teste abre o bloco pre', () => {
        expect(destinoDaEtapa({ tipo: 'pre', ...PROGRESSO })).toEqual({ tipo: 'bloco', fase: 'pre' });
    });

    it('o estudo começa pelo cartão: sem resposta de prática, abre o cartão do tópico', () => {
        const etapa = { tipo: 'estudo', topicId: 'mda', respondidas: 0, total: 4, proximaQuestaoId: 'p1' } as const;

        expect(destinoDaEtapa(etapa)).toEqual({ tipo: 'cartao', topicId: 'mda' });
    });

    it('com a prática já começada, o estudo abre a prática do tópico, sem cartão', () => {
        expect(destinoDaEtapa({ tipo: 'estudo', topicId: 'mda', ...PROGRESSO })).toEqual({
            tipo: 'bloco',
            fase: 'pratica',
            topicId: 'mda',
        });
    });

    it('o pós-teste abre o bloco pos', () => {
        expect(destinoDaEtapa({ tipo: 'pos', ...PROGRESSO })).toEqual({ tipo: 'bloco', fase: 'pos' });
    });

    it('o reteste abre o bloco reteste, mesmo fora da janela', () => {
        expect(destinoDaEtapa({ tipo: 'reteste', foraDaJanela: true, ...PROGRESSO })).toEqual({
            tipo: 'bloco',
            fase: 'reteste',
        });
    });

    it('na espera não há para onde ir: o reteste ainda não abriu', () => {
        expect(destinoDaEtapa({ tipo: 'espera', liberaEm: 0, diasRestantes: 3 })).toBeNull();
    });

    it('o consentimento abre a tela do termo', () => {
        expect(destinoDaEtapa({ tipo: 'consentimento' })).toEqual({ tipo: 'consentimento' });
    });

    // O SUS ainda não tem tela (item 24); quando tiver, o destino entra aqui.
    it.each(['sus', 'concluido'] as const)('em %s o botão não leva a lugar nenhum', (tipo) => {
        expect(destinoDaEtapa({ tipo })).toBeNull();
    });
});
