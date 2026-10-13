import { CoresDoRelatorio } from '../../constants/cores-do-relatorio';
import { Colors } from '../../constants/theme';
import type { Answer, BlocoQuestao, Confianca, Fase, Question, Topico } from '../../types/domain';
import { exportarDados, type DadosDaExportacao, type PerfilDoExport } from '../exportacao';
import { AMOSTRA_MINIMA, indicadoresDoRelatorio, relatorioHtml, type Indicadores } from '../relatorio';

// O relatório é a página que vai para a Beast Maragames (item 23): só números em conjunto,
// tirados das mesmas contas da exportação. Estes testes montam três pessoas e conferem as
// contas, o que a página mostra e o que ela não pode mostrar.

/** Horário de São Luís (UTC−3) em milissegundos. Ex.: em('2026-10-30 20:00'). */
function em(dataHora: string): number {
    return Date.parse(`${dataHora.replace(' ', 'T')}:00-03:00`);
}

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
        alternativas: [
            { id: 'a', texto: 'A certa', correta: true, explicacao: '' },
            { id: 'b', texto: 'O distrator B', correta: false, explicacao: '' },
            { id: 'c', texto: 'O distrator C', correta: false, explicacao: '' },
            { id: 'd', texto: 'O distrator D', correta: false, explicacao: '' },
        ],
        fonte: null,
        versaoConteudo: 'v1',
    };
}

// Dois tópicos de ciclo completo, cada um num módulo: duas questões por forma e uma de prática.
const QUESTOES: Question[] = [
    questao('mda_a1', 'mda', 'forma_a', 1),
    questao('mda_a2', 'mda', 'forma_a', 2),
    questao('mda_b1', 'mda', 'forma_b', 3),
    questao('mda_b2', 'mda', 'forma_b', 4),
    questao('mda_p1', 'mda', 'pratica', 5),
    questao('pixel_a1', 'pixel', 'forma_a', 1),
    questao('pixel_a2', 'pixel', 'forma_a', 2),
    questao('pixel_b1', 'pixel', 'forma_b', 3),
    questao('pixel_b2', 'pixel', 'forma_b', 4),
    questao('pixel_p1', 'pixel', 'pratica', 5),
];

const TOPICOS: Topico[] = [
    { id: 'mda', titulo: 'Framework MDA', modulo: 'Fundamentos de Game Design', ordem: 1 },
    { id: 'pixel', titulo: 'Pixel Art Básico', modulo: 'Arte & Pixel Art', ordem: 2 },
];

const ANA: PerfilDoExport = {
    uid: 'uid-da-ana-123',
    nome: 'Ana Beatriz Souza',
    apelido: 'Aninha',
    email: 'ana.souza@exemplo.com',
    telefone: '98999990001',
    cidade: 'Imperatriz',
    uf: 'MA',
    faixaEtaria: '18_24',
    situacaoDeEstudo: 'graduacao',
    instituicao: 'Faculdade Exemplo',
    curso: 'Curso Exemplo',
    experiencia: 'iniciante',
    formaPre: 'A',
    consentiuEm: em('2026-10-30 19:00'),
};

const BIA: PerfilDoExport = {
    uid: 'uid-da-bia-456',
    nome: 'Bianca Lima',
    apelido: 'Bia',
    email: 'bia.lima@exemplo.com',
    telefone: '98999990002',
    cidade: 'Caxias',
    uf: 'MA',
    faixaEtaria: '18_24',
    situacaoDeEstudo: 'formado',
    experiencia: 'avancado',
    formaPre: 'B',
    consentiuEm: em('2026-10-30 19:05'),
};

// Perfil de antes de 12/10/2026: sem faixa etária nem situação de estudo.
const CAIO: PerfilDoExport = {
    uid: 'uid-do-caio-789',
    nome: 'Caio Mendes',
    apelido: 'Caiozinho',
    email: 'caio.mendes@exemplo.com',
    telefone: '98999990003',
    experiencia: 'iniciante',
    formaPre: 'A',
    consentiuEm: em('2026-10-30 19:10'),
};

