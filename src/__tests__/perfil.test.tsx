import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, userEvent } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

import { repositorio } from '@/data/repositorio';
import { escolherTema, preferenciaDeTema } from '@/lib/tema';
import type { RepositorioFalso } from '@/test/repositorio-falso';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

const PERFIL = {
    uid: 'u1',
    nome: 'Tiago Cavalcanti',
    apelido: 'Tiago',
    email: 'tiago@exemplo.com',
    telefone: '98987654321',
    instituicao: 'UNDB',
    curso: 'Engenharia de Software',
    experiencia: 'iniciante',
    criadoEm: 1,
    atualizadoEm: 1,
};
// O perfil muda dentro do teste (salvar), então fica num objeto que o mock lê a cada render.
const mockSessao: { perfil: Record<string, unknown>; falhaAoSalvar: boolean } = { perfil: {}, falhaAoSalvar: false };
const mockSalvar = jest.fn(async (dados: Record<string, unknown>) => {
    if (mockSessao.falhaAoSalvar) throw new Error('sem rede');
    mockSessao.perfil = { ...mockSessao.perfil, ...dados };
});
const mockSair = jest.fn();

jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1', email: 'tiago@exemplo.com' },
        perfil: mockSessao.perfil,
        perfilCompleto: true,
        isLoading: false,
        salvarPerfil: mockSalvar,
        sair: mockSair,
    }),
}));

jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hide: jest.fn() }));
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));

const repo = repositorio as unknown as RepositorioFalso;

beforeEach(() => {
    (useFonts as jest.Mock).mockReturnValue([true, null]);
    mockSalvar.mockClear();
    mockSair.mockClear();
    mockSessao.perfil = { ...PERFIL };
    mockSessao.falhaAoSalvar = false;
    repo.reiniciar();
    repo.licoes = [{ id: 'licao_gdd', title: 'GDD', order: 1, topicId: 'gdd' }];
    repo.questoes = [
        {
            id: 'gdd_p1',
            lessonId: 'licao_gdd',
            topicId: 'gdd',
            order: 1,
            bloco: 'pratica',
            dificuldade: 'basico',
            formato: 'multipla_escolha',
            enunciado: 'Enunciado',
            alternativas: [],
            fonte: null,
            versaoConteudo: 'v1',
        },
    ];
});

async function abrirEm(url: string) {
    const rotas = renderRouter('./src/app', { initialUrl: url });
    await rotas;
    return { caminho: () => rotas.getPathname() };
}

const campo = (rotulo: string) => screen.getByLabelText(rotulo);
const botao = (nome: string) => screen.getByRole('button', { name: nome });

