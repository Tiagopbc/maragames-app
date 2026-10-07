import { renderRouter, screen } from 'expo-router/testing-library';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

// Sessão de quem já entrou e tem o perfil completo: é o único estado que chega à home.
jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1' },
        perfil: { uid: 'u1', apelido: 'Tiago' },
        perfilCompleto: true,
        isLoading: false,
        sair: jest.fn(),
    }),
}));

// A home lê o roteiro pelo repositório; aqui ela recebe a versão em memória, vazia.
jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

// A animação de abertura não faz parte da navegação.
jest.mock('@/components/animated-icon', () => ({ AnimatedSplashOverlay: () => null }));

const ROTAS = './src/app';

// No Testing Library 14 o render é assíncrono, e o `renderRouter` devolve a promessa com os
// métodos de rota pendurados nela. Por isso se espera a promessa e se lê a rota pelo objeto.
async function abrirEm(url: string) {
    const rotas = renderRouter(ROTAS, { initialUrl: url });
    await rotas;
    return { segmentos: () => rotas.getSegments() };
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
});