let n = 0;
function r(
    uid: string,
    fase: Fase,
    questionId: string,
    quando: string,
    correta: boolean,
    confianca: Confianca,
    attemptId = 'na-web',
    escolha?: string
): Answer {
    n += 1;
    return {
        id: `r${n}`,
        uid,
        questionId,
        topicId: questionId.split('_')[0],
        attemptId,
        fase,
        escolha: escolha ?? (correta ? 'a' : 'b'),
        ordemExibida: ['c', 'a', 'd', 'b'],
        correta,
        confianca,
        tempoMs: 4_200,
        respondidaEm: em(quando),
    };
}

// A Ana fez a lição inteira, em dois dias, e a revisão uma semana depois, pelo celular.
// Diagnóstico 1 de 2; verificação 2 de 2 (um Firme e um Frágil); na revisão, só o Firme ficou.
const DA_ANA: Answer[] = [
    r(ANA.uid, 'pre', 'mda_a1', '2026-10-30 19:10', true, 1),
    r(ANA.uid, 'pre', 'mda_a2', '2026-10-30 19:11', false, 3),
    r(ANA.uid, 'pratica', 'mda_p1', '2026-10-30 19:20', true, 3),
    r(ANA.uid, 'pos', 'mda_b1', '2026-10-30 19:40', true, 3),
    r(ANA.uid, 'pos', 'mda_b2', '2026-10-30 19:41', true, 2),
    r(ANA.uid, 'reteste', 'mda_b1', '2026-11-06 10:00', true, 3, 'no-iphone'),
    r(ANA.uid, 'reteste', 'mda_b2', '2026-11-06 10:01', false, 2, 'no-iphone'),
];

// A Bia tem a forma B: o diagnóstico dela é o que para a Ana é a verificação. Diagnóstico 0 de 2;
// verificação 1 de 2, com um ponto cego. Não voltou para a revisão.
const DA_BIA: Answer[] = [
    r(BIA.uid, 'pre', 'mda_b1', '2026-10-30 19:10', false, 3, 'na-web', 'c'),
    r(BIA.uid, 'pre', 'mda_b2', '2026-10-30 19:11', false, 1, 'na-web', 'c'),
    r(BIA.uid, 'pratica', 'mda_p1', '2026-10-30 19:20', false, 2, 'na-web', 'c'),
    r(BIA.uid, 'pos', 'mda_a1', '2026-10-30 19:40', true, 3),
    r(BIA.uid, 'pos', 'mda_a2', '2026-10-30 19:41', false, 3, 'na-web', 'c'),
];

// O Caio começou o diagnóstico de outra lição e parou na primeira questão, numa tentativa antiga.
const DO_CAIO: Answer[] = [r(CAIO.uid, 'pre', 'pixel_a1', '2026-10-30 19:15', true, 2, 'antiga')];

const DADOS: DadosDaExportacao = {
    perfis: [ANA, BIA, CAIO],
    respostas: [...DA_ANA, ...DA_BIA, ...DO_CAIO],
    questoes: QUESTOES,
    topicos: TOPICOS,
    tentativas: [
        { id: 'na-web', plataforma: 'web', versaoDoApp: '1.0.0' },
        { id: 'no-iphone', plataforma: 'ios', versaoDoApp: '1.0.0' },
        { id: 'antiga' },
    ],
    // A Ana se deu as notas antes do primeiro diagnóstico; a Bia, só depois de estudar.
    autoavaliacoes: [
        { uid: ANA.uid, notas: { fundamentos_de_game_design: 4, arte_pixel_art: 2 }, respondidaEm: em('2026-10-30 19:05') },
        { uid: BIA.uid, notas: { fundamentos_de_game_design: 1, arte_pixel_art: 1 }, respondidaEm: em('2026-10-30 20:00') },
    ],
};

const AGORA = em('2026-11-10 12:00');
const CONTEUDO = { topicos: TOPICOS, questoes: QUESTOES };

function indicadores(dados: DadosDaExportacao = DADOS, minimoPorQuestao?: number): Indicadores {
    return indicadoresDoRelatorio(exportarDados(dados, { agora: AGORA }), CONTEUDO, { minimoPorQuestao });
}

function pagina(ind: Indicadores = indicadores(), amostraMinima?: number, desde?: string): string {
    return relatorioHtml(ind, { geradoEm: '2026-11-10', desde, amostraMinima });
}

