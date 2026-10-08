import { userEvent } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

const mockEntrarComEmail = jest.fn();

// Sessão de quem ainda não entrou: o layout raiz só deixa abrir o login e o cadastro.
jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: null,
        perfil: null,
        perfilCompleto: false,
        isLoading: false,
        entrarComEmail: mockEntrarComEmail,
        entrarComGoogle: jest.fn(),
    }),
}));

jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

jest.mock('expo-font', () => ({
    ...jest.requireActual('expo-font'),
    useFonts: jest.fn(),
}));

beforeEach(() => {
    (useFonts as jest.Mock).mockReturnValue([true, null]);
    mockEntrarComEmail.mockReset();
    mockEntrarComEmail.mockResolvedValue(undefined);
});

async function abrirOApp() {
    // No Testing Library 14 o render é assíncrono: espera-se a promessa que o `renderRouter` devolve.
    await renderRouter('./src/app', { initialUrl: '/' });
}

const entrar = () => screen.getByRole('button', { name: 'Entrar' });

describe('a tela de login', () => {
    it('é onde cai quem ainda não entrou, com a logo e a chamada da marca', async () => {
        await abrirOApp();

        expect(await screen.findByRole('image', { name: 'Logo da Beast Maragames' })).toBeOnTheScreen();
        expect(screen.getByText('Beast Maragames')).toBeOnTheScreen();
        expect(screen.getByText('Pronto pra soltar a fera?')).toBeOnTheScreen();
    });

    it('pede a senha com o mínimo que a validação exige', async () => {
        await abrirOApp();

        expect(await screen.findByPlaceholderText('Mínimo 8 caracteres')).toBeOnTheScreen();
    });

    it('Entrar só habilita com e-mail e senha preenchidos', async () => {
        await abrirOApp();
        const user = userEvent.setup();
        await screen.findByText('Pronto pra soltar a fera?');

        expect(entrar()).toBeDisabled();

        await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
        expect(entrar()).toBeDisabled();

        await user.type(screen.getByLabelText('Senha'), 'segredo-de-teste');
        expect(entrar()).toBeEnabled();
    });

    it('Entrar envia o e-mail e a senha digitados', async () => {
        await abrirOApp();
        const user = userEvent.setup();
        await screen.findByText('Pronto pra soltar a fera?');

        await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
        await user.type(screen.getByLabelText('Senha'), 'segredo-de-teste');
        await user.press(entrar());

        expect(mockEntrarComEmail).toHaveBeenCalledWith('ana@exemplo.com', 'segredo-de-teste');
    });

    it('credencial errada vira uma mensagem que dá para entender', async () => {
        mockEntrarComEmail.mockRejectedValue({ code: 'auth/invalid-credential' });
        await abrirOApp();
        const user = userEvent.setup();
        await screen.findByText('Pronto pra soltar a fera?');

        await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
        await user.type(screen.getByLabelText('Senha'), 'segredo-de-teste');
        await user.press(entrar());

        expect(await screen.findByText('Email ou senha incorretos.')).toBeOnTheScreen();
    });

    it('leva ao cadastro quem ainda não tem conta', async () => {
        await abrirOApp();

        expect(await screen.findByText('Criar agora')).toBeOnTheScreen();
    });
});
