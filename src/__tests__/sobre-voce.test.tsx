import { userEvent, within } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

const PERFIL = {
    uid: 'u1',
    nome: 'Tiago Cavalcanti',
    apelido: 'Tiago',
    email: 'tiago@exemplo.com',
    telefone: '98987654321',
    faixaEtaria: '25_34',
    cidade: 'São Luís',
    uf: 'MA',
    situacaoDeEstudo: 'nao_estudo',
    experiencia: 'iniciante',
    criadoEm: 1,
    atualizadoEm: 1,
};
const mockSessao: { perfil: Record<string, unknown>; falha: boolean } = { perfil: {}, falha: false };
const mockSalvarExtras = jest.fn(async (extras: Record<string, unknown>) => {
    if (mockSessao.falha) throw new Error('sem rede');
    mockSessao.perfil = { ...mockSessao.perfil, ...extras };
});

jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1', email: 'tiago@exemplo.com' },
        perfil: mockSessao.perfil,
        perfilCompleto: true,
        isLoading: false,
        salvarPerfil: jest.fn(),
        salvarExtras: mockSalvarExtras,
        entraComSenha: true,
        redefinirSenha: jest.fn(),
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
    mockSessao.perfil = { ...PERFIL };
    mockSessao.falha = false;
    mockSalvarExtras.mockClear();
});

async function abrir() {
    const rotas = renderRouter('./src/app', { initialUrl: '/sobre-voce' });
    await rotas;
    await screen.findByText('O que você faz hoje?');
    return { user: userEvent.setup(), caminho: () => rotas.getPathname() };
}

// Há "Nenhuma" e "Outra" em duas perguntas: a opção é procurada dentro do grupo da pergunta.
const grupo = (pergunta: string) => screen.getByLabelText(pergunta);
const opcao = (pergunta: string, papel: 'radio' | 'checkbox', nome: string) =>
    within(grupo(pergunta)).getByRole(papel, { name: nome });
const salvar = () => screen.getByRole('button', { name: 'Salvar respostas' });

describe('a tela "Sobre você e os jogos"', () => {
    it('faz as nove perguntas opcionais, e diz que são opcionais', async () => {
        await abrir();

        for (const pergunta of [
            'O que você faz hoje?',
            'Que engines você já usou?',
            'Que linguagens de programação você conhece?',
            'Você já estudou game design?',
            'Que áreas de criar jogos mais te interessam?',
            'Qual é o seu objetivo com jogos?',
            'Quanto tempo por semana você tem para estudar?',
            'Como você conheceu a Beast Maragames?',
            'Você já é aluno do site da Beast Maragames?',
        ]) {
            expect(grupo(pergunta)).toBeOnTheScreen();
        }
        expect(screen.getByText(/São opcionais/)).toBeOnTheScreen();
        expect(screen.getByText('0 de 9 respondidas')).toBeOnTheScreen();
    });

    it('salva só o que foi respondido, com as listas na ordem das opções', async () => {
        const { user } = await abrir();

        await user.press(opcao('O que você faz hoje?', 'radio', 'Trabalho com tecnologia'));
        // Marcadas fora de ordem de propósito.
        await user.press(opcao('Que engines você já usou?', 'checkbox', 'Unity'));
        await user.press(opcao('Que engines você já usou?', 'checkbox', 'Godot'));
        await user.press(opcao('Você já é aluno do site da Beast Maragames?', 'radio', 'Não'));
        await user.press(salvar());

        expect(mockSalvarExtras).toHaveBeenCalledWith({
            ocupacao: 'tecnologia',
            engines: ['godot', 'unity'],
            alunoDoSite: false,
        });
        expect(await screen.findByText('Respostas salvas.')).toBeOnTheScreen();
        expect(screen.getByText('3 de 9 respondidas')).toBeOnTheScreen();
    });

    it('"Nenhuma" não combina com as outras: marcar uma desmarca a outra', async () => {
        const { user } = await abrir();
        const engine = (nome: string) => opcao('Que engines você já usou?', 'checkbox', nome);

        await user.press(engine('Godot'));
        await user.press(engine('Unity'));
        await user.press(engine('Nenhuma'));

        expect(engine('Nenhuma')).toBeChecked();
        expect(engine('Godot')).not.toBeChecked();
        expect(engine('Unity')).not.toBeChecked();

        await user.press(engine('Unreal'));

        expect(engine('Unreal')).toBeChecked();
        expect(engine('Nenhuma')).not.toBeChecked();

        await user.press(salvar());

        expect(mockSalvarExtras).toHaveBeenCalledWith(expect.objectContaining({ engines: ['unreal'] }));
    });

    it('o que já estava respondido vem marcado', async () => {
        mockSessao.perfil = { ...PERFIL, objetivo: 'publicar', interesses: ['arte', 'audio'], alunoDoSite: true };
        await abrir();

        expect(opcao('Qual é o seu objetivo com jogos?', 'radio', 'Publicar um jogo')).toBeChecked();
        expect(opcao('Que áreas de criar jogos mais te interessam?', 'checkbox', 'Arte')).toBeChecked();
        expect(opcao('Que áreas de criar jogos mais te interessam?', 'checkbox', 'Áudio')).toBeChecked();
        expect(opcao('Que áreas de criar jogos mais te interessam?', 'checkbox', 'Programação')).not.toBeChecked();
        expect(opcao('Você já é aluno do site da Beast Maragames?', 'radio', 'Sim')).toBeChecked();
        expect(screen.getByText('3 de 9 respondidas')).toBeOnTheScreen();
    });

    it('dá para desfazer uma resposta: tocar na marcada tira, e desmarcar tudo de uma lista também', async () => {
        mockSessao.perfil = { ...PERFIL, objetivo: 'publicar', interesses: ['arte'] };
        const { user } = await abrir();

        await user.press(opcao('Qual é o seu objetivo com jogos?', 'radio', 'Publicar um jogo'));
        await user.press(opcao('Que áreas de criar jogos mais te interessam?', 'checkbox', 'Arte'));
        await user.press(salvar());

        const [enviado] = mockSalvarExtras.mock.calls[0];
        expect(enviado.objetivo).toBeUndefined();
        expect(enviado.interesses).toBeUndefined();
        // As chaves vão, sem valor: é o que diz à sessão para apagar o campo.
        expect(Object.keys(enviado)).toEqual(expect.arrayContaining(['objetivo', 'interesses']));
    });

    it('sem mudança, não há o que salvar', async () => {
        await abrir();

        expect(salvar()).toBeDisabled();
    });

    it('se salvar falha, avisa e mantém o que a pessoa marcou', async () => {
        mockSessao.falha = true;
        const { user } = await abrir();

        await user.press(opcao('Qual é o seu objetivo com jogos?', 'radio', 'Hobby'));
        await user.press(salvar());

        expect(await screen.findByText('Não foi possível salvar. Tente de novo.')).toBeOnTheScreen();
        expect(opcao('Qual é o seu objetivo com jogos?', 'radio', 'Hobby')).toBeChecked();
    });

    it('fechar volta para o Perfil', async () => {
        const { user, caminho } = await abrir();

        await user.press(screen.getByRole('button', { name: 'Voltar ao início' }));

        expect(await screen.findByRole('header', { name: 'Meus dados' })).toBeOnTheScreen();
        expect(caminho()).toBe('/perfil');
    });
});
