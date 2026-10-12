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
    faixaEtaria: '25_34',
    cidade: 'São Luís',
    uf: 'MA',
    situacaoDeEstudo: 'graduacao',
    instituicao: 'UNDB',
    curso: 'Engenharia de Software',
    experiencia: 'iniciante',
    criadoEm: 1,
    atualizadoEm: 1,
};
// O perfil muda dentro do teste (salvar), então fica num objeto que o mock lê a cada render.
const mockSessao: { perfil: Record<string, unknown>; falhaAoSalvar: boolean; entraComSenha: boolean } = {
    perfil: {},
    falhaAoSalvar: false,
    entraComSenha: true,
};
const mockSalvar = jest.fn(async (dados: Record<string, unknown>) => {
    if (mockSessao.falhaAoSalvar) throw new Error('sem rede');
    mockSessao.perfil = { ...mockSessao.perfil, ...dados };
});
const mockSair = jest.fn();
const mockRedefinirSenha = jest.fn();
const mockSalvarExtras = jest.fn(async (extras: Record<string, unknown>) => {
    mockSessao.perfil = { ...mockSessao.perfil, ...extras };
});

jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1', email: 'tiago@exemplo.com' },
        perfil: mockSessao.perfil,
        perfilCompleto: true,
        isLoading: false,
        salvarPerfil: mockSalvar,
        sair: mockSair,
        entraComSenha: mockSessao.entraComSenha,
        redefinirSenha: mockRedefinirSenha,
        salvarExtras: mockSalvarExtras,
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
    mockSessao.entraComSenha = true;
    mockRedefinirSenha.mockReset();
    mockRedefinirSenha.mockResolvedValue(undefined);
    mockSalvarExtras.mockClear();
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
            faixaEtaria: '25_34',
            cidade: 'São Luís',
            uf: 'MA',
            situacaoDeEstudo: 'graduacao',
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

describe('o núcleo do perfil, na edição (item 34)', () => {
    it('mostra a faixa etária, a cidade, o estado e a situação de estudo que estão gravados', async () => {
        await abrirEm('/perfil');
        await screen.findByDisplayValue('Tiago Cavalcanti');

        expect(screen.getByRole('radio', { name: '25 a 34' })).toBeChecked();
        expect(campo('Cidade').props.value).toBe('São Luís');
        expect(campo('Estado (UF)').props.value).toBe('MA');
        expect(screen.getByRole('radio', { name: 'Graduação' })).toBeChecked();
    });

    it('quem deixa de estudar salva sem instituição nem curso', async () => {
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        await user.press(screen.getByRole('radio', { name: 'Já me formei' }));
        expect(screen.queryByLabelText('Instituição')).toBeNull();
        expect(screen.queryByLabelText('Curso')).toBeNull();

        await user.press(botao('Salvar alterações'));

        expect(mockSalvar).toHaveBeenCalledWith({
            nome: 'Tiago Cavalcanti',
            apelido: 'Tiago',
            telefone: '98987654321',
            faixaEtaria: '25_34',
            cidade: 'São Luís',
            uf: 'MA',
            situacaoDeEstudo: 'formado',
            experiencia: 'iniciante',
        });
    });

    it('na edição, o aceite de contato não fica no formulário: salvar não mexe nele', async () => {
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        await user.clear(campo('Cidade'));
        await user.type(campo('Cidade'), 'Imperatriz');
        await user.press(botao('Salvar alterações'));

        expect(mockSalvar).toHaveBeenCalledTimes(1);
        expect(mockSalvar.mock.calls[0]).toHaveLength(1);
    });
});

describe('o aceite de contato, na Conta', () => {
    const aceite = () => screen.getByRole('checkbox', { name: 'Aceito receber mensagens da Beast Maragames' });

    it('começa desmarcado para quem nunca aceitou, e marcar grava na hora', async () => {
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        expect(aceite()).not.toBeChecked();

        await user.press(aceite());

        expect(mockSalvarExtras).toHaveBeenCalledWith({ aceitaContato: true });
        expect(aceite()).toBeChecked();
    });

    it('se a gravação falha, a caixa volta atrás e avisa', async () => {
        mockSalvarExtras.mockRejectedValueOnce(new Error('sem rede'));
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        await user.press(aceite());

        expect(await screen.findByText('Não foi possível salvar. Tente de novo.')).toBeOnTheScreen();
        expect(aceite()).not.toBeChecked();
    });

    it('quem aceitou pode mudar de ideia', async () => {
        mockSessao.perfil = { ...PERFIL, aceitaContato: true };
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        expect(aceite()).toBeChecked();

        await user.press(aceite());

        expect(mockSalvarExtras).toHaveBeenCalledWith({ aceitaContato: false });
    });
});

