import { render, screen, userEvent } from '@testing-library/react-native';

import { repositorio } from '@/data/repositorio';
import type { RepositorioFalso } from '@/test/repositorio-falso';

import { TelaDoCartao } from '../tela-do-cartao';

// A tela só enxerga a interface ProgressRepository; aqui ela recebe a versão em memória.
jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

const repo = repositorio as unknown as RepositorioFalso;

const aoComecarPratica = jest.fn();
const aoSair = jest.fn();

beforeEach(() => {
    aoComecarPratica.mockClear();
    aoSair.mockClear();
    repo.reiniciar();
    repo.licoes = [
        {
            id: 'licao_logica',
            title: 'Lógica de Programação',
            order: 1,
            topicId: 'logica',
            cartao: [
                { titulo: 'Variáveis', texto: 'Em `x = x + 1`, o lado direito usa o valor atual.' },
                { titulo: 'Condições', texto: 'Um if escolhe um caminho.' },
                { titulo: 'Laços', texto: 'Um laço repete um bloco.' },
            ],
        },
        { id: 'licao_gdd', title: 'GDD', order: 2, topicId: 'gdd', cartao: [] },
    ];
});

async function abrir(topicId = 'logica') {
    await render(<TelaDoCartao topicId={topicId} aoComecarPratica={aoComecarPratica} aoSair={aoSair} />);
}

const botao = (nome: string) => screen.getByRole('button', { name: nome });

describe('o cartão de conceito', () => {
    it('abre no primeiro slide, com o nome do tópico e a posição', async () => {
        await abrir();

        expect(await screen.findByText('Variáveis')).toBeOnTheScreen();
        expect(screen.getByText('Lógica de Programação')).toBeOnTheScreen();
        expect(screen.getByText('1 de 3')).toBeOnTheScreen();
        expect(screen.queryByText('Condições')).not.toBeOnTheScreen();
    });

    it('mostra trecho de código sem as crases do conteúdo', async () => {
        await abrir();
        await screen.findByText('Variáveis');

        expect(screen.getAllByText(/x = x \+ 1/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/`/)).not.toBeOnTheScreen();
    });

    it('"Próximo" avança um slide', async () => {
        await abrir();
        await screen.findByText('Variáveis');

        await userEvent.setup().press(botao('Próximo'));

        expect(screen.getByText('Condições')).toBeOnTheScreen();
        expect(screen.getByText('2 de 3')).toBeOnTheScreen();
        expect(screen.queryByText('Variáveis')).not.toBeOnTheScreen();
    });

    it('"Voltar" fica desabilitado no primeiro slide', async () => {
        await abrir();
        await screen.findByText('Variáveis');

        expect(botao('Voltar')).toBeDisabled();
    });

    it('"Voltar" retorna ao slide anterior', async () => {
        await abrir();
        await screen.findByText('Variáveis');
        const user = userEvent.setup();
        await user.press(botao('Próximo'));

        await user.press(botao('Voltar'));

        expect(screen.getByText('Variáveis')).toBeOnTheScreen();
        expect(screen.getByText('1 de 3')).toBeOnTheScreen();
    });

    it('antes do último slide não há como começar a prática', async () => {
        await abrir();
        await screen.findByText('Variáveis');

        expect(screen.queryByRole('button', { name: 'Começar a prática' })).not.toBeOnTheScreen();
    });

    it('no último slide, o botão vira "Começar a prática" e leva à prática', async () => {
        await abrir();
        await screen.findByText('Variáveis');
        const user = userEvent.setup();
        await user.press(botao('Próximo'));
        await user.press(botao('Próximo'));

        expect(screen.getByText('Laços')).toBeOnTheScreen();
        expect(screen.queryByRole('button', { name: 'Próximo' })).not.toBeOnTheScreen();
        expect(aoComecarPratica).not.toHaveBeenCalled();

        await user.press(botao('Começar a prática'));

        expect(aoComecarPratica).toHaveBeenCalledTimes(1);
    });

    it('o X sai do cartão sem começar a prática', async () => {
        await abrir();
        await screen.findByText('Variáveis');

        await userEvent.setup().press(botao('Sair do cartão'));

        expect(aoSair).toHaveBeenCalledTimes(1);
        expect(aoComecarPratica).not.toHaveBeenCalled();
    });
});

describe('tópico sem cartão', () => {
    it('vai direto para a prática, uma vez só, sem mostrar tela vazia', async () => {
        await abrir('gdd');

        await screen.findByLabelText('Abrindo a prática');
        expect(aoComecarPratica).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'Próximo' })).not.toBeOnTheScreen();
    });
});

describe('quando a leitura falha', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('mostra o erro e deixa tentar de novo', async () => {
        repo.falhaAoCarregar = true;
        await abrir();
        expect(await screen.findByText(/Não foi possível carregar o cartão/)).toBeOnTheScreen();
        expect(aoComecarPratica).not.toHaveBeenCalled();

        repo.falhaAoCarregar = false;
        await userEvent.setup().press(botao('Tentar de novo'));

        expect(await screen.findByText('Variáveis')).toBeOnTheScreen();
    });
});
