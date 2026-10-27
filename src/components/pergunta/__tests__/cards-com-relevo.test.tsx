import { act, render, screen } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { escolherTema } from '@/lib/tema';

import { AlternativaItem, type EstadoDaAlternativa } from '../alternativa-item';
import { FeedbackQuestao } from '../feedback-questao';
import { SeletorConfianca } from '../seletor-confianca';

// O card "Roxo da marca + Tátil" do tema escuro: borda de baixo grossa (1,5 + 3,5 = 5) e, quando
// escolhido, o card fica "apertado": perde o relevo e desce 3 pt. No claro, tudo como antes.

async function alternativa(estado: EstadoDaAlternativa) {
    await render(
        <AlternativaItem
            letra="A"
            texto="As regras e os desafios da fase"
            estado={estado}
            marcada={estado === 'selecionada'}
            desabilitada={false}
            onPress={() => {}}
        />,
    );
    return screen.getByRole('radio');
}

async function seletor() {
    await render(<SeletorConfianca valor={3} onChange={() => {}} desabilitado={false} />);
    return {
        solto: screen.getByRole('radio', { name: 'Palpite' }),
        apertado: screen.getByRole('radio', { name: 'Tenho certeza' }),
    };
}

afterEach(async () => {
    await act(() => escolherTema('sistema'));
});

describe('no tema escuro', () => {
    beforeEach(async () => {
        await act(() => escolherTema('escuro'));
    });

    it('a alternativa solta é o card roxo com 5 de borda embaixo', async () => {
        const item = await alternativa('normal');

        expect(item).toHaveStyle({
            backgroundColor: Colors.dark.cartao,
            borderColor: Colors.dark.bordaDoCartao,
            borderBottomWidth: 5,
            marginTop: 0,
        });
    });

    it('a alternativa escolhida fica apertada: 1,5 de borda embaixo e 3 pt mais baixa', async () => {
        const item = await alternativa('selecionada');

        expect(item).toHaveStyle({
            backgroundColor: Colors.dark.cartaoSelecionado,
            borderColor: Colors.dark.bordaSelecionada,
            borderBottomWidth: 1.5,
            marginTop: 3,
        });
    });

    it('certa e errada ganham o fundo verde e o vermelho', async () => {
        expect(await alternativa('certa')).toHaveStyle({ backgroundColor: Colors.dark.fundoCerta });
        expect(await alternativa('errada')).toHaveStyle({ backgroundColor: Colors.dark.fundoErrada });
    });

    it('no seletor de confiança, o nível solto tem relevo e o escolhido fica apertado', async () => {
        const { solto, apertado } = await seletor();

        expect(solto).toHaveStyle({ backgroundColor: Colors.dark.cartao, borderBottomWidth: 5, marginTop: 0 });
        expect(apertado).toHaveStyle({
            backgroundColor: Colors.dark.cartaoSelecionado,
            borderColor: Colors.dark.bordaSelecionada,
            borderBottomWidth: 1.5,
            marginTop: 3,
        });
    });

    it('o feedback é o mesmo card, em vermelho quando erra', async () => {
        await render(
            <FeedbackQuestao
                feedback={{
                    correta: false,
                    xp: -4,
                    corretaId: 'c',
                    quadrante: 'ponto_cego',
                    explicacaoDaEscolha: 'A emoção acontece em quem joga.',
                    explicacaoDaCorreta: null,
                }}
            />,
        );

        expect(screen.getByTestId('feedback')).toHaveStyle({
            backgroundColor: Colors.dark.fundoErrada,
            borderColor: Colors.dark.erro,
            borderBottomWidth: 5,
        });
    });
});

describe('no tema claro, como antes', () => {
    beforeEach(async () => {
        await act(() => escolherTema('claro'));
    });

    it('a alternativa solta não tem relevo', async () => {
        const item = await alternativa('normal');

        expect(item).toHaveStyle({
            backgroundColor: Colors.light.backgroundElement,
            borderColor: Colors.light.borda,
            borderBottomWidth: 1.5,
            marginTop: 0,
        });
    });

    it('a alternativa escolhida não desce', async () => {
        const item = await alternativa('selecionada');

        expect(item).toHaveStyle({
            backgroundColor: Colors.light.backgroundSelected,
            borderBottomWidth: 1.5,
            marginTop: 0,
        });
    });

    it('o seletor de confiança fica no fundo da tela, sem relevo', async () => {
        const { solto, apertado } = await seletor();

        expect(solto).toHaveStyle({ backgroundColor: Colors.light.background, borderBottomWidth: 1.5 });
        expect(apertado).toHaveStyle({ backgroundColor: Colors.light.backgroundSelected, marginTop: 0 });
    });
});