describe('os números em conjunto que a exportação entrega', () => {
    const { agregados } = exportarDados(DADOS, { agora: AGORA });

    it('quantas pessoas, quantas lições com a verificação feita e quantas com a revisão', () => {
        expect(agregados.participantes).toBe(3);
        expect(agregados.verificadas).toBe(2);
        expect(agregados.revisadas).toBe(1);
        expect(agregados.antesDaHora).toBe(0);
    });

    it('o acerto antes, depois e na revisão, só das lições com o par completo', () => {
        expect(agregados.pre).toEqual({ acertos: 1, total: 4 });
        expect(agregados.pos).toEqual({ acertos: 3, total: 4 });
        expect(agregados.reteste).toEqual({ acertos: 1, total: 2 });
    });

    it('o ganho médio é a média do ganho de cada pessoa', () => {
        // Ana: de 50% para 100%, ganho 1. Bia: de 0% para 50%, ganho 0,5.
        expect(agregados.ganhoMedio).toBeCloseTo(0.75);
    });

    it('por tópico, na ordem do conteúdo, com o título e a revisão', () => {
        expect(agregados.porTopico).toEqual([
            {
                topicId: 'mda',
                titulo: 'Framework MDA',
                pre: { acertos: 1, total: 4 },
                pos: { acertos: 3, total: 4 },
                reteste: { acertos: 1, total: 2 },
                pessoas: 2,
            },
        ]);
    });

    it('o acerto por nível de confiança e os quadrantes, na verificação', () => {
        expect(agregados.porConfianca).toEqual({
            1: { acertos: 0, total: 0 },
            2: { acertos: 1, total: 1 },
            3: { acertos: 2, total: 3 },
        });
        expect(agregados.quadrantesNoPos).toEqual({ firme: 2, fragil: 1, lacuna: 0, ponto_cego: 1 });
    });

    it('o que foi mantido na revisão, separando Firme de Frágil', () => {
        expect(agregados.firmes).toEqual({ acertos: 1, total: 1 });
        expect(agregados.frageis).toEqual({ acertos: 0, total: 1 });
    });

    it('são os mesmos números do resumo em texto', () => {
        const { resumo } = exportarDados(DADOS, { agora: AGORA });

        expect(resumo).toContain('Acerto na verificação: 75% (3 de 4)');
        expect(resumo).toContain('Lições com a revisão feita: 1 de 2');
    });

    it('sem ninguém, tudo fica em zero e o ganho, sem valor', () => {
        const vazio = exportarDados({ ...DADOS, perfis: [] }, { agora: AGORA }).agregados;

        expect(vazio.participantes).toBe(0);
        expect(vazio.pos).toEqual({ acertos: 0, total: 0 });
        expect(vazio.ganhoMedio).toBeNull();
        expect(vazio.porTopico).toEqual([]);
    });
});

