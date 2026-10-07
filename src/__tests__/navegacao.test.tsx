import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

import { repositorio } from '@/data/repositorio';
import type { RepositorioFalso } from '@/test/repositorio-falso';
import type { BlocoQuestao, Fase, Question } from '@/types/domain';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

// Sessão de quem já entrou e tem o perfil completo: é o único estado que chega à home.
jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1' },
        // Já aceitou o termo e recebeu a forma A.
        perfil: { uid: 'u1', apelido: 'Tiago', formaPre: 'A', consentiuEm: 500 },
        perfilCompleto: true,
        isLoading: false,
        sair: jest.fn(),
    }),
}));

// As telas leem o roteiro pelo repositório; aqui elas recebem a versão em memória.
jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

// A animação de abertura não faz parte da navegação.
jest.mock('@/components/animated-icon', () => ({ AnimatedSplashOverlay: () => null }));

// A fonte é carregada no layout raiz; aqui o teste decide se ela já chegou.
jest.mock('expo-font', () => ({
    ...jest.requireActual('expo-font'),
    useFonts: jest.fn(),
}));

const fontes = useFonts as jest.Mock;
const repo = repositorio as unknown as RepositorioFalso;

function questao(id: string, bloco: BlocoQuestao, order: number): Question {
    return {
        id,
        lessonId: 'licao_mda',
        topicId: 'mda',
        order,
        bloco,
        dificuldade: 'basico',
        formato: 'multipla_escolha',
        enunciado: `Enunciado de ${id}`,
        alternativas: [
            { id: 'a', texto: 'Certa', correta: true, explicacao: '' },
            { id: 'b', texto: 'Errada B', correta: false, explicacao: '' },
            { id: 'c', texto: 'Errada C', correta: false, explicacao: '' },
            { id: 'd', texto: 'Errada D', correta: false, explicacao: '' },
        ],
        fonte: null,
        versaoConteudo: 'v1',
    };
}

function responder(fase: Fase, questionId: string) {
    repo.respostas.push({
        id: `r${repo.respostas.length + 1}`,
        uid: 'u1',
        questionId,
        topicId: 'mda',
        attemptId: 't1',
        fase,
        escolha: 'a',
        ordemExibida: ['a', 'b', 'c', 'd'],
        correta: true,
        confianca: 1,
        tempoMs: 1,
        respondidaEm: Date.now(), // hoje: o reteste só abre daqui a sete dias
    });
}

// Um tópico medido, com uma questão por forma e uma de prática; nenhuma resposta ainda.
beforeEach(() => {
    fontes.mockReturnValue([true, null]);
    repo.reiniciar();
    repo.licoes = [{ id: 'licao_mda', title: 'Framework MDA', order: 1, topicId: 'mda' }];
    repo.questoes = [questao('mda_a1', 'forma_a', 1), questao('mda_b1', 'forma_b', 2), questao('mda_p1', 'pratica', 3)];
});

const ROTAS = './src/app';

// No Testing Library 14 o render é assíncrono, e o `renderRouter` devolve a promessa com os
// métodos de rota pendurados nela. Por isso se espera a promessa e se lê a rota pelo objeto.
async function abrirEm(url: string) {
    const rotas = renderRouter(ROTAS, { initialUrl: url });
    await rotas;
    return { segmentos: () => rotas.getSegments(), caminho: () => rotas.getPathname() };
}

describe('a navegação de quem está logado', () => {
    it('abre na home, com a saudação e o botão do roteiro', async () => {
        await abrirEm('/');

        expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
        expect(screen.getByRole('button', { name: 'Continuar estudos' })).toBeOnTheScreen();
    });

    it('a home fica direto no grupo (app), sem grupo de abas em volta', async () => {
        const rotas = await abrirEm('/');

        expect(rotas.segmentos()).toEqual(['(app)']);
    });

    it('não sobra nada do template na home', async () => {
        await abrirEm('/');

        for (const texto of ['Expo', 'Explore', 'Expo Starter', 'Docs']) {
            expect(screen.queryByText(texto)).toBeNull();
        }
    });

    it('/explore não leva à tela de exemplo do template', async () => {
        const rotas = await abrirEm('/explore');

        expect(rotas.segmentos()).not.toContain('explore');
        expect(screen.queryByText('Expo documentation')).toBeNull();
    });

    it('nada aparece enquanto a fonte não carrega', async () => {
        fontes.mockReturnValue([false, null]);
        await abrirEm('/');

        expect(screen.queryByText('Olá, Tiago')).toBeNull();
    });

    it('se a fonte falhar, o app abre mesmo assim, com a fonte do aparelho', async () => {
        fontes.mockReturnValue([false, new Error('sem fonte')]);
        await abrirEm('/');

        expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
    });
});

// A home leva sempre à etapa certa. Estes testes são de quem chega por outro caminho, como a
// URL digitada na web (item 23).
describe('a trava do roteiro', () => {
    function chegarNaEspera() {
        responder('pre', 'mda_a1');
        responder('pratica', 'mda_p1');
        responder('pos', 'mda_b1');
    }

    // Os testes rodam em modo de desenvolvimento; isto simula o app que vai para o participante.
    async function foraDeDesenvolvimento(acao: () => Promise<void>) {
        const global = globalThis as { __DEV__?: boolean };
        global.__DEV__ = false;
        try {
            await acao();
        } finally {
            global.__DEV__ = true;
        }
    }

    describe('na espera do reteste', () => {
        beforeEach(chegarNaEspera);

        it.each(['/cartao/mda', '/bloco/pratica?topicId=mda', '/bloco/pratica'])(
            '%s volta para a home, sem mostrar o conteúdo',
            async (url) => {
                const rotas = await abrirEm(url);

                expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
                expect(rotas.caminho()).toBe('/');
                expect(screen.queryByText('Enunciado de mda_p1')).toBeNull();
            }
        );

        it('/bloco/reteste volta para a home: o reteste ainda não abriu', async () => {
            await foraDeDesenvolvimento(async () => {
                const rotas = await abrirEm('/bloco/reteste');

                expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
                expect(rotas.caminho()).toBe('/');
                expect(screen.queryByText('Enunciado de mda_b1')).toBeNull();
            });
        });

        it('em desenvolvimento, o link do reteste abre fora da etapa, para dar para testar', async () => {
            await abrirEm('/bloco/reteste');

            expect(await screen.findByText('Enunciado de mda_b1')).toBeOnTheScreen();
        });

        it('em desenvolvimento, a exceção não vale para a prática', async () => {
            const rotas = await abrirEm('/bloco/pratica?topicId=mda');

            expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
            expect(rotas.caminho()).toBe('/');
        });
    });

    describe('no estudo do tópico', () => {
        beforeEach(() => responder('pre', 'mda_a1'));

        it('/bloco/pratica?topicId=mda abre a prática', async () => {
            await abrirEm('/bloco/pratica?topicId=mda');

            expect(await screen.findByText('Enunciado de mda_p1')).toBeOnTheScreen();
        });

        it('/bloco/pos volta para a home: falta estudar', async () => {
            await foraDeDesenvolvimento(async () => {
                const rotas = await abrirEm('/bloco/pos');

                expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
                expect(rotas.caminho()).toBe('/');
            });
        });

        it('o cartão de outro tópico volta para a home', async () => {
            const rotas = await abrirEm('/cartao/engine');

            expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
            expect(rotas.caminho()).toBe('/');
        });
    });
});

