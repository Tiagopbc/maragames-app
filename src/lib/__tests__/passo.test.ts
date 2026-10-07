import type { Etapa } from '../roteiro';
import { destinoDaEtapa, podeAbrir, travaVale, type DestinoDeEstudo } from '../passo';

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

    it('na espera, o que há para abrir é o resultado do dia 1: o reteste ainda não abriu', () => {
        expect(destinoDaEtapa({ tipo: 'espera', liberaEm: 0, ultimoDiaEm: 0, diasRestantes: 3 })).toEqual({
            tipo: 'dia1',
        });
    });

    it('o consentimento abre a tela do termo', () => {
        expect(destinoDaEtapa({ tipo: 'consentimento' })).toEqual({ tipo: 'consentimento' });
    });

    // O SUS ainda não tem tela (item 24); quando tiver, o destino entra aqui.
    it.each(['sus', 'concluido'] as const)('em %s o botão não leva a lugar nenhum', (tipo) => {
        expect(destinoDaEtapa({ tipo })).toBeNull();
    });
});

describe('podeAbrir', () => {
    const ESTUDO_MDA: Etapa = { tipo: 'estudo', topicId: 'mda', respondidas: 0, total: 4, proximaQuestaoId: 'p1' };
    const ESPERA: Etapa = { tipo: 'espera', liberaEm: 0, ultimoDiaEm: 0, diasRestantes: 6 };
    const PRE: Etapa = { tipo: 'pre', ...PROGRESSO };
    const POS: Etapa = { tipo: 'pos', ...PROGRESSO };
    const RETESTE: Etapa = { tipo: 'reteste', foraDaJanela: false, ...PROGRESSO };

    const CARTAO_MDA: DestinoDeEstudo = { tipo: 'cartao', topicId: 'mda' };
    const PRATICA_MDA: DestinoDeEstudo = { tipo: 'bloco', fase: 'pratica', topicId: 'mda' };
    const TODOS: DestinoDeEstudo[] = [
        CARTAO_MDA,
        PRATICA_MDA,
        { tipo: 'bloco', fase: 'pre' },
        { tipo: 'bloco', fase: 'pos' },
        { tipo: 'bloco', fase: 'reteste' },
    ];

    describe('no estudo de um tópico', () => {
        it('abre o cartão e a prática daquele tópico', () => {
            expect(podeAbrir(ESTUDO_MDA, CARTAO_MDA)).toBe(true);
            expect(podeAbrir(ESTUDO_MDA, PRATICA_MDA)).toBe(true);
        });

        it('com a prática já começada, os dois continuam abrindo', () => {
            const comecada: Etapa = { ...ESTUDO_MDA, respondidas: 2 };

            expect(podeAbrir(comecada, CARTAO_MDA)).toBe(true);
            expect(podeAbrir(comecada, PRATICA_MDA)).toBe(true);
        });

        it('não abre o cartão nem a prática de outro tópico: a ordem do roteiro é fixa', () => {
            expect(podeAbrir(ESTUDO_MDA, { tipo: 'cartao', topicId: 'engine' })).toBe(false);
            expect(podeAbrir(ESTUDO_MDA, { tipo: 'bloco', fase: 'pratica', topicId: 'engine' })).toBe(false);
        });

        it('não abre a prática sem tópico: quem escolhe o tópico é o roteiro, não a tela', () => {
            expect(podeAbrir(ESTUDO_MDA, { tipo: 'bloco', fase: 'pratica' })).toBe(false);
        });

        it('não abre o pós-teste antes de terminar o estudo', () => {
            expect(podeAbrir(ESTUDO_MDA, { tipo: 'bloco', fase: 'pos' })).toBe(false);
        });
    });

    // É o que a trava protege (item 23): entre o pós e o reteste, rever um tópico medido faria
    // o reteste medir a revisão, e abrir o reteste antes da hora mediria um dia de memória, não sete.
    describe('na espera do reteste', () => {
        it.each(TODOS)('não abre %o', (destino) => {
            expect(podeAbrir(ESPERA, destino)).toBe(false);
        });
    });

    describe('nos blocos medidos', () => {
        it.each([
            ['pre', PRE],
            ['pos', POS],
            ['reteste', RETESTE],
        ] as const)('o bloco %s abre na etapa dele', (fase, etapa) => {
            expect(podeAbrir(etapa, { tipo: 'bloco', fase })).toBe(true);
        });

        it('o reteste abre também fora da janela: a análise marca o atraso', () => {
            expect(podeAbrir({ ...RETESTE, foraDaJanela: true }, { tipo: 'bloco', fase: 'reteste' })).toBe(true);
        });

        it.each([
            ['pre', PRE],
            ['pos', POS],
            ['reteste', RETESTE],
        ] as const)('na etapa %s, nada além do próprio bloco abre', (fase, etapa) => {
            for (const destino of TODOS) {
                const oProprio = destino.tipo === 'bloco' && destino.fase === fase;
                expect(podeAbrir(etapa, destino)).toBe(oProprio);
            }
        });
    });

    // O resultado do dia 1 é o do pós-teste: só existe depois que o pós termina.
    describe('o resultado do dia 1', () => {
        const DIA_1: DestinoDeEstudo = { tipo: 'dia1' };

        it.each([ESPERA, RETESTE, { tipo: 'sus' }, { tipo: 'concluido' }] as Etapa[])(
            'abre em $tipo, com o pós já feito',
            (etapa) => {
                expect(podeAbrir(etapa, DIA_1)).toBe(true);
            }
        );

        it.each([{ tipo: 'consentimento' }, PRE, ESTUDO_MDA, POS] as Etapa[])(
            'não abre em $tipo, antes de terminar o pós',
            (etapa) => {
                expect(podeAbrir(etapa, DIA_1)).toBe(false);
            }
        );
    });

    it.each([{ tipo: 'consentimento' }, { tipo: 'sus' }, { tipo: 'concluido' }] as const)(
        'em $tipo nenhum bloco abre',
        (etapa) => {
            for (const destino of TODOS) expect(podeAbrir(etapa, destino)).toBe(false);
        }
    );
});

describe('travaVale', () => {
    const MEDIDOS = (['pre', 'pos', 'reteste'] as const).map((fase): DestinoDeEstudo => ({ tipo: 'bloco', fase }));
    const DE_ESTUDO: DestinoDeEstudo[] = [
        { tipo: 'cartao', topicId: 'mda' },
        { tipo: 'bloco', fase: 'pratica', topicId: 'mda' },
    ];

    it('no app do participante, vale para tudo', () => {
        for (const destino of [...MEDIDOS, ...DE_ESTUDO]) expect(travaVale(destino, false)).toBe(true);
    });

    it('em desenvolvimento, não vale para os blocos medidos: são os links de teste da home', () => {
        for (const destino of MEDIDOS) expect(travaVale(destino, true)).toBe(false);
    });

    it('em desenvolvimento, continua valendo para o resultado do dia 1', () => {
        expect(travaVale({ tipo: 'dia1' }, true)).toBe(true);
    });

    it('em desenvolvimento, continua valendo para o cartão e a prática', () => {
        for (const destino of DE_ESTUDO) expect(travaVale(destino, true)).toBe(true);
    });
});
