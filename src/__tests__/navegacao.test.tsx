import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, userEvent } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';
import { AppState, type AppStateStatus } from 'react-native';

import { repositorio } from '@/data/repositorio';
import type { RepositorioFalso } from '@/test/repositorio-falso';
import type { BlocoQuestao, Fase, Question } from '@/types/domain';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

// Sessão de quem já entrou e tem o perfil completo: é o único estado que chega à home.
// O perfil fica num objeto que o mock lê a cada render, para um teste poder tirar o termo.
const mockSessao: { perfil: Record<string, unknown> } = { perfil: {} };
const COM_TERMO = {
    uid: 'u1',
    nome: 'Tiago Cavalcanti',
    apelido: 'Tiago',
    email: 'tiago@exemplo.com',
    telefone: '98987654321',
    instituicao: 'UNDB',
    curso: 'Engenharia de Software',
    experiencia: 'iniciante',
    formaPre: 'A',
    consentiuEm: 500,
};

jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1' },
        perfil: mockSessao.perfil,
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

// A tela de abertura é do aparelho; aqui só interessa quando o app manda escondê-la.
jest.mock('expo-splash-screen', () => ({
    preventAutoHideAsync: jest.fn(),
    hide: jest.fn(),
}));

// A fonte é carregada no layout raiz; aqui o teste decide se ela já chegou.
jest.mock('expo-font', () => ({
    ...jest.requireActual('expo-font'),
    useFonts: jest.fn(),
}));

const fontes = useFonts as jest.Mock;
const repo = repositorio as unknown as RepositorioFalso;

