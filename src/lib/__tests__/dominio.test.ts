import { dominioPorTopico } from '../dominio';

// Só os campos que o domínio lê. `respondidaEm` cresce na ordem em que as respostas são criadas.
let relogio = 0;
function resposta(topicId: string, questionId: string, correta: boolean, confianca: 1 | 2 | 3 = 2) {
    relogio += 1000;
    return { topicId, questionId, correta, confianca, respondidaEm: relogio };
}

describe('dominioPorTopico', () => {
    it('não devolve nenhum tópico quando não há respostas', () => {
        expect(dominioPorTopico([])).toEqual({});
    });

    it('é a taxa de acerto simples do tópico', () => {
        const respostas = [
            resposta('mda', 'q1', true),
            resposta('mda', 'q2', true),
            resposta('mda', 'q3', false),
            resposta('mda', 'q4', false),
        ];

        expect(dominioPorTopico(respostas)).toEqual({ mda: { acertos: 2, total: 4, taxa: 0.5 } });
    });

    it('separa os tópicos', () => {
        const respostas = [
            resposta('mda', 'q1', true),
            resposta('engine', 'q2', false),
            resposta('engine', 'q3', true),
        ];

        expect(dominioPorTopico(respostas)).toEqual({
            mda: { acertos: 1, total: 1, taxa: 1 },
            engine: { acertos: 1, total: 2, taxa: 0.5 },
        });
    });

    it('não dá peso à confiança: acerto com palpite vale o mesmo que acerto com certeza', () => {
        const comPalpite = dominioPorTopico([resposta('mda', 'q1', true, 1), resposta('mda', 'q2', false, 3)]);
        const comCerteza = dominioPorTopico([resposta('mda', 'q1', true, 3), resposta('mda', 'q2', false, 1)]);

        expect(comPalpite.mda.taxa).toBe(0.5);
        expect(comCerteza.mda.taxa).toBe(0.5);
    });

    it('conta cada questão uma vez, pela resposta mais recente', () => {
        const respostas = [
            resposta('mda', 'q1', true), // pós: acertou
            resposta('mda', 'q2', false),
            resposta('mda', 'q1', false), // reteste: esqueceu
        ];

        expect(dominioPorTopico(respostas)).toEqual({ mda: { acertos: 0, total: 2, taxa: 0 } });
    });

    it('escolhe a mais recente pelo horário, não pela posição na lista', () => {
        const antiga = resposta('mda', 'q1', false);
        const recente = resposta('mda', 'q1', true);

        expect(dominioPorTopico([recente, antiga]).mda).toEqual({ acertos: 1, total: 1, taxa: 1 });
    });
});
