import { userEvent } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

// Sessão de quem entrou e ainda não tem o perfil completo: o layout raiz só deixa abrir a
// tela de completar. O perfil fica num objeto que o mock lê a cada render.
const mockSessao: { perfil: Record<string, unknown> | null } = { perfil: null };
const mockSalvar = jest.fn();

jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1', email: 'ana@exemplo.com', displayName: 'Ana Souza' },
        perfil: mockSessao.perfil,
        perfilCompleto: false,
        isLoading: false,
        salvarPerfil: mockSalvar,
        sair: jest.fn(),
    }),
}));

jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hide: jest.fn() }));
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));

beforeEach(() => {
    (useFonts as jest.Mock).mockReturnValue([true, null]);
    mockSessao.perfil = null;
    mockSalvar.mockReset();
    mockSalvar.mockResolvedValue(undefined);
});

async function abrir() {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Seu perfil');
    return userEvent.setup();
}

const campo = (rotulo: string) => screen.getByLabelText(rotulo);
const opcao = (nome: string) => screen.getByRole('radio', { name: nome });
const salvar = () => screen.getByRole('button', { name: 'Salvar e começar' });

async function preencherOQueNaoMuda(user: ReturnType<typeof userEvent.setup>) {
    await user.type(campo('Apelido'), 'Ana');
    await user.type(campo('Telefone'), '98987654321');
    await user.press(opcao('18 a 24'));
    await user.type(campo('Cidade'), ' São Luís ');
    await user.type(campo('Estado (UF)'), 'ma');
}

describe('a tela de completar o perfil', () => {
    it('é onde cai quem entrou sem perfil completo, em duas partes', async () => {
        await abrir();

        expect(screen.getByText('Sobre você')).toBeOnTheScreen();
        expect(screen.getByText('Estudo e jogos')).toBeOnTheScreen();
        expect(campo('Nome completo').props.value).toBe('Ana Souza');
    });

    it('as faixas etárias começam em 18 anos', async () => {
        await abrir();

        for (const faixa of ['18 a 24', '25 a 34', '35 a 44', '45 ou mais']) expect(opcao(faixa)).toBeOnTheScreen();
        expect(screen.queryByRole('radio', { name: /17/ })).toBeNull();
    });

    it('sem preencher, mostra o que falta e não salva', async () => {
        const user = await abrir();

        await user.press(salvar());

        expect(await screen.findByText('Escolha a faixa etária.')).toBeOnTheScreen();
        expect(screen.getByText('Informe a cidade.')).toBeOnTheScreen();
        expect(screen.getByText('Informe o estado.')).toBeOnTheScreen();
        expect(screen.getByText('Escolha a situação de estudo.')).toBeOnTheScreen();
        expect(mockSalvar).not.toHaveBeenCalled();
    });

    it('estado que não é sigla mostra o erro', async () => {
        const user = await abrir();

        await user.type(campo('Estado (UF)'), 'XX');
        await user.press(salvar());

        expect(await screen.findByText('Use a sigla do estado, como MA.')).toBeOnTheScreen();
    });

    it('instituição e curso só aparecem para quem faz graduação ou pós', async () => {
        const user = await abrir();

        expect(screen.queryByLabelText('Instituição')).toBeNull();
        expect(screen.queryByLabelText('Curso')).toBeNull();

        await user.press(opcao('Graduação'));
        expect(campo('Instituição')).toBeOnTheScreen();
        expect(campo('Curso')).toBeOnTheScreen();

        await user.press(opcao('Não estudo'));
        expect(screen.queryByLabelText('Instituição')).toBeNull();

        await user.press(opcao('Pós-graduação'));
        expect(campo('Instituição')).toBeOnTheScreen();
    });

    it('quem não estuda salva o núcleo sem instituição nem curso, com o estado em maiúsculas', async () => {
        const user = await abrir();

        await preencherOQueNaoMuda(user);
        await user.press(opcao('Não estudo'));
        await user.press(salvar());

        expect(mockSalvar).toHaveBeenCalledWith(
            {
                nome: 'Ana Souza',
                apelido: 'Ana',
                telefone: '98987654321',
                faixaEtaria: '18_24',
                cidade: 'São Luís',
                uf: 'MA',
                situacaoDeEstudo: 'nao_estudo',
                experiencia: 'iniciante',
            },
            { aceitaContato: false }
        );
    });

    it('quem faz graduação precisa dizer a instituição e o curso, e eles são salvos', async () => {
        const user = await abrir();

        await preencherOQueNaoMuda(user);
        await user.press(opcao('Graduação'));
        await user.press(salvar());

        expect(await screen.findByText('Informe a instituição.')).toBeOnTheScreen();
        expect(screen.getByText('Informe o curso.')).toBeOnTheScreen();
        expect(mockSalvar).not.toHaveBeenCalled();

        await user.type(campo('Instituição'), 'UNDB');
        await user.type(campo('Curso'), 'Jogos Digitais');
        await user.press(salvar());

        expect(mockSalvar).toHaveBeenCalledWith(
            expect.objectContaining({ situacaoDeEstudo: 'graduacao', instituicao: 'UNDB', curso: 'Jogos Digitais' }),
            { aceitaContato: false }
        );
    });

    it('o aceite de contato começa desmarcado e só vai como sim se a pessoa marcar', async () => {
        const user = await abrir();
        const aceite = screen.getByRole('checkbox', { name: 'Aceito receber mensagens da Beast Maragames' });

        expect(aceite).not.toBeChecked();

        await preencherOQueNaoMuda(user);
        await user.press(opcao('Já me formei'));
        await user.press(aceite);
        await user.press(salvar());

        expect(mockSalvar).toHaveBeenCalledWith(expect.objectContaining({ situacaoDeEstudo: 'formado' }), { aceitaContato: true });
    });

    it('a experiência é em criar jogos, e cada nível diz o que quer dizer', async () => {
        const user = await abrir();

        expect(screen.getByText('Experiência em criar jogos')).toBeOnTheScreen();
        expect(screen.getByText('Nunca criei um jogo.')).toBeOnTheScreen();

        await user.press(opcao('Avançado'));

        expect(screen.getByText('Já publiquei um jogo.')).toBeOnTheScreen();
    });

    // As contas criadas antes de 12/10/2026 voltam aqui só para responder o que é novo.
    it('a conta antiga encontra preenchido o que já tinha', async () => {
        mockSessao.perfil = {
            uid: 'u1',
            nome: 'Ana Souza Lima',
            apelido: 'Aninha',
            email: 'ana@exemplo.com',
            telefone: '98987654321',
            instituicao: 'UNDB',
            curso: 'Engenharia de Software',
            experiencia: 'intermediario',
        };
        await abrir();

        expect(campo('Nome completo').props.value).toBe('Ana Souza Lima');
        expect(campo('Apelido').props.value).toBe('Aninha');
        expect(campo('Telefone').props.value).toBe('(98) 98765-4321');
        expect(opcao('Intermediário')).toBeChecked();
        expect(campo('Cidade').props.value).toBe('');
    });
});
