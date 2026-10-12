import { userEvent } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

const mockEntrarComEmail = jest.fn();
const mockRedefinirSenha = jest.fn();

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
        cadastrarComEmail: jest.fn(),
        redefinirSenha: mockRedefinirSenha,
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
    mockRedefinirSenha.mockReset();
    mockRedefinirSenha.mockResolvedValue(undefined);
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

    it('a senha começa escondida, e o botão do campo a mostra', async () => {
        await abrirOApp();
        const user = userEvent.setup();
        await screen.findByText('Pronto pra soltar a fera?');

        expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);

        await user.press(screen.getByRole('button', { name: 'Mostrar a senha' }));

        expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
    });

    it('leva ao cadastro quem ainda não tem conta', async () => {
        await abrirOApp();

        expect(await screen.findByText('Criar agora')).toBeOnTheScreen();
    });

    it('quem não entrou e abre um endereço que não existe vê o aviso, e de lá chega ao login', async () => {
        await renderRouter('./src/app', { initialUrl: '/nao-existe' });

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Voltar ao início' }));

        expect(await screen.findByText('Pronto pra soltar a fera?')).toBeOnTheScreen();
    });
});

describe('esqueci a senha, no login', () => {
    const esqueci = () => screen.getByRole('button', { name: 'Esqueci a senha' });

    it('sem e-mail digitado, pede o e-mail e não envia nada', async () => {
        await abrirOApp();
        const user = userEvent.setup();
        await screen.findByText('Pronto pra soltar a fera?');

        await user.press(esqueci());

        expect(await screen.findByText('Digite o seu e-mail acima para receber o link de redefinição.')).toBeOnTheScreen();
        expect(mockRedefinirSenha).not.toHaveBeenCalled();
    });

    it('com um e-mail que não é e-mail, também não envia', async () => {
        await abrirOApp();
        const user = userEvent.setup();
        await screen.findByText('Pronto pra soltar a fera?');

        await user.type(screen.getByLabelText('E-mail'), 'ana-sem-arroba');
        await user.press(esqueci());

        expect(await screen.findByText('Digite o seu e-mail acima para receber o link de redefinição.')).toBeOnTheScreen();
        expect(mockRedefinirSenha).not.toHaveBeenCalled();
    });

    it('com o e-mail digitado, pede o link para ele e avisa sem dizer se a conta existe', async () => {
        await abrirOApp();
        const user = userEvent.setup();
        await screen.findByText('Pronto pra soltar a fera?');

        await user.type(screen.getByLabelText('E-mail'), ' ana@exemplo.com ');
        await user.press(esqueci());

        expect(mockRedefinirSenha).toHaveBeenCalledWith('ana@exemplo.com');
        expect(
            await screen.findByText('Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também o spam.')
        ).toBeOnTheScreen();
    });

    it('se o envio falha, avisa e não diz que enviou', async () => {
        mockRedefinirSenha.mockRejectedValue({ code: 'auth/network-request-failed' });
        await abrirOApp();
        const user = userEvent.setup();
        await screen.findByText('Pronto pra soltar a fera?');

        await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
        await user.press(esqueci());

        expect(await screen.findByText('Sem conexão com o servidor.')).toBeOnTheScreen();
        expect(screen.queryByText(/enviamos um link/)).toBeNull();
    });
});

describe('a tela de cadastro', () => {
    it('os dois campos de senha começam escondidos, cada um com o seu botão', async () => {
        await renderRouter('./src/app', { initialUrl: '/sign-up' });
        const user = userEvent.setup();
        await screen.findByText('Depois a gente completa seu perfil.');

        expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
        expect(screen.getByLabelText('Repetir senha').props.secureTextEntry).toBe(true);

        await user.press(screen.getByRole('button', { name: 'Mostrar a senha' }));

        // Mostrar uma não mostra a outra.
        expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
        expect(screen.getByLabelText('Repetir senha').props.secureTextEntry).toBe(true);

        await user.press(screen.getByRole('button', { name: 'Mostrar a senha repetida' }));

        expect(screen.getByLabelText('Repetir senha').props.secureTextEntry).toBe(false);
    });
});
