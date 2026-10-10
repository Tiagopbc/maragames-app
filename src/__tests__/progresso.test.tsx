import { userEvent } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

import { repositorio } from '@/data/repositorio';
import type { RepositorioFalso } from '@/test/repositorio-falso';
import type { BlocoQuestao, Fase, Question } from '@/types/domain';

// Este teste fica fora de `src/app` de propósito: lá dentro, todo arquivo vira rota.

jest.mock('@/lib/session', () => ({
    SessionProvider: ({ children }: { children: unknown }) => children,
    useSession: () => ({
        user: { uid: 'u1' },
        perfil: { uid: 'u1', apelido: 'Tiago', formaPre: 'A', consentiuEm: 500 },
        perfilCompleto: true,
        isLoading: false,
        sair: jest.fn(),
    }),
}));

jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hide: jest.fn() }));
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));

const repo = repositorio as unknown as RepositorioFalso;
const DIA = 24 * 60 * 60 * 1000;

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
        alternativas: [],
        fonte: null,
        versaoConteudo: 'v1',
    };
}

// Toda resposta do teste é dada com certeza: acerto vale +3 e é Firme; erro vale −4 e é Ponto cego.
function respondida(fase: Fase, questionId: string, quando = Date.now(), correta = true) {
    repo.respostas.push({
        id: `r${repo.respostas.length + 1}`,
        uid: 'u1',
        questionId,
        topicId: questionId.split('_')[0],
        attemptId: 't0',
        fase,
        escolha: correta ? 'a' : 'b',
        ordemExibida: ['a', 'b', 'c', 'd'],
        correta,
        confianca: 3,
        tempoMs: 1,
        respondidaEm: quando,
    });
}