describe('indicadoresDoRelatorio', () => {
    it('leva adiante os números em conjunto da exportação', () => {
        const ind = indicadores();

        expect(ind.participantes).toBe(3);
        expect(ind.pos).toEqual({ acertos: 3, total: 4 });
        expect(ind.porTopico).toHaveLength(1);
    });

    it('retenção: dos acertos da verificação, quantos continuaram certos na revisão', () => {
        expect(indicadores().retencao).toEqual({ acertos: 1, total: 2 });
    });

    it('ponto cego: quantas respostas da verificação foram erro com certeza', () => {
        expect(indicadores().pontosCegos).toEqual({ acertos: 1, total: 4 });
    });

    describe('engajamento', () => {
        const { engajamento } = indicadores();

        it('soma as lições começadas, verificadas, revisadas e concluídas', () => {
            expect(engajamento.licoes).toEqual({ comecadas: 3, verificadas: 2, revisadas: 1, concluidas: 1 });
        });

        it('quem voltou em outro dia e a média de dias com resposta', () => {
            // Ana respondeu em 30/10 e em 06/11; Bia e Caio, só em 30/10.
            expect(engajamento.voltaramOutroDia).toEqual({ acertos: 1, total: 3 });
            expect(engajamento.diasAtivosEmMedia).toBeCloseTo(4 / 3);
            expect(engajamento.maiorSequencia).toBe(1);
        });

        it('de onde vieram as respostas, da plataforma mais usada para a menos', () => {
            expect(engajamento.plataformas).toEqual([
                { rotulo: 'Web', respostas: 10 },
                { rotulo: 'iPhone', respostas: 2 },
                { rotulo: 'Não registrada', respostas: 1 },
            ]);
        });
    });

    it('plataforma que o app não conhece vira "Outra": o texto gravado não vai para a página', () => {
        // As regras não limitam o que se grava nesse campo: alguém pode escrever o que quiser nele.
        const dados = { ...DADOS, tentativas: [{ id: 'na-web', plataforma: 'Fulano de Tal <fulano@exemplo.com>', versaoDoApp: '1.0.0' }] };
        const ind = indicadores(dados);

        expect(ind.engajamento.plataformas).toEqual([
            { rotulo: 'Outra', respostas: 10 },
            { rotulo: 'Não registrada', respostas: 3 },
        ]);
        expect(pagina(ind)).not.toContain('Fulano');
    });

    describe('autoavaliação por módulo', () => {
        const { autoavaliacao } = indicadores();

        it('só entra a nota dada antes do primeiro diagnóstico', () => {
            // A nota da Bia veio depois de ela estudar: não serve de "antes".
            expect(autoavaliacao.map((a) => [a.modulo, a.notaMedia, a.pessoas])).toEqual([
                ['Fundamentos de Game Design', 4, 1],
                ['Arte & Pixel Art', 2, 1],
            ]);
        });

        it('ao lado, o acerto no diagnóstico das mesmas pessoas, nas lições daquele módulo', () => {
            expect(autoavaliacao[0].diagnostico).toEqual({ acertos: 1, total: 2 });
            expect(autoavaliacao[1].diagnostico).toEqual({ acertos: 0, total: 0 });
        });

        it('o diagnóstico concluído entra mesmo sem a verificação feita', () => {
            // A Ana fez o diagnóstico de Pixel Art e parou aí: a lição não tem antes e depois, mas o
            // diagnóstico dela já responde se a nota que ela se deu batia com o que sabia.
            const comDiagnostico = indicadores({
                ...DADOS,
                respostas: [
                    ...DADOS.respostas,
                    r(ANA.uid, 'pre', 'pixel_a1', '2026-10-31 09:00', true, 2),
                    r(ANA.uid, 'pre', 'pixel_a2', '2026-10-31 09:01', false, 1),
                ],
            }).autoavaliacao;

            expect(comDiagnostico[1].modulo).toBe('Arte & Pixel Art');
            expect(comDiagnostico[1].diagnostico).toEqual({ acertos: 1, total: 2 });
        });

        it('o diagnóstico pela metade não entra', () => {
            const pelaMetade = indicadores({
                ...DADOS,
                respostas: [...DADOS.respostas, r(ANA.uid, 'pre', 'pixel_a1', '2026-10-31 09:00', true, 2)],
            }).autoavaliacao;

            expect(pelaMetade[1].diagnostico).toEqual({ acertos: 0, total: 0 });
        });

        it('sem nenhuma nota válida, a lista sai vazia', () => {
            expect(indicadores({ ...DADOS, autoavaliacoes: [] }).autoavaliacao).toEqual([]);
        });
    });

    describe('conteúdo: as questões a rever', () => {
        it('só entra questão com o mínimo de respostas, da pior para a melhor', () => {
            const { conteudo } = indicadores(DADOS, 2);

            // Com duas respostas ou mais: mda_a1 (2 de 2), mda_a2 (0 de 2), mda_b1 (1 de 2),
            // mda_b2 (1 de 2) e mda_p1 (1 de 2). No empate de acerto, vem antes a de mais ponto cego.
            expect(conteudo.minimo).toBe(2);
            expect(conteudo.total).toBe(10);
            expect(conteudo.avaliadas).toBe(5);
            expect(conteudo.aRever.map((q) => q.enunciado)).toEqual([
                'Enunciado de mda_a2',
                'Enunciado de mda_b1',
                'Enunciado de mda_b2',
                'Enunciado de mda_p1',
            ]);
        });

        it('cada uma traz o tópico pelo título, o acerto, os pontos cegos e o distrator mais escolhido', () => {
            const [pior] = indicadores(DADOS, 2).conteudo.aRever;

            expect(pior).toEqual({
                enunciado: 'Enunciado de mda_a2',
                topico: 'Framework MDA',
                acerto: { acertos: 0, total: 2 },
                pontosCegos: 2,
                distrator: 'O distrator B',
            });
        });

        it('questão que todo mundo acertou não precisa de revisão', () => {
            const enunciados = indicadores(DADOS, 2).conteudo.aRever.map((q) => q.enunciado);

            expect(enunciados).not.toContain('Enunciado de mda_a1');
        });

        it('por padrão, pede cinco respostas: com menos que isso, uma questão não é julgada', () => {
            const { conteudo } = indicadores();

            expect(conteudo.minimo).toBe(5);
            expect(conteudo.avaliadas).toBe(0);
            expect(conteudo.aRever).toEqual([]);
        });
    });

    describe('quem respondeu', () => {
        const { perfil } = indicadores();

        it('conta as pessoas por faixa etária, experiência e situação de estudo, com o rótulo da tela', () => {
            expect(perfil).toEqual([
                {
                    titulo: 'Faixa etária',
                    itens: [
                        { rotulo: '18 a 24', pessoas: 2 },
                        { rotulo: 'Não informada', pessoas: 1 },
                    ],
                },
                {
                    titulo: 'Experiência em criar jogos',
                    itens: [
                        { rotulo: 'Iniciante', pessoas: 2 },
                        { rotulo: 'Avançado', pessoas: 1 },
                    ],
                },
                {
                    titulo: 'Situação de estudo',
                    itens: [
                        { rotulo: 'Graduação', pessoas: 1 },
                        { rotulo: 'Já me formei', pessoas: 1 },
                        { rotulo: 'Não informada', pessoas: 1 },
                    ],
                },
            ]);
        });
    });
});

