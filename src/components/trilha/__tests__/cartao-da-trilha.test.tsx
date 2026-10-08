import { render, screen, userEvent } from '@testing-library/react-native';

import type { Trilha } from '@/lib/trilha';

import { CartaoDaTrilha } from '../cartao-da-trilha';

const NOMES = { gdd: 'GDD: o documento do jogo', ux: 'UX/UI em jogos' };
const aoAbrir = jest.fn();

beforeEach(() => aoAbrir.mockClear());

async function mostrar(trilha: Trilha, sequencia = 2, principal = true) {
    await render(
        <CartaoDaTrilha trilha={trilha} sequencia={sequencia} nomes={NOMES} principal={principal} aoAbrir={aoAbrir} />
    );
}

describe('o cartão da trilha diária na home', () => {
    it('com a trilha fechada, não aparece', async () => {
        await mostrar({ tipo: 'fechada' });

        expect(screen.queryByText('Tópico de hoje')).toBeNull();
        expect(screen.queryByText('Trilha diária')).toBeNull();
    });

    it('tópico de hoje: nome, tamanho, sequência e o botão Começar', async () => {
        await mostrar({ tipo: 'hoje', topicId: 'gdd', respondidas: 0, total: 6, posicao: 1, de: 5 });

        expect(screen.getByText('Tópico de hoje')).toBeOnTheScreen();
        expect(screen.getByText('GDD: o documento do jogo')).toBeOnTheScreen();
        expect(screen.getByText('Cartão curto e 6 questões')).toBeOnTheScreen();
        expect(screen.getByText('Sequência: 2 dias')).toBeOnTheScreen();
        expect(screen.getByRole('button', { name: 'Começar' })).toBeEnabled();
    });

    it('Começar avisa a tela para abrir o tópico', async () => {
        await mostrar({ tipo: 'hoje', topicId: 'gdd', respondidas: 0, total: 6, posicao: 1, de: 5 });

        await userEvent.setup().press(screen.getByRole('button', { name: 'Começar' }));

        expect(aoAbrir).toHaveBeenCalledTimes(1);
    });

    it('tópico já começado: mostra onde parou e o botão vira Continuar', async () => {
        await mostrar({ tipo: 'hoje', topicId: 'gdd', respondidas: 2, total: 6, posicao: 1, de: 5 });

        expect(screen.getByText('Prática · 2 de 6')).toBeOnTheScreen();
        expect(screen.getByRole('button', { name: 'Continuar' })).toBeOnTheScreen();
        expect(screen.queryByRole('button', { name: 'Começar' })).toBeNull();
    });

    it('sequência de um dia fica no singular, e sem sequência o selo some', async () => {
        const hoje: Trilha = { tipo: 'hoje', topicId: 'gdd', respondidas: 0, total: 6, posicao: 1, de: 5 };

        await mostrar(hoje, 1);
        expect(screen.getByText('Sequência: 1 dia')).toBeOnTheScreen();
        await screen.unmount();

        await mostrar(hoje, 0);
        expect(screen.queryByText(/Sequência/)).toBeNull();
    });

    it('feito o de hoje: diz o próximo e que libera amanhã, sem botão', async () => {
        await mostrar({ tipo: 'amanha', topicId: 'ux', liberaEm: 0, feitoHoje: 'gdd', posicao: 2, de: 5 });

        expect(screen.getByText('Trilha diária')).toBeOnTheScreen();
        expect(screen.getByText('Feito por hoje.')).toBeOnTheScreen();
        expect(screen.getByText('Próximo: UX/UI em jogos. Libera amanhã.')).toBeOnTheScreen();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('no dia do pós: a trilha começa amanhã, com o primeiro tópico', async () => {
        await mostrar({ tipo: 'amanha', topicId: 'gdd', liberaEm: 0, feitoHoje: null, posicao: 1, de: 5 });

        expect(screen.getByText('Começa amanhã.')).toBeOnTheScreen();
        expect(screen.getByText('Primeiro tópico: GDD: o documento do jogo.')).toBeOnTheScreen();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('trilha concluída: avisa que acabou', async () => {
        await mostrar({ tipo: 'concluida' });

        expect(screen.getByText('Você concluiu a trilha diária.')).toBeOnTheScreen();
        expect(screen.queryByRole('button')).toBeNull();
    });
});
