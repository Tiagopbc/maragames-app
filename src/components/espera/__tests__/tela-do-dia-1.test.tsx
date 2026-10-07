import { render, screen, userEvent } from '@testing-library/react-native';

import { repositorio } from '@/data/repositorio';
import type { RepositorioFalso } from '@/test/repositorio-falso';
import type { BlocoQuestao, Confianca, Fase, Question } from '@/types/domain';

import { TelaDoDia1 } from '../tela-do-dia-1';

// A tela só enxerga a interface ProgressRepository; aqui ela recebe a versão em memória.
jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

const repo = repositorio as unknown as RepositorioFalso;

const UID = 'u1';
const aoSair = jest.fn();

function questao(id: string, topicId: string, bloco: BlocoQuestao, order: number): Question {
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

function responder(fase: Fase, questionId: string, correta: boolean, confianca: Confianca) {
    repo.respostas.push({
        id: `r${repo.respostas.length + 1}`,
        uid: UID,
        questionId,
        topicId: questionId.split('_')[0],
        attemptId: 't1',
        fase,
        escolha: 'a',
        ordemExibida: ['a', 'b', 'c', 'd'],
        correta,
        confianca,
        tempoMs: 1,
        respondidaEm: 1_000,
    });
}

// Dois tópicos medidos e um da trilha diária. Quem tem forma A no pré faz a forma B no pós.
beforeEach(() => {
    aoSair.mockClear();
    repo.reiniciar();
    repo.licoes = [
        { id: 'licao_mda', title: 'Framework MDA', order: 1, topicId: 'mda' },
        { id: 'licao_engine', title: 'Escolhendo a Engine Certa', order: 2, topicId: 'engine' },
        { id: 'licao_gdd', title: 'GDD', order: 3, topicId: 'gdd' },
    ];
    repo.questoes = [
        questao('mda_a1', 'mda', 'forma_a', 1),
        questao('mda_b1', 'mda', 'forma_b', 2),
        questao('mda_p1', 'mda', 'pratica', 3),
        questao('engine_a1', 'engine', 'forma_a', 1),
        questao('engine_b1', 'engine', 'forma_b', 2),
        questao('engine_p1', 'engine', 'pratica', 3),
        questao('gdd_p1', 'gdd', 'pratica', 1),
    ];
    // Pré todo errado com certeza; pós com um acerto firme e um ponto cego.
    responder('pre', 'mda_a1', false, 3);
    responder('pre', 'engine_a1', false, 3);
    responder('pos', 'mda_b1', true, 3);
    responder('pos', 'engine_b1', false, 3);
});

async function abrir() {
    await render(<TelaDoDia1 uid={UID} formaPre="A" aoSair={aoSair} />);
}

describe('a tela Seu dia 1', () => {
    it('mostra o resultado do pós-teste: XP, acertos e quadrantes', async () => {
        await abrir();

        expect(await screen.findByText('Seu dia 1')).toBeOnTheScreen();
        // Acerto com certeza vale +3 e erro com certeza vale −4: saldo de −1.
        expect(screen.getByText('−1 XP')).toBeOnTheScreen();
        expect(screen.getByText('Acertou 1 de 2')).toBeOnTheScreen();
        expect(screen.getByLabelText('Firme: 1')).toBeOnTheScreen();
        expect(screen.getByLabelText('Ponto cego: 1')).toBeOnTheScreen();
    });

    it('só o pós entra na conta: o pré, todo errado, não aparece', async () => {
        await abrir();
        await screen.findByText('Seu dia 1');

        expect(screen.queryByText('Acertou 1 de 4')).toBeNull();
        expect(screen.queryByLabelText('Ponto cego: 3')).toBeNull();
    });

    it('lista os tópicos medidos como travados até o reteste, com o motivo', async () => {
        await abrir();

        expect(await screen.findByText('Travados até o reteste')).toBeOnTheScreen();
        expect(screen.getByLabelText('Framework MDA, travado')).toBeOnTheScreen();
        expect(screen.getByLabelText('Escolhendo a Engine Certa, travado')).toBeOnTheScreen();
        expect(
            screen.getByText('Eles voltam no reteste. Revisar antes mudaria o que estamos medindo.')
        ).toBeOnTheScreen();
    });

    it('tópico da trilha diária não é travado', async () => {
        await abrir();
        await screen.findByText('Travados até o reteste');

        expect(screen.queryByLabelText('GDD, travado')).toBeNull();
    });

    // Essas questões voltam no reteste: dizer quais a pessoa errou ensinaria o que vai ser medido.
    it('não mostra enunciado nem gabarito de nenhuma questão', async () => {
        await abrir();
        await screen.findByText('Seu dia 1');

        expect(screen.queryByText(/Enunciado de/)).toBeNull();
    });

    it('o X volta para o início', async () => {
        await abrir();
        await screen.findByText('Seu dia 1');

        await userEvent.setup().press(screen.getByRole('button', { name: 'Voltar ao início' }));

        expect(aoSair).toHaveBeenCalledTimes(1);
    });

    it('se a leitura falha, avisa e deixa tentar de novo', async () => {
        repo.falhaAoCarregar = true;
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        await abrir();

        expect(
            await screen.findByText('Não foi possível carregar o seu resultado. Confira a conexão e tente de novo.')
        ).toBeOnTheScreen();

        repo.falhaAoCarregar = false;
        await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar de novo' }));

        expect(await screen.findByText('−1 XP')).toBeOnTheScreen();
    });
});
