import { act, render, screen, userEvent } from '@testing-library/react-native';

import { TERMO } from '@/constants/termo';

import { TelaDeConsentimento } from '../tela-de-consentimento';

const aoSair = jest.fn();

beforeEach(() => {
    aoSair.mockClear();
});

const caixa = () => screen.getByRole('checkbox', { name: 'Li e concordo em participar' });
const aceitar = () => screen.getByRole('button', { name: 'Aceitar e começar' });

describe('a tela de consentimento', () => {
    it('mostra todas as seções do termo', async () => {
        await render(<TelaDeConsentimento aoAceitar={jest.fn()} aoSair={aoSair} />);

        for (const secao of TERMO) {
            expect(screen.getByText(secao.titulo)).toBeOnTheScreen();
            expect(screen.getByText(secao.texto)).toBeOnTheScreen();
        }
    });

    it('mostra o mascote, que é enfeite e não é lido pelo leitor de tela', async () => {
        await render(<TelaDeConsentimento aoAceitar={jest.fn()} aoSair={aoSair} />);

        expect(screen.getByTestId('mascote')).toBeOnTheScreen();
        expect(screen.queryByRole('image')).toBeNull();
    });

    it('começa com a caixa desmarcada e o aceite desabilitado', async () => {
        await render(<TelaDeConsentimento aoAceitar={jest.fn()} aoSair={aoSair} />);

        expect(caixa()).not.toBeChecked();
        expect(aceitar()).toBeDisabled();
    });

    it('tocar no aceite sem marcar a caixa não registra nada', async () => {
        const aoAceitar = jest.fn().mockResolvedValue(undefined);
        await render(<TelaDeConsentimento aoAceitar={aoAceitar} aoSair={aoSair} />);

        await userEvent.setup().press(aceitar());

        expect(aoAceitar).not.toHaveBeenCalled();
    });

    it('marcar a caixa habilita o aceite, e desmarcar desabilita de novo', async () => {
        await render(<TelaDeConsentimento aoAceitar={jest.fn()} aoSair={aoSair} />);
        const user = userEvent.setup();

        await user.press(caixa());
        expect(caixa()).toBeChecked();
        expect(aceitar()).toBeEnabled();

        await user.press(caixa());
        expect(aceitar()).toBeDisabled();
    });

    it('aceitar registra o consentimento uma vez', async () => {
        const aoAceitar = jest.fn().mockResolvedValue(undefined);
        await render(<TelaDeConsentimento aoAceitar={aoAceitar} aoSair={aoSair} />);
        const user = userEvent.setup();

        await user.press(caixa());
        await user.press(aceitar());

        expect(aoAceitar).toHaveBeenCalledTimes(1);
    });

    it('enquanto o aceite está sendo gravado, um segundo toque não registra de novo', async () => {
        let concluir = () => {};
        const aoAceitar = jest.fn(() => new Promise<void>((resolve) => (concluir = resolve)));
        await render(<TelaDeConsentimento aoAceitar={aoAceitar} aoSair={aoSair} />);
        const user = userEvent.setup();
        await user.press(caixa());

        await user.press(aceitar());
        await user.press(aceitar());

        expect(aoAceitar).toHaveBeenCalledTimes(1);
        expect(aceitar()).toBeBusy();

        // Solta a gravação pendente para a tela terminar de se atualizar dentro do teste.
        await act(async () => concluir());
        expect(aceitar()).not.toBeBusy();
    });

    it('"Agora não" sai sem registrar consentimento', async () => {
        const aoAceitar = jest.fn();
        await render(<TelaDeConsentimento aoAceitar={aoAceitar} aoSair={aoSair} />);
        const user = userEvent.setup();
        await user.press(caixa());

        await user.press(screen.getByRole('button', { name: 'Agora não' }));

        expect(aoSair).toHaveBeenCalledTimes(1);
        expect(aoAceitar).not.toHaveBeenCalled();
    });

    it('se a gravação falha, avisa e deixa tentar de novo', async () => {
        // A tela avisa no console quando o aceite falha; aqui a falha é provocada de propósito.
        const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const aoAceitar = jest.fn().mockRejectedValueOnce(new Error('sem rede')).mockResolvedValue(undefined);
        await render(<TelaDeConsentimento aoAceitar={aoAceitar} aoSair={aoSair} />);
        const user = userEvent.setup();
        await user.press(caixa());

        await user.press(aceitar());

        expect(
            await screen.findByText('Não foi possível registrar o seu aceite. Confira a conexão e tente de novo.')
        ).toBeOnTheScreen();
        expect(caixa()).toBeChecked();
        expect(aceitar()).toBeEnabled();

        await user.press(aceitar());

        expect(aoAceitar).toHaveBeenCalledTimes(2);
        aviso.mockRestore();
    });
});
