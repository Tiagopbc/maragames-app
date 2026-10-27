import { act, render, screen } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { escolherTema } from '@/lib/tema';

import { BotaoPrincipal } from '../botao-principal';
import { BotaoSecundario } from '../botao-secundario';

// No escuro, os botões ganham o relevo dos cards: o principal, uma borda de baixo roxa; o
// secundário vira o card roxo. No claro, ficam como antes.

async function abrir() {
    await render(
        <>
            <BotaoPrincipal rotulo="Próximo" onPress={() => {}} />
            <BotaoSecundario rotulo="Voltar" onPress={() => {}} />
        </>,
    );
    return {
        principal: screen.getByRole('button', { name: 'Próximo' }),
        secundario: screen.getByRole('button', { name: 'Voltar' }),
    };
}

afterEach(async () => {
    await act(() => escolherTema('sistema'));
});

describe('no tema escuro', () => {
    beforeEach(async () => {
        await act(() => escolherTema('escuro'));
    });

    it('o botão principal tem o relevo roxo embaixo', async () => {
        const { principal } = await abrir();

        expect(principal).toHaveStyle({ borderBottomWidth: 3.5, borderBottomColor: Colors.dark.relevoDoBotao });
    });

    it('o botão secundário é o card roxo com relevo', async () => {
        const { secundario } = await abrir();

        expect(secundario).toHaveStyle({
            backgroundColor: Colors.dark.cartao,
            borderColor: Colors.dark.bordaDoCartao,
            borderBottomWidth: 5,
        });
    });
});

describe('no tema claro, como antes', () => {
    beforeEach(async () => {
        await act(() => escolherTema('claro'));
    });

    it('o botão principal não tem borda', async () => {
        const { principal } = await abrir();

        expect(principal).toHaveStyle({ borderBottomWidth: 0 });
    });

    it('o botão secundário é só contorno', async () => {
        const { secundario } = await abrir();

        expect(secundario).toHaveStyle({ borderColor: Colors.light.borda, borderBottomWidth: 1.5 });
        expect(secundario).not.toHaveStyle({ backgroundColor: Colors.light.cartao });
    });
});