function questao(id: string, bloco: BlocoQuestao, order: number, topicId = 'mda'): Question {
    return {
        id,
        lessonId: `licao_${topicId}`,
        topicId,
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

function responder(fase: Fase, questionId: string, quando = Date.now(), correta = true) {
    repo.respostas.push({
        id: `r${repo.respostas.length + 1}`,
        uid: 'u1',
        questionId,
        topicId: questionId.split('_')[0],
        attemptId: 't1',
        fase,
        escolha: correta ? 'a' : 'b',
        ordemExibida: ['a', 'b', 'c', 'd'],
        correta,
        confianca: 1,
        tempoMs: 1,
        respondidaEm: quando, // por padrão, hoje: o reteste só abre daqui a sete dias
    });
}

// Uma lição de ciclo completo (MDA: uma questão por forma e uma de prática) e duas de ciclo
// curto (GDD e UX/UI: uma questão de prática cada). Nenhuma resposta ainda.
beforeEach(() => {
    (SplashScreen.hide as jest.Mock).mockClear();
    fontes.mockReturnValue([true, null]);
    mockSessao.perfil = COM_TERMO;
    repo.reiniciar();
    repo.licoes = [
        { id: 'licao_mda', title: 'Framework MDA', order: 1, topicId: 'mda' },
        { id: 'licao_gdd', title: 'GDD', order: 2, topicId: 'gdd' },
        { id: 'licao_ux', title: 'UX/UI em jogos', order: 3, topicId: 'ux' },
    ];
    repo.questoes = [
        questao('mda_a1', 'forma_a', 1),
        questao('mda_b1', 'forma_b', 2),
        questao('mda_p1', 'pratica', 3),
        questao('gdd_p1', 'pratica', 1, 'gdd'),
        questao('ux_p1', 'pratica', 1, 'ux'),
    ];
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
    it('abre na home, com a saudação e o cartão do dia', async () => {
        await abrirEm('/');

        expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
        expect(await screen.findByText('Para hoje')).toBeOnTheScreen();
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

    it('endereço que não existe mostra o aviso do app, em português', async () => {
        await abrirEm('/explore');

        expect(await screen.findByText('Essa página não existe.')).toBeOnTheScreen();
        expect(screen.queryByText(/Unmatched Route|Sitemap|Go back/)).toBeNull();
    });

    it('do aviso, "Voltar ao início" leva à home', async () => {
        const rotas = await abrirEm('/um/endereco/qualquer');

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Voltar ao início' }));

        expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/');
    });

    it('enquanto a fonte não carrega, nada aparece e a tela de abertura continua', async () => {
        fontes.mockReturnValue([false, null]);
        await abrirEm('/');

        expect(screen.queryByText('Olá, Tiago')).toBeNull();
        expect(SplashScreen.hide).not.toHaveBeenCalled();
    });

    it('com a fonte pronta, a tela de abertura some', async () => {
        await abrirEm('/');
        await screen.findByText('Olá, Tiago');

        expect(SplashScreen.hide).toHaveBeenCalled();
    });

    it('enquanto a preferência de tema não é lida do aparelho, a tela de abertura continua', async () => {
        // A leitura fica pendurada: o app não pode abrir no tema errado e trocar à vista.
        jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise(() => {}));
        await abrirEm('/');

        expect(screen.queryByText('Olá, Tiago')).toBeNull();
        expect(SplashScreen.hide).not.toHaveBeenCalled();
        jest.restoreAllMocks();
    });

    it('se a fonte falhar, o app abre mesmo assim, com a fonte do aparelho', async () => {
        fontes.mockReturnValue([false, new Error('sem fonte')]);
        await abrirEm('/');

        expect(await screen.findByText('Olá, Tiago')).toBeOnTheScreen();
        expect(SplashScreen.hide).toHaveBeenCalled();
    });
});

const DIA = 24 * 60 * 60 * 1000;
const botao = (nome: string) => screen.getByRole('button', { name: nome });

// A lição do MDA até a verificação: fica aguardando a revisão, 7 dias depois.
function mdaAteAVerificacao(quando = Date.now()) {
    responder('pre', 'mda_a1', quando, false);
    responder('pratica', 'mda_p1', quando);
    responder('pos', 'mda_b1', quando);
}

// O cartão "Para hoje" aponta um passo só, entre todas as lições (item 30).
describe('o Para hoje da home', () => {
    it('conta nova: sugere a primeira lição, e o botão abre o primeiro passo dela', async () => {
        const rotas = await abrirEm('/');
        const user = userEvent.setup();

        expect(await screen.findByText('Framework MDA')).toBeOnTheScreen();
        expect(screen.getByText('Lição nova')).toBeOnTheScreen();
        await user.press(botao('Começar'));

        expect(await screen.findByText('Enunciado de mda_a1')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/licoes/mda/diagnostico');
        // Sair do passo volta para a lição, e não direto para a home.
        await user.press(botao('Sair do bloco'));
        expect(await screen.findByLabelText('Diagnóstico, agora, 1 questão')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/licoes/mda');
    });

    it('sem o termo aceito, o botão leva à página da lição, que explica o termo', async () => {
        mockSessao.perfil = { ...COM_TERMO, formaPre: undefined, consentiuEm: undefined };
        const rotas = await abrirEm('/');

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Começar' }));

        expect(await screen.findByText(/você lê e aceita o termo/)).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/licoes/mda');
    });

    it('lição pela metade vem antes de uma lição nova, e diz onde a pessoa parou', async () => {
        responder('pratica', 'gdd_p1');
        repo.questoes.push(questao('gdd_p2', 'pratica', 2, 'gdd'));
        const rotas = await abrirEm('/');

        expect(await screen.findByText('GDD')).toBeOnTheScreen();
        expect(screen.getByText('Cartão e prática · 1 de 2')).toBeOnTheScreen();
        await userEvent.setup().press(botao('Continuar a prática'));

        expect(await screen.findByText('Enunciado de gdd_p2')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/licoes/gdd/pratica');
    });

    it('revisão que venceu vem antes de tudo', async () => {
        mdaAteAVerificacao(Date.now() - 7 * DIA);
        responder('pratica', 'gdd_p1');
        repo.questoes.push(questao('gdd_p2', 'pratica', 2, 'gdd'));
        const rotas = await abrirEm('/');

        expect(await screen.findByText('Revisão de Framework MDA')).toBeOnTheScreen();
        await userEvent.setup().press(botao('Fazer a revisão'));

        expect(await screen.findByText('Enunciado de mda_b1')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/licoes/mda/revisao');
    });

    it('com tudo feito e uma revisão por vir, está em dia, sem botão, e lista a revisão agendada', async () => {
        mdaAteAVerificacao(Date.now() - 2 * DIA);
        responder('pratica', 'gdd_p1');
        responder('pratica', 'ux_p1');
        await abrirEm('/');

        expect(await screen.findByText('Tudo em dia')).toBeOnTheScreen();
        expect(screen.getByText('Próxima revisão: Framework MDA, em 5 dias.')).toBeOnTheScreen();
        expect(screen.getByText('Revisões agendadas')).toBeOnTheScreen();
        expect(screen.getByLabelText('Framework MDA, em 5 dias')).toBeOnTheScreen();
        expect(screen.queryByRole('button', { name: 'Começar' })).toBeNull();
    });

    it('sem revisão agendada, a seção das revisões não aparece', async () => {
        await abrirEm('/');
        await screen.findByText('Para hoje');

        expect(screen.queryByText('Revisões agendadas')).toBeNull();
    });

    it('com todas as lições concluídas, diz isso', async () => {
        mdaAteAVerificacao(Date.now() - 8 * DIA);
        responder('reteste', 'mda_b1');
        responder('pratica', 'gdd_p1');
        responder('pratica', 'ux_p1');
        await abrirEm('/');

        expect(await screen.findByText('Você concluiu todas as lições.')).toBeOnTheScreen();
    });

    // O app fica dias na memória do celular. Quem volta no dia da revisão não troca de tela,
    // então a home precisa refazer a conta ao voltar a ficar ativa.
    it('quem deixou o app aberto e volta no dia da revisão encontra a revisão', async () => {
        const ouvintes: ((estado: AppStateStatus) => void)[] = [];
        jest.spyOn(AppState, 'addEventListener').mockImplementation((_evento, ouvinte) => {
            ouvintes.push(ouvinte as (estado: AppStateStatus) => void);
            return { remove: () => {} };
        });
        mdaAteAVerificacao();
        responder('pratica', 'gdd_p1');
        responder('pratica', 'ux_p1');
        await abrirEm('/');
        await screen.findByText('Tudo em dia');

        jest.setSystemTime(Date.now() + 8 * DIA);
        await act(async () => {
            ouvintes.forEach((ouvinte) => ouvinte('active'));
        });

        expect(await screen.findByText('Revisão de Framework MDA')).toBeOnTheScreen();
        jest.restoreAllMocks();
    });

    it('se a leitura falha, avisa e deixa tentar de novo', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        repo.falhaAoCarregar = true;
        await abrirEm('/');
        expect(await screen.findByText(/Não foi possível carregar as lições/)).toBeOnTheScreen();

        repo.falhaAoCarregar = false;
        await userEvent.setup().press(botao('Tentar de novo'));

        expect(await screen.findByText('Framework MDA')).toBeOnTheScreen();
        jest.restoreAllMocks();
    });
});

describe('os selos da home', () => {
    it('sem nada à vista, não há total de XP nem sequência', async () => {
        await abrirEm('/');
        await screen.findByText('Para hoje');

        expect(screen.queryByText(/^XP:/)).toBeNull();
        expect(screen.queryByText(/^Sequência:/)).toBeNull();
    });

    it('com o diagnóstico feito e a lição pela metade, o total continua escondido: ele revelaria o acerto', async () => {
        responder('pre', 'mda_a1');
        await abrirEm('/');
        await screen.findByText('Sequência: 1 dia');

        expect(screen.queryByText(/^XP:/)).toBeNull();
    });

    it('a prática entra no total na hora, e a sequência conta o dia de hoje', async () => {
        // A resposta do teste é um acerto em Palpite: +1.
        responder('pratica', 'gdd_p1');
        await abrirEm('/');

        expect(await screen.findByText('XP: +1')).toBeOnTheScreen();
        expect(screen.getByText('Sequência: 1 dia')).toBeOnTheScreen();
    });
});

describe('os atalhos da home', () => {
    it.each([
        ['Lições', '/licoes'],
        ['Progresso', '/progresso'],
        ['Perfil', '/perfil'],
    ])('%s está liberado e abre a sua tela', async (nome, caminho) => {
        const rotas = await abrirEm('/');

        await userEvent.setup().press(await screen.findByRole('button', { name: new RegExp(`^${nome}`) }));

        expect(rotas.caminho()).toBe(caminho);
    });

    it('Lições diz quantas já foram feitas', async () => {
        responder('pratica', 'gdd_p1');
        await abrirEm('/');

        expect(await screen.findByRole('button', { name: 'Lições, 1 de 3 feita' })).toBeOnTheScreen();
    });
});

// O roteiro do piloto saiu inteiro da home e das rotas (item 30).
describe('o que saiu com o roteiro do piloto', () => {
    it('a home não fala mais em pré-teste, pós-teste, reteste nem dia 1', async () => {
        mdaAteAVerificacao();
        await abrirEm('/');
        await screen.findByText('Para hoje');

        for (const texto of [/Pré-teste/, /Pós-teste/, /Reteste/, /Continuar estudos/, /resultado do dia 1/, /Desenvolvimento/, /Próxima etapa/]) {
            expect(screen.queryByText(texto)).toBeNull();
        }
        expect(screen.queryByText('Sair')).toBeNull();
    });

    it.each(['/bloco/pre', '/bloco/pratica?topicId=mda', '/cartao/mda', '/dia-1'])(
        '%s não existe mais',
        async (url) => {
            await abrirEm(url);

            expect(await screen.findByText('Essa página não existe.')).toBeOnTheScreen();
            expect(screen.queryByText(/Enunciado de/)).toBeNull();
        }
    );
});
