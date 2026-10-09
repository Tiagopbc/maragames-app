import {
    ordenarLicoes,
    ordenarQuestoes,
    ordenarRespostas,
    paraAnswer,
    paraLesson,
    paraPerfil,
    paraQuestion,
    topicosDasLicoes,
} from '../mapeadores';

// Imita o Timestamp do Firestore só no que o mapeador usa.
function timestamp(ms: number) {
    return { toMillis: () => ms };
}

const alternativas = ['a', 'b', 'c', 'd'].map((id) => ({
    id,
    texto: `texto ${id}`,
    correta: id === 'a',
    explicacao: `explicação ${id}`,
}));

describe('paraLesson', () => {
    it('copia os campos da lição e deixa de fora os carimbos do seed', () => {
        const cartao = [{ titulo: 'Três camadas', texto: 'Mecânica, Dinâmica e Estética.' }];

        const licao = paraLesson('l1', {
            title: 'Framework MDA',
            order: 1,
            topicId: 'mda_framework',
            modulo: 'Fundamentos de Game Design',
            cartao,
            versaoConteudo: 'abc123',
            updatedAt: timestamp(1),
            createdAt: timestamp(1),
        });

        expect(licao).toEqual({
            id: 'l1',
            title: 'Framework MDA',
            order: 1,
            topicId: 'mda_framework',
            modulo: 'Fundamentos de Game Design',
            cartao,
        });
    });

    it('traz a ordem de apresentação e a trilha, quando o seed as gravou', () => {
        const licao = paraLesson('l4', { title: 'Pixel Art Básico', order: 4, topicId: 'pixel_art', ordem: 2, trilha: 'medido' });

        expect(licao).toMatchObject({ order: 4, ordem: 2, trilha: 'medido' });
    });

    it('aceita lição antiga, sem tópico, módulo nem cartão', () => {
        expect(paraLesson('l0', { title: 'Lição antiga', order: 9 })).toEqual({
            id: 'l0',
            title: 'Lição antiga',
            order: 9,
            topicId: undefined,
            modulo: null,
            cartao: [],
        });
    });
});

describe('topicosDasLicoes', () => {
    it('monta um tópico por lição, na ordem das lições', () => {
        const licoes = [
            { id: 'l2', title: 'Pixel Art Básico', order: 2, topicId: 'pixel_art', modulo: 'Arte & Pixel Art' },
            { id: 'l1', title: 'Framework MDA', order: 1, topicId: 'mda_framework', modulo: null },
        ];

        expect(topicosDasLicoes(licoes)).toEqual([
            { id: 'mda_framework', titulo: 'Framework MDA', modulo: null, ordem: 1 },
            { id: 'pixel_art', titulo: 'Pixel Art Básico', modulo: 'Arte & Pixel Art', ordem: 2 },
        ]);
    });

    // `order` é o número da lição no curso; `ordem` é a posição no piloto, decidida pelo grupo
    // (item 23): MDA, Pixel Art, Engine, Lógica.
    it('com ordem de apresentação, os tópicos saem por ela, e não pelo número da lição', () => {
        const licoes = [
            { id: 'l1', title: 'Framework MDA', order: 1, ordem: 1, topicId: 'mda' },
            { id: 'l2', title: 'Escolhendo a Engine Certa', order: 2, ordem: 3, topicId: 'engine' },
            { id: 'l3', title: 'Lógica de Programação', order: 3, ordem: 4, topicId: 'logica' },
            { id: 'l4', title: 'Pixel Art Básico', order: 4, ordem: 2, topicId: 'pixel' },
        ];

        expect(topicosDasLicoes(licoes).map((t) => [t.id, t.ordem])).toEqual([
            ['mda', 1],
            ['pixel', 2],
            ['engine', 3],
            ['logica', 4],
        ]);
    });

    it('ignora lição sem topicId', () => {
        const licoes = [
            { id: 'l0', title: 'Lição antiga', order: 1 },
            { id: 'l1', title: 'Framework MDA', order: 2, topicId: 'mda_framework' },
        ];

        expect(topicosDasLicoes(licoes).map((t) => t.id)).toEqual(['mda_framework']);
    });
});

describe('paraQuestion', () => {
    it('copia os campos da questão e deixa de fora o carimbo do seed', () => {
        const questao = paraQuestion('mda_framework_01', {
            lessonId: 'l1',
            topicId: 'mda_framework',
            order: 1,
            bloco: 'forma_a',
            dificuldade: 'basico',
            formato: 'multipla_escolha',
            enunciado: 'O que é uma mecânica?',
            alternativas,
            fonte: 'Hunicke, LeBlanc e Zubek (2004)',
            versaoConteudo: 'abc123',
            updatedAt: timestamp(1),
        });

        expect(questao).toEqual({
            id: 'mda_framework_01',
            lessonId: 'l1',
            topicId: 'mda_framework',
            order: 1,
            bloco: 'forma_a',
            dificuldade: 'basico',
            formato: 'multipla_escolha',
            enunciado: 'O que é uma mecânica?',
            alternativas,
            fonte: 'Hunicke, LeBlanc e Zubek (2004)',
            versaoConteudo: 'abc123',
        });
    });
});

