import type { Question } from '../../types/domain';
import {
    SELECAO_VAZIA,
    faseTemFeedback,
    feedbackDaResposta,
    montarResposta,
    oQueFalta,
    podeConfirmar,
} from '../pergunta';

const QUESTAO: Pick<Question, 'id' | 'topicId' | 'alternativas'> = {
    id: 'mda_p1',
    topicId: 'mda',
    alternativas: [
        { id: 'a', texto: 'Mecânica', correta: true, explicacao: 'Correto: é a regra.' },
        { id: 'b', texto: 'Dinâmica', correta: false, explicacao: 'Dinâmica surge na partida.' },
        { id: 'c', texto: 'Estética', correta: false, explicacao: 'Estética é a emoção.' },
        { id: 'd', texto: 'Narrativa', correta: false, explicacao: 'Narrativa é um tipo de estética.' },
    ],
};

describe('podeConfirmar', () => {
    it('não confirma sem nada marcado', () => {
        expect(podeConfirmar(SELECAO_VAZIA)).toBe(false);
    });

    it('não confirma só com a alternativa', () => {
        expect(podeConfirmar({ escolha: 'a', confianca: null })).toBe(false);
    });

    it('não confirma só com a confiança', () => {
        expect(podeConfirmar({ escolha: null, confianca: 1 })).toBe(false);
    });

    it('confirma com as duas marcadas', () => {
        expect(podeConfirmar({ escolha: 'a', confianca: 1 })).toBe(true);
    });
});

describe('oQueFalta', () => {
    it.each([
        [{ escolha: null, confianca: null }, 'alternativa_e_confianca'],
        [{ escolha: null, confianca: 2 }, 'alternativa'],
        [{ escolha: 'b', confianca: null }, 'confianca'],
        [{ escolha: 'b', confianca: 2 }, null],
    ] as const)('%j → %s', (selecao, falta) => {
        expect(oQueFalta(selecao)).toBe(falta);
    });
});

describe('faseTemFeedback', () => {
    it('a prática mostra o resultado de cada questão', () => {
        expect(faseTemFeedback('pratica')).toBe(true);
    });

    it.each(['pre', 'pos', 'reteste'] as const)('o bloco %s não mostra nada por questão', (fase) => {
        expect(faseTemFeedback(fase)).toBe(false);
    });
});

describe('montarResposta', () => {
    const base = {
        uid: 'u1',
        attemptId: 't1',
        fase: 'pratica',
        questao: QUESTAO,
        ordemExibida: ['c', 'a', 'd', 'b'],
        tempoMs: 8200,
    } as const;

    it('monta o evento completo de uma resposta certa', () => {
        expect(montarResposta({ ...base, escolha: 'a', confianca: 3 })).toEqual({
            uid: 'u1',
            questionId: 'mda_p1',
            topicId: 'mda',
            attemptId: 't1',
            fase: 'pratica',
            escolha: 'a',
            ordemExibida: ['c', 'a', 'd', 'b'],
            correta: true,
            confianca: 3,
            tempoMs: 8200,
        });
    });

    it('marca como errada a escolha de um distrator', () => {
        expect(montarResposta({ ...base, escolha: 'b', confianca: 1 }).correta).toBe(false);
    });

    it('grava o tempo como inteiro, que é o que a regra do Firestore aceita', () => {
        expect(montarResposta({ ...base, escolha: 'a', confianca: 1, tempoMs: 1234.6 }).tempoMs).toBe(1235);
    });

    it('não deixa o tempo negativo se o relógio do aparelho voltar', () => {
        expect(montarResposta({ ...base, escolha: 'a', confianca: 1, tempoMs: -50 }).tempoMs).toBe(0);
    });

    it('recusa alternativa que não é da questão', () => {
        expect(() => montarResposta({ ...base, escolha: 'z', confianca: 1 })).toThrow();
    });
});

describe('feedbackDaResposta', () => {
    it('acerto com certeza: Firme, 3 de XP e a explicação da alternativa', () => {
        expect(feedbackDaResposta(QUESTAO, { escolha: 'a', confianca: 3 })).toEqual({
            correta: true,
            quadrante: 'firme',
            xp: 3,
            corretaId: 'a',
            explicacaoDaEscolha: 'Correto: é a regra.',
            explicacaoDaCorreta: null,
        });
    });

    it('acerto com dúvida é Frágil', () => {
        expect(feedbackDaResposta(QUESTAO, { escolha: 'a', confianca: 2 })).toMatchObject({
            quadrante: 'fragil',
            xp: 2,
        });
    });

    it('erro com certeza: Ponto cego, perde 4 e mostra também a explicação da correta', () => {
        expect(feedbackDaResposta(QUESTAO, { escolha: 'c', confianca: 3 })).toEqual({
            correta: false,
            quadrante: 'ponto_cego',
            xp: -4,
            corretaId: 'a',
            explicacaoDaEscolha: 'Estética é a emoção.',
            explicacaoDaCorreta: 'Correto: é a regra.',
        });
    });

    it('erro com palpite é Lacuna e não perde ponto', () => {
        expect(feedbackDaResposta(QUESTAO, { escolha: 'b', confianca: 1 })).toMatchObject({
            quadrante: 'lacuna',
            xp: 0,
        });
    });
});