describe('relatorioHtml', () => {
    it('é uma página inteira, em português, que pede para não entrar em busca', () => {
        const html = pagina();

        expect(html.startsWith('<!doctype html>')).toBe(true);
        expect(html).toContain('<html lang="pt-BR">');
        expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
        expect(html).toContain('<title>Beast Maragames · Relatório de aprendizagem</title>');
        expect(html.trimEnd().endsWith('</html>')).toBe(true);
    });

    it('diz de quando são os dados e de quantas pessoas', () => {
        const html = pagina();

        expect(html).toContain('10/11/2026');
        expect(html).toContain('3 participantes');
    });

    it('com filtro de data, avisa de quando em diante as pessoas entraram', () => {
        expect(pagina(indicadores(), undefined, '2026-10-30')).toContain('aceitou o termo a partir de 30/10/2026');
        expect(pagina()).not.toContain('a partir de');
    });

    it('tem os nove blocos, na ordem do desenho', () => {
        const html = pagina();
        const titulos = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);

        expect(titulos).toEqual([
            'Em resumo',
            'Aprendizagem',
            'Consciência do próprio saber',
            'Retenção',
            'Autoavaliação',
            'Engajamento',
            'Conteúdo',
            'Quem respondeu',
            'Como ler estes números',
        ]);
    });

    it('lembra o limite do estudo', () => {
        expect(pagina()).toContain('descrevem e não provam causa');
    });

    describe('percentual e amostra', () => {
        it('com respostas suficientes, mostra o percentual e, ao lado, a contagem', () => {
            const html = pagina(indicadores(), 1);

            expect(html).toContain('75%');
            expect(html).toContain('3 de 4');
        });

        it('com poucas respostas, mostra só a contagem e avisa que a amostra é pequena', () => {
            const html = pagina();

            expect(AMOSTRA_MINIMA).toBe(10);
            expect(html).toContain('3 de 4');
            expect(html).toContain('amostra pequena');
            // Nenhum percentual solto: todos os totais deste exemplo são menores que 10.
            expect(html).not.toMatch(/\d+%\s*</);
        });

        it('sem resposta nenhuma, diz que não há dados, e não "0%"', () => {
            const html = pagina(indicadores({ ...DADOS, respostas: [] }), 1);

            expect(html).toContain('sem dados');
            expect(html).not.toContain('NaN');
        });
    });

    describe('nada que identifique alguém', () => {
        const html = pagina(indicadores(DADOS, 1), 1);

        it.each([ANA, BIA, CAIO])('nem nome, apelido, contato, cidade ou identificador de $apelido', (pessoa) => {
            for (const dado of [pessoa.nome, pessoa.apelido, pessoa.email, pessoa.telefone, pessoa.cidade, pessoa.uid]) {
                if (dado) expect(html).not.toContain(dado);
            }
        });

        it('nem os códigos que a exportação dá a cada pessoa', () => {
            expect(html).not.toMatch(/\bP0\d\b/);
        });

        it('nem instituição ou curso, que num grupo pequeno apontam para uma pessoa', () => {
            expect(html).not.toContain('Faculdade Exemplo');
            expect(html).not.toContain('Curso Exemplo');
        });
    });

    describe('arquivo independente', () => {
        const html = pagina(indicadores(DADOS, 1), 1);

        it('não busca nada na internet', () => {
            expect(html).not.toMatch(/https?:/);
            expect(html).not.toMatch(/\ssrc=/);
            expect(html).not.toContain('@import');
            expect(html).not.toContain('<link');
        });

        it('não leva script', () => {
            expect(html).not.toContain('<script');
        });
    });

    it('texto que vem do conteúdo entra como texto, e não como marcação', () => {
        const topicos: Topico[] = [{ ...TOPICOS[0], titulo: 'MDA <b>& "dinâmicas"</b>' }, TOPICOS[1]];
        const ind = indicadoresDoRelatorio(exportarDados({ ...DADOS, topicos }, { agora: AGORA }), { topicos, questoes: QUESTOES });
        const html = pagina(ind);

        expect(html).toContain('MDA &lt;b&gt;&amp; &quot;dinâmicas&quot;&lt;/b&gt;');
        expect(html).not.toContain('<b>&');
    });

    it('as questões a rever aparecem com o enunciado e o distrator', () => {
        const html = pagina(indicadores(DADOS, 2), 1);

        expect(html).toContain('Enunciado de mda_a2');
        expect(html).toContain('O distrator B');
    });

    it('sem questão com respostas suficientes, o bloco de conteúdo explica por quê', () => {
        expect(pagina()).toContain('Nenhuma questão tem 5 respostas ainda');
    });

    it('sem autoavaliação, o bloco diz que ninguém deu as notas ainda', () => {
        const html = pagina(indicadores({ ...DADOS, autoavaliacoes: [] }));

        expect(html).toContain('Ninguém deu as notas antes do primeiro diagnóstico ainda');
    });

    it('sem participantes, a página diz que ainda não há dados', () => {
        const html = pagina(indicadores({ ...DADOS, perfis: [] }));

        expect(html).toContain('Ninguém aceitou o termo ainda');
    });

    it('acompanha o tema do aparelho', () => {
        expect(pagina()).toContain('prefers-color-scheme: dark');
    });
});