describe('paraAnswer', () => {
    it('copia os campos do evento e converte o horário do servidor em ms', () => {
        const resposta = paraAnswer('r1', {
            uid: 'u1',
            questionId: 'mda_framework_01',
            topicId: 'mda_framework',
            attemptId: 't1',
            fase: 'pre',
            escolha: 'c',
            ordemExibida: ['c', 'a', 'd', 'b'],
            correta: false,
            confianca: 3,
            tempoMs: 8421,
            respondidaEm: timestamp(1_760_000_000_000),
        });

        expect(resposta).toEqual({
            id: 'r1',
            uid: 'u1',
            questionId: 'mda_framework_01',
            topicId: 'mda_framework',
            attemptId: 't1',
            fase: 'pre',
            escolha: 'c',
            ordemExibida: ['c', 'a', 'd', 'b'],
            correta: false,
            confianca: 3,
            tempoMs: 8421,
            respondidaEm: 1_760_000_000_000,
        });
    });
});

describe('ordenação', () => {
    it('lições com ordem de apresentação saem por ela', () => {
        const licoes = [
            { id: 'engine', title: 'Engine', order: 2, ordem: 3 },
            { id: 'pixel', title: 'Pixel Art', order: 4, ordem: 2 },
            { id: 'mda', title: 'MDA', order: 1, ordem: 1 },
        ];

        expect(ordenarLicoes(licoes).map((l) => l.id)).toEqual(['mda', 'pixel', 'engine']);
    });

    // Sobra de um seed antigo: não tem `ordem` e não pode furar a fila de quem tem.
    it('lição sem ordem de apresentação vai para o fim, pelo número da lição', () => {
        const licoes = [
            { id: 'antiga_b', title: 'Antiga B', order: 2 },
            { id: 'pixel', title: 'Pixel Art', order: 4, ordem: 2 },
            { id: 'antiga_a', title: 'Antiga A', order: 1 },
            { id: 'mda', title: 'MDA', order: 5, ordem: 1 },
        ];

        expect(ordenarLicoes(licoes).map((l) => l.id)).toEqual(['mda', 'pixel', 'antiga_a', 'antiga_b']);
    });

    it('lições saem pela ordem, sem alterar a lista recebida', () => {
        const licoes = [
            { id: 'l3', title: 'C', order: 3 },
            { id: 'l1', title: 'A', order: 1 },
            { id: 'l2', title: 'B', order: 2 },
        ];

        expect(ordenarLicoes(licoes).map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
        expect(licoes.map((l) => l.id)).toEqual(['l3', 'l1', 'l2']);
    });

    it('questões saem agrupadas por tópico e, dentro dele, pela ordem', () => {
        const questoes = [
            { id: 'pixel_02', topicId: 'pixel_art', order: 2 },
            { id: 'mda_02', topicId: 'mda_framework', order: 2 },
            { id: 'pixel_01', topicId: 'pixel_art', order: 1 },
            { id: 'mda_10', topicId: 'mda_framework', order: 10 },
            { id: 'mda_01', topicId: 'mda_framework', order: 1 },
        ];

        expect(ordenarQuestoes(questoes).map((q) => q.id)).toEqual([
            'mda_01',
            'mda_02',
            'mda_10',
            'pixel_01',
            'pixel_02',
        ]);
    });

    it('respostas saem da mais antiga para a mais recente', () => {
        const respostas = [
            { id: 'r2', respondidaEm: 2000 },
            { id: 'r3', respondidaEm: 3000 },
            { id: 'r1', respondidaEm: 1000 },
        ];

        expect(ordenarRespostas(respostas).map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
    });
});

describe('paraPerfil', () => {
    const base = {
        uid: 'u1',
        nome: 'Paulo Souza',
        apelido: 'paulo',
        email: 'paulo@exemplo.com',
        telefone: '98987654321',
        instituicao: 'UNDB',
        curso: 'Engenharia de Software',
        experiencia: 'iniciante',
        criadoEm: 1_759_000_000_000,
        atualizadoEm: 1_759_000_000_000,
    };

    it('antes do consentimento, o perfil não tem forma nem data de aceite', () => {
        expect(paraPerfil(base)).toEqual(base);
    });

    it('depois do consentimento, traz a forma e converte o horário do servidor em ms', () => {
        const perfil = paraPerfil({ ...base, formaPre: 'B', consentiuEm: timestamp(1_760_000_000_000) });

        expect(perfil).toEqual({ ...base, formaPre: 'B', consentiuEm: 1_760_000_000_000 });
    });

    it('deixa de fora campo que não é do perfil', () => {
        expect(paraPerfil({ ...base, admin: true })).toEqual(base);
    });
});