// O dia e o mês de um instante em São Luís (UTC−3), como o histórico mostra.
function diaEMes(ms: number): string {
    const local = new Date(ms - 3 * 60 * 60 * 1000);
    return `${String(local.getUTCDate()).padStart(2, '0')}/${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

const HA_DOIS_DIAS = () => Date.now() - 2 * DIA;

// MDA até a verificação, há dois dias: diagnóstico errado, prática e verificação certas.
function mdaAteAVerificacao() {
    const quando = HA_DOIS_DIAS();
    respondida('pre', 'mda_a1', quando, false);
    respondida('pratica', 'mda_p1', quando);
    respondida('pos', 'mda_b1', quando);
}

beforeEach(() => {
    (useFonts as jest.Mock).mockReturnValue([true, null]);
    repo.reiniciar();
    repo.licoes = [
        { id: 'licao_mda', title: 'Framework MDA', order: 1, topicId: 'mda' },
        { id: 'licao_gdd', title: 'GDD', order: 2, topicId: 'gdd' },
    ];
    repo.questoes = [
        questao('mda_a1', 'forma_a', 1),
        questao('mda_b1', 'forma_b', 2),
        questao('mda_p1', 'pratica', 3),
        questao('gdd_p1', 'pratica', 1),
    ];
});

async function abrirEm(url: string) {
    const rotas = renderRouter('./src/app', { initialUrl: url });
    await rotas;
    return { caminho: () => rotas.getPathname() };
}

const botao = (nome: string) => screen.getByRole('button', { name: nome });

describe('a tela de Progresso', () => {
    it('sem nada para mostrar, explica quando os números aparecem', async () => {
        await abrirEm('/progresso');

        expect(await screen.findByText('Ainda não há respostas para mostrar.')).toBeOnTheScreen();
        expect(screen.queryByText(/XP/)).toBeNull();
    });

    it('diagnóstico feito e lição pela metade: nada do diagnóstico vira número', async () => {
        respondida('pre', 'mda_a1', Date.now(), false);
        await abrirEm('/progresso');

        expect(await screen.findByText('Ainda não há respostas para mostrar.')).toBeOnTheScreen();
        expect(screen.queryByLabelText('Ponto cego: 1')).toBeNull();
    });

    it('mostra o XP total, a sequência, os quadrantes e o acerto por confiança do que já apareceu', async () => {
        mdaAteAVerificacao();
        respondida('pratica', 'gdd_p1');
        await abrirEm('/progresso');

        // −4 do diagnóstico e +3 de cada uma das outras três.
        expect(await screen.findByText('+5 XP')).toBeOnTheScreen();
        // O rótulo "Sequência" já diz o que é; o valor cabe numa linha no celular.
        expect(screen.getByText('1 dia')).toBeOnTheScreen();
        expect(screen.queryByText(/seguido/)).toBeNull();
        expect(screen.getByLabelText('Firme: 3')).toBeOnTheScreen();
        expect(screen.getByLabelText('Ponto cego: 1')).toBeOnTheScreen();
        expect(screen.getByLabelText('Tenho certeza: 3 de 4')).toBeOnTheScreen();
        expect(screen.getByLabelText('Palpite: sem respostas')).toBeOnTheScreen();
    });

    it('Meu domínio lista cada lição com resposta à vista: domínio, antes e depois e pontos cegos', async () => {
        mdaAteAVerificacao();
        respondida('pratica', 'gdd_p1');
        await abrirEm('/progresso');

        expect(await screen.findByRole('button', { name: 'Framework MDA, domínio 2 de 3' })).toBeOnTheScreen();
        expect(screen.getByText('Antes 0 de 1 → Depois 1 de 1')).toBeOnTheScreen();
        expect(botao('GDD, domínio 1 de 1')).toBeOnTheScreen();
    });

    it('O que revisar primeiro vem antes dos quadrantes e diz em que assunto a pessoa está pior', async () => {
        mdaAteAVerificacao();
        respondida('pratica', 'gdd_p1');
        await abrirEm('/progresso');

        // O MDA tem um ponto cego (o diagnóstico); o GDD está todo firme e não entra.
        expect(await screen.findByRole('button', { name: 'Revisar Framework MDA, 1 ponto cego' })).toBeOnTheScreen();
        expect(screen.queryByRole('button', { name: /^Revisar GDD/ })).toBeNull();
        const titulos = screen.getAllByText(/^(O que revisar primeiro|Como você respondeu|Meu domínio)$/).map((t) => t.props.children);
        expect(titulos).toEqual(['O que revisar primeiro', 'Como você respondeu', 'Meu domínio']);
    });

    it('tocar numa lição a revisar abre o detalhe dela', async () => {
        mdaAteAVerificacao();
        const rotas = await abrirEm('/progresso');

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Revisar Framework MDA, 1 ponto cego' }));

        expect(await screen.findByText('Histórico')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/progresso/mda');
    });

    it('com tudo firme, diz que não há o que revisar', async () => {
        respondida('pratica', 'gdd_p1');
        await abrirEm('/progresso');

        expect(await screen.findByText('Nada a revisar: tudo o que você respondeu está firme.')).toBeOnTheScreen();
    });

    it('mostra só as três lições mais fracas, da pior para a melhor; Meu domínio segue a mesma ordem, com todas', async () => {
        for (const [i, t] of ['a', 'b', 'c', 'd'].entries()) {
            repo.licoes.push({ id: `licao_${t}`, title: `Lição ${t.toUpperCase()}`, order: 10 + i, topicId: t });
            // A tem 1 erro, B tem 2, C tem 3 e D tem 4, todos com certeza.
            for (let n = 1; n <= i + 1; n++) {
                repo.questoes.push(questao(`${t}_p${n}`, 'pratica', n));
                respondida('pratica', `${t}_p${n}`, Date.now(), false);
            }
        }
        await abrirEm('/progresso');
        await screen.findByText('O que revisar primeiro');

        const aRevisar = screen.getAllByRole('button', { name: /^Revisar / }).map((b) => b.props.accessibilityLabel);
        expect(aRevisar).toEqual([
            'Revisar Lição D, 4 pontos cegos',
            'Revisar Lição C, 3 pontos cegos',
            'Revisar Lição B, 2 pontos cegos',
        ]);
        const dominio = screen.getAllByRole('button', { name: /, domínio / }).map((b) => b.props.accessibilityLabel);
        expect(dominio).toEqual([
            'Lição D, domínio 0 de 4',
            'Lição C, domínio 0 de 3',
            'Lição B, domínio 0 de 2',
            'Lição A, domínio 0 de 1',
        ]);
    });

    it('tocar numa lição abre o detalhe dela', async () => {
        mdaAteAVerificacao();
        const rotas = await abrirEm('/progresso');

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Framework MDA, domínio 2 de 3' }));

        expect(await screen.findByText('Histórico')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/progresso/mda');
    });
});

describe('o detalhe do tópico', () => {
    it('mostra o domínio, o antes e depois, os quadrantes e o histórico com as datas', async () => {
        mdaAteAVerificacao();
        await abrirEm('/progresso/mda');

        expect(await screen.findByText('Framework MDA')).toBeOnTheScreen();
        expect(screen.getByText('Domínio 2 de 3')).toBeOnTheScreen();
        expect(screen.getByText('Antes 0 de 1 → Depois 1 de 1')).toBeOnTheScreen();
        expect(screen.getByLabelText('Firme: 2')).toBeOnTheScreen();
        expect(screen.getByLabelText('Ponto cego: 1')).toBeOnTheScreen();
        const dia = diaEMes(HA_DOIS_DIAS());
        expect(screen.getByText(`Diagnóstico · ${dia}`)).toBeOnTheScreen();
        expect(screen.getByText(`Prática · ${dia}`)).toBeOnTheScreen();
        expect(screen.getByText(`Verificação · ${dia}`)).toBeOnTheScreen();
    });

    it('lista as questões da prática a revisar, com o enunciado, e nunca as dos blocos sem feedback', async () => {
        mdaAteAVerificacao();
        repo.respostas[1].correta = false; // a prática do MDA vira ponto cego
        await abrirEm('/progresso/mda');

        expect(await screen.findByText('O que revisar na prática')).toBeOnTheScreen();
        expect(screen.getByText('Enunciado de mda_p1')).toBeOnTheScreen();
        // O diagnóstico também foi errado, mas a questão dele não é citada.
        expect(screen.queryByText('Enunciado de mda_a1')).toBeNull();
        expect(screen.queryByText('Enunciado de mda_b1')).toBeNull();
    });

    it('lição pela metade: o histórico diz que o diagnóstico foi feito, sem nenhum número dele', async () => {
        const ontem = Date.now() - DIA;
        respondida('pre', 'mda_a1', ontem, false);
        await abrirEm('/progresso/mda');

        expect(await screen.findByText(`Diagnóstico · ${diaEMes(ontem)}`)).toBeOnTheScreen();
        expect(screen.getByText('Ainda não há respostas para mostrar.')).toBeOnTheScreen();
        expect(screen.queryByLabelText('Ponto cego: 1')).toBeNull();
        expect(screen.queryByText(/Domínio/)).toBeNull();
    });

    it('Abrir a lição leva à página dela', async () => {
        mdaAteAVerificacao();
        const rotas = await abrirEm('/progresso/mda');

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Abrir a lição' }));

        expect(await screen.findByLabelText('Revisão, em espera, Abre em 5 dias')).toBeOnTheScreen();
        expect(rotas.caminho()).toBe('/licoes/mda');
    });

    it('tópico que não é lição avisa', async () => {
        await abrirEm('/progresso/nada');

        expect(await screen.findByText('Essa lição não existe.')).toBeOnTheScreen();
    });
});