describe('a tela de Perfil', () => {
    it('mostra os dados do cadastro nos campos, com o telefone formatado', async () => {
        await abrirEm('/perfil');

        expect(await screen.findByDisplayValue('Tiago Cavalcanti')).toBeOnTheScreen();
        expect(campo('Apelido').props.value).toBe('Tiago');
        expect(campo('Telefone').props.value).toBe('(98) 98765-4321');
        expect(campo('Instituição').props.value).toBe('UNDB');
        expect(campo('Curso').props.value).toBe('Engenharia de Software');
        expect(screen.getByRole('radio', { name: 'Iniciante' })).toBeChecked();
    });

    it('o e-mail aparece só para leitura: é a credencial da conta', async () => {
        await abrirEm('/perfil');

        expect(await screen.findByText('tiago@exemplo.com')).toBeOnTheScreen();
        expect(screen.queryByLabelText('E-mail')).toBeNull();
    });

    it('sem mudança nenhuma, não há o que salvar', async () => {
        await abrirEm('/perfil');

        expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    });

    it('salva o que mudou, com os espaços aparados e o telefone só em dígitos, e avisa', async () => {
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        await user.clear(campo('Apelido'));
        await user.type(campo('Apelido'), '  Tiagão ');
        await user.press(screen.getByRole('radio', { name: 'Avançado' }));
        await user.press(botao('Salvar alterações'));

        expect(await screen.findByText('Alterações salvas.')).toBeOnTheScreen();
        expect(mockSalvar).toHaveBeenCalledWith({
            nome: 'Tiago Cavalcanti',
            apelido: 'Tiagão',
            telefone: '98987654321',
            instituicao: 'UNDB',
            curso: 'Engenharia de Software',
            experiencia: 'avancado',
        });
    });

    it('campo inválido mostra o erro e não salva', async () => {
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        await user.clear(campo('Apelido'));
        await user.press(botao('Salvar alterações'));

        expect(await screen.findByText('Informe o apelido.')).toBeOnTheScreen();
        expect(mockSalvar).not.toHaveBeenCalled();
        expect(screen.queryByText('Alterações salvas.')).toBeNull();
    });

    it('se salvar falha, avisa e mantém o que a pessoa digitou', async () => {
        mockSessao.falhaAoSalvar = true;
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        await user.clear(campo('Curso'));
        await user.type(campo('Curso'), 'Jogos Digitais');
        await user.press(botao('Salvar alterações'));

        expect(await screen.findByText('Não foi possível salvar. Tente de novo.')).toBeOnTheScreen();
        expect(campo('Curso').props.value).toBe('Jogos Digitais');
    });

    it('quem aceitou o termo vê a data do aceite; quem não aceitou, que ainda falta', async () => {
        // 06/10/2026, ao meio-dia em São Luís.
        mockSessao.perfil = { ...PERFIL, formaPre: 'A', consentiuEm: Date.UTC(2026, 9, 6, 15) };
        await abrirEm('/perfil');
        expect(await screen.findByText('Termo de participação aceito em 06/10/2026.')).toBeOnTheScreen();
    });

    it('sem termo aceito, diz que ele aparece antes do primeiro diagnóstico', async () => {
        await abrirEm('/perfil');

        expect(await screen.findByText(/O termo de participação aparece antes do seu primeiro diagnóstico/)).toBeOnTheScreen();
    });

    it('Sair encerra a sessão', async () => {
        await abrirEm('/perfil');

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Sair' }));

        expect(mockSair).toHaveBeenCalledTimes(1);
    });
});

describe('a aparência, no Perfil', () => {
    const opcao = (nome: string) => screen.getByRole('radio', { name: nome });

    beforeEach(async () => {
        await AsyncStorage.clear();
        await act(() => escolherTema('sistema'));
    });

    it('oferece do sistema, claro e escuro, e começa em "do sistema"', async () => {
        await abrirEm('/perfil');

        expect(await screen.findByText('Aparência')).toBeOnTheScreen();
        expect(opcao('Do sistema')).toBeChecked();
        expect(opcao('Claro')).not.toBeChecked();
        expect(opcao('Escuro')).not.toBeChecked();
    });

    it('escolher "Escuro" marca a opção, muda o tema e guarda a escolha no aparelho', async () => {
        await abrirEm('/perfil');
        await screen.findByText('Aparência');

        await userEvent.setup().press(opcao('Escuro'));

        expect(opcao('Escuro')).toBeChecked();
        expect(opcao('Do sistema')).not.toBeChecked();
        expect(preferenciaDeTema()).toBe('escuro');
        expect(await AsyncStorage.getItem('maragames:tema')).toBe('escuro');
    });

    it('a escolha não mexe no perfil: nada é salvo no banco', async () => {
        await abrirEm('/perfil');
        await screen.findByText('Aparência');

        await userEvent.setup().press(opcao('Claro'));

        expect(mockSalvar).not.toHaveBeenCalled();
        expect(botao('Salvar alterações')).toBeDisabled();
    });
});

// A prova da Fase 6 do plano.
describe('da home ao Perfil e de volta', () => {
    it('editar o apelido muda a saudação da home', async () => {
        const rotas = await abrirEm('/');
        const user = userEvent.setup();
        expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();

        await user.press(screen.getByRole('button', { name: 'Perfil' }));
        await screen.findByDisplayValue('Tiago Cavalcanti');
        await user.clear(campo('Apelido'));
        await user.type(campo('Apelido'), 'Mestre');
        await user.press(botao('Salvar alterações'));
        await screen.findByText('Alterações salvas.');
        await user.press(botao('Voltar ao início'));

        expect(await screen.findByText('Olá, Mestre')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/');
    });
});