describe('o cartão "Sobre você e os jogos", no Perfil', () => {
    it('sem resposta nenhuma, diz 0 de 9 e leva às perguntas', async () => {
        const { caminho } = await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        expect(screen.getByText('0 de 9 respondidas')).toBeOnTheScreen();

        await user.press(botao('Responder'));

        expect(await screen.findByText('O que você faz hoje?')).toBeOnTheScreen();
        expect(caminho()).toBe('/sobre-voce');
    });

    it('conta as que já têm resposta', async () => {
        mockSessao.perfil = { ...PERFIL, objetivo: 'carreira', interesses: ['arte'] };
        await abrirEm('/perfil');

        expect(await screen.findByText('2 de 9 respondidas')).toBeOnTheScreen();
    });
});

describe('as seções do Perfil', () => {
    it('separa a tela em Meus dados, Conta, Aparência e Estudo', async () => {
        await abrirEm('/perfil');
        await screen.findByDisplayValue('Tiago Cavalcanti');

        for (const titulo of ['Meus dados', 'Conta', 'Aparência', 'Estudo']) {
            expect(screen.getByRole('header', { name: titulo })).toBeOnTheScreen();
        }
    });
});

describe('a conta, no Perfil', () => {
    it('quem entra por e-mail e senha vê isso escrito e pode pedir para redefinir a senha', async () => {
        await abrirEm('/perfil');

        expect(await screen.findByText('Você entra por e-mail e senha.')).toBeOnTheScreen();
        expect(botao('Redefinir a senha')).toBeEnabled();
    });

    it('Redefinir a senha manda o link para o e-mail da conta e avisa', async () => {
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        await user.press(botao('Redefinir a senha'));

        expect(mockRedefinirSenha).toHaveBeenCalledWith('tiago@exemplo.com');
        expect(await screen.findByText('Enviamos um link para o e-mail da conta. Confira também o spam.')).toBeOnTheScreen();
    });

    it('se o envio falha, avisa e não diz que enviou', async () => {
        mockRedefinirSenha.mockRejectedValue(new Error('sem rede'));
        await abrirEm('/perfil');
        const user = userEvent.setup();
        await screen.findByDisplayValue('Tiago Cavalcanti');

        await user.press(botao('Redefinir a senha'));

        expect(await screen.findByText('Não foi possível enviar o e-mail. Tente de novo.')).toBeOnTheScreen();
        expect(screen.queryByText(/Enviamos um link/)).toBeNull();
    });

    it('quem entra pelo Google vê isso escrito e não tem senha para redefinir', async () => {
        mockSessao.entraComSenha = false;
        await abrirEm('/perfil');

        expect(await screen.findByText('Você entra pela sua conta do Google.')).toBeOnTheScreen();
        expect(screen.queryByRole('button', { name: 'Redefinir a senha' })).toBeNull();
    });
});

describe('o termo, no Perfil', () => {
    it('Ler o termo abre o texto só para leitura, e Fechar volta para o Perfil', async () => {
        mockSessao.perfil = { ...PERFIL, formaPre: 'A', consentiuEm: Date.UTC(2026, 9, 6, 15) };
        const { caminho } = await abrirEm('/perfil');
        const user = userEvent.setup();

        await user.press(await screen.findByRole('button', { name: 'Ler o termo' }));

        expect(await screen.findByText('O que é este estudo')).toBeOnTheScreen();
        expect(caminho()).toBe('/termo');
        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Aceitar e começar' })).toBeNull();

        await user.press(screen.getByRole('button', { name: 'Fechar' }));

        expect(await screen.findByRole('header', { name: 'Meus dados' })).toBeOnTheScreen();
        expect(caminho()).toBe('/perfil');
    });

    it('quem ainda não aceitou também pode ler, e ler não registra aceite nenhum', async () => {
        const { caminho } = await abrirEm('/perfil');
        const user = userEvent.setup();

        await user.press(await screen.findByRole('button', { name: 'Ler o termo' }));

        expect(await screen.findByText('O que é este estudo')).toBeOnTheScreen();
        expect(caminho()).toBe('/termo');
        expect(mockSessao.perfil.consentiuEm).toBeUndefined();
    });

    it('o termo para leitura abre também pelo endereço', async () => {
        await abrirEm('/termo');

        expect(await screen.findByText('O que é este estudo')).toBeOnTheScreen();
        expect(screen.getByRole('button', { name: 'Fechar' })).toBeOnTheScreen();
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