describe('as cores da página', () => {
    // O relatório não pode importar o tema do app, que depende do React Native. As cores de base
    // são repetidas num arquivo próprio, e este teste não deixa uma lista se afastar da outra.
    it.each([
        ['claro', Colors.light],
        ['escuro', Colors.dark],
    ] as const)('no %s, o fundo, o texto e a marca são os do tema do app', (tema, doApp) => {
        const doRelatorio = CoresDoRelatorio[tema];

        expect(doRelatorio.fundo).toBe(doApp.background);
        expect(doRelatorio.elemento).toBe(doApp.backgroundElement);
        expect(doRelatorio.borda).toBe(doApp.borda);
        expect(doRelatorio.texto).toBe(doApp.text);
        expect(doRelatorio.texto2).toBe(doApp.textSecondary);
        expect(doRelatorio.marca).toBe(doApp.primaria);
    });

    it('a página leva as cores dos dois temas', () => {
        const html = pagina();

        for (const tema of ['claro', 'escuro'] as const) {
            for (const cor of Object.values(CoresDoRelatorio[tema])) expect(html).toContain(cor);
        }
    });

    it('os dois temas têm as mesmas cores, pelo nome', () => {
        expect(Object.keys(CoresDoRelatorio.escuro)).toEqual(Object.keys(CoresDoRelatorio.claro));
    });
});
