import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { repositorio } from '@/data/repositorio';
import type { Participante } from '@/lib/participante';
import type { DestinoDeEstudo } from '@/lib/passo';
import type { RepositorioFalso } from '@/test/repositorio-falso';
import type { BlocoQuestao, Fase, Question } from '@/types/domain';

import { PortaoDoRoteiro } from '../portao-do-roteiro';

// O portão só enxerga a interface ProgressRepository; aqui ele recebe a versão em memória.
jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

const repo = repositorio as unknown as RepositorioFalso;

const UID = 'u1';
const ACEITOU: Participante = { formaPre: 'A', consentiuEm: 500, susRespondidoEm: null };

const PRE: DestinoDeEstudo = { tipo: 'bloco', fase: 'pre' };
const POS: DestinoDeEstudo = { tipo: 'bloco', fase: 'pos' };
const CARTAO_MDA: DestinoDeEstudo = { tipo: 'cartao', topicId: 'mda' };
const PRATICA_MDA: DestinoDeEstudo = { tipo: 'bloco', fase: 'pratica', topicId: 'mda' };

function questao(id: string, topicId: string, bloco: BlocoQuestao, order: number): Question {
    return {
        id,
        lessonId: `licao_${topicId}`,
        topicId,
        order,
        bloco,
        dificuldade: 'basico',
        formato: 'multipla_escolha',
        enunciado: id,
        alternativas: [],
        fonte: null,
        versaoConteudo: 'v1',
    };
}

function responder(fase: Fase, questionIds: string[]) {
    for (const questionId of questionIds) {
        repo.respostas.push({
            id: `r${repo.respostas.length + 1}`,
            uid: UID,
            questionId,
            topicId: 'mda',
            attemptId: 't1',
            fase,
            escolha: 'a',
            ordemExibida: ['a', 'b', 'c', 'd'],
            correta: true,
            confianca: 1,
            tempoMs: 1,
            respondidaEm: 1_000,
        });
    }
}

// Um tópico medido, com uma questão por forma e uma de prática: o roteiro inteiro em quatro respostas.
beforeEach(() => {
    repo.reiniciar();
    repo.licoes = [{ id: 'licao_mda', title: 'Framework MDA', order: 1, topicId: 'mda' }];
    repo.questoes = [
        questao('mda_a1', 'mda', 'forma_a', 1),
        questao('mda_b1', 'mda', 'forma_b', 2),
        questao('mda_p1', 'mda', 'pratica', 3),
    ];
});

function portao(destino: DestinoDeEstudo, participante: Participante = ACEITOU) {
    return (
        <PortaoDoRoteiro
            uid={UID}
            participante={participante}
            destino={destino}
            barrado={<Text>voltou para a home</Text>}
            relogio={() => 1_000}>
            <Text>a tela pedida</Text>
        </PortaoDoRoteiro>
    );
}

const aTela = () => screen.queryByText('a tela pedida');
const barrado = () => screen.queryByText('voltou para a home');

describe('o portão do roteiro', () => {
    it('abre a tela que é a da etapa', async () => {
        await render(portao(PRE));

        expect(await screen.findByText('a tela pedida')).toBeOnTheScreen();
        expect(barrado()).toBeNull();
    });

    it('barra a tela de outra etapa, sem chegar a desenhá-la', async () => {
        await render(portao(POS));

        expect(await screen.findByText('voltou para a home')).toBeOnTheScreen();
        expect(aTela()).toBeNull();
    });

    it('na espera do reteste, barra o cartão e a prática do tópico medido', async () => {
        responder('pre', ['mda_a1']);
        responder('pratica', ['mda_p1']);
        responder('pos', ['mda_b1']);

        await render(portao(CARTAO_MDA));
        expect(await screen.findByText('voltou para a home')).toBeOnTheScreen();
        await screen.unmount();

        await render(portao(PRATICA_MDA));
        expect(await screen.findByText('voltou para a home')).toBeOnTheScreen();
        expect(aTela()).toBeNull();
    });

    it('enquanto lê o roteiro, não mostra a tela nem barra: só o indicador', async () => {
        // A leitura das respostas nunca volta.
        jest.spyOn(repo, 'getRespostas').mockReturnValueOnce(new Promise(() => {}));

        await render(portao(PRE));

        expect(aTela()).toBeNull();
        expect(barrado()).toBeNull();
        expect(screen.getByLabelText('Conferindo o roteiro')).toBeOnTheScreen();
    });

    it('sem conseguir ler o roteiro, barra: na dúvida a tela não abre', async () => {
        repo.falhaAoCarregar = true;
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        await render(portao(PRE));

        expect(await screen.findByText('voltou para a home')).toBeOnTheScreen();
        expect(aTela()).toBeNull();
    });

    // Terminar a prática muda a etapa. Se o portão decidisse de novo, tiraria a pessoa da tela
    // antes de ela ver o resultado do bloco.
    it('decide uma vez, ao abrir: a etapa muda depois e a tela continua aberta', async () => {
        responder('pre', ['mda_a1']);
        await render(portao(PRATICA_MDA));
        await screen.findByText('a tela pedida');

        responder('pratica', ['mda_p1']); // a etapa agora é o pós
        // O perfil mudou (outro objeto de participante), o que faria o roteiro ser lido de novo.
        await screen.rerender(portao(PRATICA_MDA, { ...ACEITOU, consentiuEm: 600 }));
        await screen.rerender(portao(PRATICA_MDA, { ...ACEITOU, consentiuEm: 600 }));

        expect(aTela()).toBeOnTheScreen();
        expect(barrado()).toBeNull();
    });
});
