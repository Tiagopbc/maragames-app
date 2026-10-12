import { userEvent } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

import { repositorio } from '@/data/repositorio';
import type { RepositorioFalso } from '@/test/repositorio-falso';
import type { BlocoQuestao, Question } from '@/types/domain';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

const COM_TERMO = { uid: 'u1', apelido: 'Tiago', formaPre: 'A', consentiuEm: 500 };
const SEM_TERMO = { uid: 'u1', apelido: 'Tiago' };
// A sessão muda dentro do teste (aceite do termo, autoavaliação gravada).
const mockSessao: { perfil: Record<string, unknown>; precisa: boolean; falha: boolean } = {
    perfil: {},
    precisa: true,
    falha: false,
};
const mockRegistrar = jest.fn(async (_notas: Record<string, number>) => {
    if (mockSessao.falha) throw new Error('sem rede');
    mockSessao.precisa = false;
});

jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1' },
        perfil: mockSessao.perfil,
        perfilCompleto: true,
        isLoading: false,
        sair: jest.fn(),
        aceitarConsentimento: async () => {
            mockSessao.perfil = { ...mockSessao.perfil, formaPre: 'A', consentiuEm: 500 };
        },
        precisaDaAutoavaliacao: mockSessao.precisa,
        registrarAutoavaliacao: mockRegistrar,
    }),
}));

jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hide: jest.fn() }));
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));

const repo = repositorio as unknown as RepositorioFalso;

function questao(id: string, bloco: BlocoQuestao, order: number): Question {
    const topicId = id.split('_')[0];
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

// Duas lições de ciclo completo, em dois módulos.
beforeEach(() => {
    (useFonts as jest.Mock).mockReturnValue([true, null]);
    mockSessao.perfil = COM_TERMO;
    mockSessao.precisa = true;
    mockSessao.falha = false;
    mockRegistrar.mockClear();
    repo.reiniciar();
    repo.licoes = [
        { id: 'licao_mda', title: 'Framework MDA', order: 1, topicId: 'mda', modulo: 'Fundamentos de Game Design' },
        { id: 'licao_pixel', title: 'Pixel Art Básico', order: 2, topicId: 'pixel', modulo: 'Arte & Pixel Art' },
    ];
    repo.questoes = [
        questao('mda_a1', 'forma_a', 1),
        questao('mda_b1', 'forma_b', 2),
        questao('mda_p1', 'pratica', 3),
        questao('pixel_a1', 'forma_a', 1),
        questao('pixel_b1', 'forma_b', 2),
        questao('pixel_p1', 'pratica', 3),
    ];
});

async function abrirEm(url: string) {
    const rotas = renderRouter('./src/app', { initialUrl: url });
    await rotas;
    return { user: userEvent.setup(), caminho: () => rotas.getPathname() };
}

const botao = (nome: string) => screen.getByRole('button', { name: nome });
const nota = (modulo: string, valor: number) => screen.getByRole('radio', { name: `${modulo}: nota ${valor} de 5` });

describe('a autoavaliação antes do primeiro diagnóstico', () => {
    it('com o termo aceito e sem autoavaliação, Começar abre as notas, e não o diagnóstico', async () => {
        const { user, caminho } = await abrirEm('/licoes/mda');

        await user.press(await screen.findByRole('button', { name: 'Começar' }));

        expect(await screen.findByText('Quanto você acha que já sabe de cada área?')).toBeOnTheScreen();
        expect(caminho()).toBe('/autoavaliacao');
        expect(screen.getByText('Fundamentos de Game Design')).toBeOnTheScreen();
        expect(screen.getByText('Arte & Pixel Art')).toBeOnTheScreen();
        expect(screen.queryByText('Enunciado de mda_a1')).toBeNull();
    });

    it('sem nota em todas as áreas, não grava e diz o que falta', async () => {
        const { user } = await abrirEm('/autoavaliacao');
        await screen.findByText('Quanto você acha que já sabe de cada área?');

        await user.press(nota('Fundamentos de Game Design', 2));
        await user.press(botao('Continuar'));

        expect(await screen.findByText('Dê uma nota para cada área para continuar.')).toBeOnTheScreen();
        expect(mockRegistrar).not.toHaveBeenCalled();
    });

    it('com todas as notas, grava pelo id do módulo e volta para a lição, que abre o diagnóstico', async () => {
        const { user, caminho } = await abrirEm('/licoes/mda');

        await user.press(await screen.findByRole('button', { name: 'Começar' }));
        await screen.findByText('Quanto você acha que já sabe de cada área?');
        await user.press(nota('Fundamentos de Game Design', 2));
        await user.press(nota('Arte & Pixel Art', 4));
        await user.press(botao('Continuar'));

        expect(mockRegistrar).toHaveBeenCalledWith({ fundamentos_de_game_design: 2, arte_pixel_art: 4 });
        expect(await screen.findByText('Framework MDA')).toBeOnTheScreen();
        expect(caminho()).toBe('/licoes/mda');

        await user.press(botao('Começar'));

        expect(await screen.findByText('Enunciado de mda_a1')).toBeOnTheScreen();
    });

    it('se gravar falha, avisa e deixa tentar de novo', async () => {
        mockSessao.falha = true;
        const { user, caminho } = await abrirEm('/autoavaliacao');
        await screen.findByText('Quanto você acha que já sabe de cada área?');

        await user.press(nota('Fundamentos de Game Design', 1));
        await user.press(nota('Arte & Pixel Art', 1));
        await user.press(botao('Continuar'));

        expect(await screen.findByText(/Não foi possível gravar as suas notas/)).toBeOnTheScreen();
        expect(caminho()).toBe('/autoavaliacao');
    });

    it('quem já respondeu vai direto ao diagnóstico', async () => {
        mockSessao.precisa = false;
        const { user } = await abrirEm('/licoes/mda');

        await user.press(await screen.findByRole('button', { name: 'Começar' }));

        expect(await screen.findByText('Enunciado de mda_a1')).toBeOnTheScreen();
    });

    it('quem já respondeu e abre o endereço das notas volta para o início', async () => {
        mockSessao.precisa = false;
        const { caminho } = await abrirEm('/autoavaliacao');

        expect(await screen.findByText('Para hoje')).toBeOnTheScreen();
        expect(caminho()).toBe('/');
    });

    it('depois do aceite do termo, as notas vêm em seguida', async () => {
        mockSessao.perfil = SEM_TERMO;
        const { user, caminho } = await abrirEm('/licoes/mda');

        await user.press(await screen.findByRole('button', { name: 'Começar' }));
        await user.press(await screen.findByRole('checkbox', { name: 'Li e concordo em participar' }));
        await user.press(botao('Aceitar e começar'));

        expect(await screen.findByText('Quanto você acha que já sabe de cada área?')).toBeOnTheScreen();
        expect(caminho()).toBe('/autoavaliacao');
    });

    it('pelo Para hoje, a lição nova abre na página dela, e não no diagnóstico', async () => {
        const { user, caminho } = await abrirEm('/');

        await user.press(await screen.findByRole('button', { name: 'Começar' }));

        expect(await screen.findByText('Diagnóstico')).toBeOnTheScreen();
        expect(caminho()).toBe('/licoes/mda');
        expect(screen.queryByText('Enunciado de mda_a1')).toBeNull();
    });
});
