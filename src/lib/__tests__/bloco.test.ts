import {
    pendentes,
    proximoTopicoDaPratica,
    questoesDaPratica,
    questoesDoBlocoMedido,
    topicosMedidos,
    type QuestaoDoBloco,
} from '../bloco';

// Dois tópicos, cada um com 2 questões da forma A, 2 da forma B e 2 de prática.
const QUESTOES: QuestaoDoBloco[] = ['engine', 'mda'].flatMap((topicId) => [
    { id: `${topicId}_a1`, topicId, bloco: 'forma_a' },
    { id: `${topicId}_a2`, topicId, bloco: 'forma_a' },
    { id: `${topicId}_b1`, topicId, bloco: 'forma_b' },
    { id: `${topicId}_b2`, topicId, bloco: 'forma_b' },
    { id: `${topicId}_p1`, topicId, bloco: 'pratica' },
    { id: `${topicId}_p2`, topicId, bloco: 'pratica' },
]);

const TOPICOS = ['mda', 'engine'];

const ids = (questoes: readonly QuestaoDoBloco[]) => questoes.map((q) => q.id);

describe('questoesDoBlocoMedido', () => {
    it('o pré usa a forma inicial do participante', () => {
        expect(ids(questoesDoBlocoMedido(QUESTOES, 'pre', TOPICOS, 'B'))).toEqual([
            'mda_b1',
            'mda_b2',
            'engine_b1',
            'engine_b2',
        ]);
    });

    it('o pós usa a outra forma', () => {
        expect(ids(questoesDoBlocoMedido(QUESTOES, 'pos', TOPICOS, 'B'))).toEqual([
            'mda_a1',
            'mda_a2',
            'engine_a1',
            'engine_a2',
        ]);
    });

    it('o reteste repete as questões do pós', () => {
        expect(questoesDoBlocoMedido(QUESTOES, 'reteste', TOPICOS, 'A')).toEqual(
            questoesDoBlocoMedido(QUESTOES, 'pos', TOPICOS, 'A')
        );
    });

    it('segue a ordem dos tópicos do roteiro, não a ordem em que as questões chegam', () => {
        expect(ids(questoesDoBlocoMedido(QUESTOES, 'pre', ['engine', 'mda'], 'A'))).toEqual([
            'engine_a1',
            'engine_a2',
            'mda_a1',
            'mda_a2',
        ]);
    });

    it('tópico sem questão medida (trilha diária) não entra no bloco', () => {
        const comTrilha: QuestaoDoBloco[] = [...QUESTOES, { id: 'gdd_p1', topicId: 'gdd', bloco: 'pratica' }];

        expect(ids(questoesDoBlocoMedido(comTrilha, 'pre', [...TOPICOS, 'gdd'], 'A'))).toEqual([
            'mda_a1',
            'mda_a2',
            'engine_a1',
            'engine_a2',
        ]);
    });
});

describe('questoesDaPratica', () => {
    it('devolve só as questões de prática do tópico', () => {
        expect(ids(questoesDaPratica(QUESTOES, 'mda'))).toEqual(['mda_p1', 'mda_p2']);
    });
});

describe('pendentes', () => {
    const pratica = questoesDaPratica(QUESTOES, 'mda');

    it('sem resposta, todas estão pendentes', () => {
        expect(ids(pendentes(pratica, [], 'pratica'))).toEqual(['mda_p1', 'mda_p2']);
    });

    it('tira as que já têm resposta na fase', () => {
        const respostas = [{ questionId: 'mda_p1', fase: 'pratica' }] as const;

        expect(ids(pendentes(pratica, respostas, 'pratica'))).toEqual(['mda_p2']);
    });

    it('resposta dada em outra fase não conta: o reteste repete as questões do pós', () => {
        const doPos = questoesDoBlocoMedido(QUESTOES, 'pos', TOPICOS, 'A');
        const respostas = doPos.map((q) => ({ questionId: q.id, fase: 'pos' }) as const);

        expect(pendentes(doPos, respostas, 'pos')).toEqual([]);
        expect(pendentes(doPos, respostas, 'reteste')).toEqual(doPos);
    });
});

describe('proximoTopicoDaPratica', () => {
    it('é o primeiro tópico do roteiro quando nada foi praticado', () => {
        expect(proximoTopicoDaPratica(QUESTOES, [], TOPICOS)).toBe('mda');
    });

    it('fica no tópico enquanto ele tiver questão pendente', () => {
        const respostas = [{ questionId: 'mda_p1', fase: 'pratica' }] as const;

        expect(proximoTopicoDaPratica(QUESTOES, respostas, TOPICOS)).toBe('mda');
    });

    it('passa ao tópico seguinte quando a prática do anterior termina', () => {
        const respostas = [
            { questionId: 'mda_p1', fase: 'pratica' },
            { questionId: 'mda_p2', fase: 'pratica' },
        ] as const;

        expect(proximoTopicoDaPratica(QUESTOES, respostas, TOPICOS)).toBe('engine');
    });

    it('é null quando todos os tópicos foram praticados', () => {
        const respostas = ['mda_p1', 'mda_p2', 'engine_p1', 'engine_p2'].map(
            (questionId) => ({ questionId, fase: 'pratica' }) as const
        );

        expect(proximoTopicoDaPratica(QUESTOES, respostas, TOPICOS)).toBeNull();
    });

    it('pula tópico sem questão de prática', () => {
        expect(proximoTopicoDaPratica(QUESTOES, [], ['vazio', 'engine'])).toBe('engine');
    });
});

describe('topicosMedidos', () => {
    const comTrilha: QuestaoDoBloco[] = [...QUESTOES, { id: 'gdd_p1', topicId: 'gdd', bloco: 'pratica' }];

    it('fica só com os tópicos que têm questão das formas A ou B, na ordem recebida', () => {
        expect(topicosMedidos(comTrilha, ['mda', 'gdd', 'engine'])).toEqual(['mda', 'engine']);
    });

    it('questão sem bloco (sobra de um seed antigo) não faz o tópico contar como medido', () => {
        const comSobra = [...comTrilha, { id: 'antiga', topicId: 'gdd' }] as QuestaoDoBloco[];

        expect(topicosMedidos(comSobra, ['mda', 'gdd'])).toEqual(['mda']);
    });

    it('tópico só com prática (trilha diária) fica fora do roteiro medido', () => {
        expect(topicosMedidos(comTrilha, ['gdd'])).toEqual([]);
    });
});
