import { CoresDoRelatorio } from '../../constants/cores-do-relatorio';
import { Colors } from '../../constants/theme';
import type { Answer, BlocoQuestao, Confianca, Fase, Question, Topico } from '../../types/domain';
import { exportarDados, type DadosDaExportacao, type PerfilDoExport } from '../exportacao';
import { AMOSTRA_MINIMA, MINIMO_DE_PESSOAS_POR_GRUPO, indicadoresDoRelatorio, relatorioHtml, type GrupoDoRelatorio, type Indicadores } from '../relatorio';

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
    sexo: 'feminino',
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
    sexo: 'feminino',
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

// Os exemplos têm três pessoas: os grupos só mostram números com o mínimo de pessoas baixado a um.
function indicadores(dados: DadosDaExportacao = DADOS, minimoDePessoas = 1): Indicadores {
    return indicadoresDoRelatorio(exportarDados(dados, { agora: AGORA }), CONTEUDO, { minimoDePessoas });
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

    it('o ganho da turma é o de Hake, calculado sobre o acerto da turma antes e depois', () => {
        // Antes 1 de 4 (25%), depois 3 de 4 (75%): do que faltava, 50 pontos de 75.
        expect(agregados.ganhoDaTurma).toBeCloseTo(2 / 3);
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
        expect(resumo).toContain('Ganho normalizado da turma: 0,67');
    });

    it('sem ninguém, tudo fica em zero e o ganho, sem valor', () => {
        const vazio = exportarDados({ ...DADOS, perfis: [] }, { agora: AGORA }).agregados;

        expect(vazio.participantes).toBe(0);
        expect(vazio.pos).toEqual({ acertos: 0, total: 0 });
        expect(vazio.ganhoMedio).toBeNull();
        expect(vazio.ganhoDaTurma).toBeNull();
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

        it('a nota e o acerto são das mesmas pessoas: quem deu a nota antes e fez o diagnóstico do módulo', () => {
            // A nota da Bia veio depois de ela estudar: não serve de "antes". A Ana não fez o
            // diagnóstico de Pixel Art: a nota dela nessa área não tem com que comparar.
            expect(autoavaliacao.map((a) => [a.modulo, a.notaMedia, a.pessoas])).toEqual([['Fundamentos de Game Design', 4, 1]]);
        });

        it('ao lado, o acerto no diagnóstico das mesmas pessoas, nas lições daquele módulo', () => {
            expect(autoavaliacao[0].diagnostico).toEqual({ acertos: 1, total: 2 });
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

            expect(comDiagnostico[1]).toMatchObject({ modulo: 'Arte & Pixel Art', notaMedia: 2, pessoas: 1, diagnostico: { acertos: 1, total: 2 } });
        });

        it('o diagnóstico pela metade não entra', () => {
            const pelaMetade = indicadores({
                ...DADOS,
                respostas: [...DADOS.respostas, r(ANA.uid, 'pre', 'pixel_a1', '2026-10-31 09:00', true, 2)],
            }).autoavaliacao;

            expect(pelaMetade.map((a) => a.modulo)).toEqual(['Fundamentos de Game Design']);
        });

        it('sem nenhuma nota válida, a lista sai vazia', () => {
            expect(indicadores({ ...DADOS, autoavaliacoes: [] }).autoavaliacao).toEqual([]);
        });
    });

    describe('conteúdo: as questões a rever', () => {
        it('só a verificação julga a questão, e a prática nunca entra', () => {
            const { conteudo } = indicadores();

            // Das 8 questões das formas, 4 têm resposta na verificação; só mda_a2 teve erro nela.
            expect(conteudo.total).toBe(8);
            expect(conteudo.avaliadas).toBe(4);
            expect(conteudo.aRever.map((q) => q.enunciado)).toEqual(['Enunciado de mda_a2']);
        });

        it('cada uma traz o tópico, o acerto e os pontos cegos da verificação, o distrator dela e, à parte, o acerto no diagnóstico', () => {
            const [pior] = indicadores().conteudo.aRever;

            expect(pior).toEqual({
                enunciado: 'Enunciado de mda_a2',
                topico: 'Framework MDA',
                acerto: { acertos: 0, total: 1 },
                pontosCegos: 1,
                distrator: 'O distrator C',
                diagnostico: { acertos: 0, total: 1 },
            });
        });

        it('questão que todo mundo acertou na verificação não precisa de revisão', () => {
            const enunciados = indicadores().conteudo.aRever.map((q) => q.enunciado);

            expect(enunciados).not.toContain('Enunciado de mda_a1');
        });
    });

    describe('cobertura por tópico', () => {
        it('quantas pessoas começaram cada lição, e em que forma', () => {
            expect(indicadores().cobertura).toEqual([
                { titulo: 'Framework MDA', pessoas: 2, formaA: 1, formaB: 1, verificadas: 2 },
                { titulo: 'Pixel Art Básico', pessoas: 1, formaA: 1, formaB: 0, verificadas: 0 },
            ]);
        });
    });

    describe('incerteza', () => {
        const { incerteza } = indicadores();

        it('o ganho da turma vem com o intervalo, reamostrando pessoas', () => {
            expect(incerteza.ganhoDaTurma!.estimativa).toBeCloseTo(2 / 3);
            expect(incerteza.ganhoDaTurma!.inferior).toBeLessThanOrEqual(incerteza.ganhoDaTurma!.estimativa);
            expect(incerteza.ganhoDaTurma!.superior).toBeGreaterThanOrEqual(incerteza.ganhoDaTurma!.estimativa);
        });

        it('a retenção e a diferença entre Firmes e Frágeis também', () => {
            expect(incerteza.retencao!.estimativa).toBeCloseTo(0.5);
            // A Ana manteve o Firme (1 de 1) e perdeu o Frágil (0 de 1).
            expect(incerteza.firmesMenosFrageis!.estimativa).toBeCloseTo(1);
        });

        it('o Firme contra o Frágil pareado, dentro da mesma pessoa, de quem tem os dois', () => {
            expect(incerteza.pareado).toMatchObject({ pessoas: 1, intervalo: { estimativa: 1 } });
        });

        it('sem revisão, não há intervalo de retenção', () => {
            const semRevisao = indicadores({ ...DADOS, respostas: DADOS.respostas.filter((r) => r.fase !== 'reteste') }).incerteza;

            expect(semRevisao.retencao).toBeNull();
            expect(semRevisao.firmesMenosFrageis).toBeNull();
            expect(semRevisao.pareado).toBeNull();
        });
    });

    describe('perfis de resposta', () => {
        // O Davi fez o diagnóstico, a prática e a verificação do MDA e começou o de Pixel Art:
        // seis respostas, todas certas e com certeza.
        const DAVI: PerfilDoExport = { ...CAIO, uid: 'uid-do-davi-321', nome: 'Davi Rocha', apelido: 'Davi', consentiuEm: em('2026-10-30 19:20') };
        const DO_DAVI: Answer[] = [
            r(DAVI.uid, 'pre', 'mda_a1', '2026-10-31 10:00', true, 3),
            r(DAVI.uid, 'pre', 'mda_a2', '2026-10-31 10:01', true, 3),
            r(DAVI.uid, 'pratica', 'mda_p1', '2026-10-31 10:05', true, 3),
            r(DAVI.uid, 'pos', 'mda_b1', '2026-10-31 10:10', true, 3),
            r(DAVI.uid, 'pos', 'mda_b2', '2026-10-31 10:11', true, 3),
            r(DAVI.uid, 'pre', 'pixel_a1', '2026-10-31 10:20', true, 3),
        ];
        const comODavi = () => indicadores({ ...DADOS, perfis: [...DADOS.perfis, DAVI], respostas: [...DADOS.respostas, ...DO_DAVI] });
        const contagem = (ind: Indicadores) => Object.fromEntries(ind.perfisDeResposta.map((p) => [p.perfil, p.pessoas]));

        it('conta as pessoas de cada perfil, pelas respostas de cada uma', () => {
            expect(contagem(comODavi())).toEqual({
                domina: 1,
                em_progresso: 0,
                inseguro: 0,
                com_dificuldade: 0,
                confiante_demais: 0,
                chuta: 0,
                poucas_respostas: 3,
            });
        });

        it('a revisão não entra: ela repete as questões da verificação', () => {
            // Com a revisão, a Ana teria 7 respostas; sem ela, 5, abaixo do mínimo.
            expect(contagem(indicadores()).poucas_respostas).toBe(3);
        });

        it('cada perfil leva o nome e o critério, para a página dizer como ele foi reconhecido', () => {
            const [primeiro] = comODavi().perfisDeResposta;

            expect(primeiro.rotulo).toBe('Domina o conteúdo');
            expect(primeiro.criterio).toContain('três de cada quatro');
        });
    });

    describe('por perfil', () => {
        // Com o mínimo de pessoas em um, nenhum grupo destes exemplos é ocultado.
        const grupo = (variavel: string, rotulo: string) =>
            indicadores()
                .porGrupo.find((v) => v.titulo === variavel)!
                .grupos.find((g) => g.rotulo === rotulo) as Extract<GrupoDoRelatorio, { oculto: false }>;

        it('separa os resultados por sexo, faixa etária, experiência e aluno do site', () => {
            expect(indicadores().porGrupo.map((v) => v.titulo)).toEqual(['Sexo', 'Faixa etária', 'Experiência em criar jogos', 'Aluno do site']);
        });

        it('em cada grupo: pessoas, diagnóstico, verificação, ganho, retenção e ponto cego', () => {
            expect(grupo('Sexo', 'Feminino')).toEqual({
                rotulo: 'Feminino',
                pessoas: 2,
                oculto: false,
                pre: { acertos: 1, total: 4 },
                pos: { acertos: 3, total: 4 },
                ganho: expect.closeTo(2 / 3),
                retencao: { acertos: 1, total: 2 },
                pontoCego: { acertos: 1, total: 4 },
            });
        });

        it('o ganho do grupo sai do acerto do grupo, e não da média do ganho de cada pessoa', () => {
            // Ana sozinha teria ganho 1 e Bia 0,5 (média 0,75); o grupo, de 25% para 75%, tem 0,67.
            expect(grupo('Sexo', 'Feminino').ganho).not.toBeCloseTo(0.75);
        });

        it('quem não tem o campo fica num grupo à parte, e não some', () => {
            // O Caio é de antes de o perfil pedir o sexo; ele não fez a verificação.
            expect(grupo('Sexo', 'Não informado')).toMatchObject({ pessoas: 1, pos: { acertos: 0, total: 0 }, ganho: null });
        });

        it('"Prefiro não informar" é um grupo, diferente de quem não tem o campo', () => {
            const ind = indicadores({ ...DADOS, perfis: [{ ...ANA, sexo: 'nao_informado' }, BIA, CAIO] });
            const rotulos = ind.porGrupo.find((v) => v.titulo === 'Sexo')!.grupos.map((g) => g.rotulo);

            expect(rotulos).toEqual(['Feminino', 'Prefiro não informar', 'Não informado']);
        });

        describe('grupo pequeno não mostra números, para não apontar uma pessoa', () => {
            const sexo = (ind: Indicadores) => ind.porGrupo.find((v) => v.titulo === 'Sexo')!.grupos;

            it('por padrão, grupo com menos de cinco pessoas fica só com a contagem', () => {
                const grupos = sexo(indicadoresDoRelatorio(exportarDados(DADOS, { agora: AGORA }), CONTEUDO));

                expect(MINIMO_DE_PESSOAS_POR_GRUPO).toBe(5);
                expect(grupos).toEqual([
                    { rotulo: 'Feminino', pessoas: 2, oculto: true },
                    { rotulo: 'Não informado', pessoas: 1, oculto: true },
                ]);
            });

            it('oculta também o menor grupo visível, para o pequeno não sair da diferença com a turma', () => {
                // Feminino 2, Masculino 2 e Não informado 1: com mínimo 2, o grupo de uma pessoa
                // some e leva junto um dos de duas; sobra um só grupo com números.
                const DUDA: PerfilDoExport = { ...CAIO, uid: 'uid-da-duda', nome: 'Duda', apelido: 'Duda', sexo: 'masculino' };
                const EDU: PerfilDoExport = { ...CAIO, uid: 'uid-do-edu', nome: 'Edu', apelido: 'Edu', sexo: 'masculino' };
                const grupos = sexo(indicadores({ ...DADOS, perfis: [...DADOS.perfis, DUDA, EDU] }, 2));

                expect(grupos.map((g) => [g.rotulo, g.pessoas, g.oculto])).toEqual([
                    ['Feminino', 2, false],
                    ['Masculino', 2, true],
                    ['Não informado', 1, true],
                ]);
            });

            it('com todos os grupos no mínimo, nada é ocultado', () => {
                expect(sexo(indicadores()).every((g) => !g.oculto)).toBe(true);
            });
        });

        it('o aluno do site separa quem já é aluno de quem não é e de quem não respondeu', () => {
            const ind = indicadores({ ...DADOS, perfis: [{ ...ANA, alunoDoSite: true }, { ...BIA, alunoDoSite: false }, CAIO] });
            const rotulos = ind.porGrupo.find((v) => v.titulo === 'Aluno do site')!.grupos.map((g) => [g.rotulo, g.pessoas]);

            expect(rotulos).toEqual([
                ['Já é aluno', 1],
                ['Ainda não é', 1],
                ['Não respondeu', 1],
            ]);
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
                    titulo: 'Sexo',
                    itens: [
                        { rotulo: 'Feminino', pessoas: 2 },
                        { rotulo: 'Não informado', pessoas: 1 },
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
                {
                    titulo: 'Aluno do site',
                    itens: [{ rotulo: 'Não respondeu', pessoas: 3 }],
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

    it('tem os onze blocos, na ordem do desenho', () => {
        const html = pagina();
        const titulos = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);

        expect(titulos).toEqual([
            'Em resumo',
            'Aprendizagem',
            'Consciência do próprio saber',
            'Retenção',
            'Perfis de resposta',
            'Autoavaliação',
            'Por perfil',
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

    it('as questões a rever aparecem com o enunciado e o distrator escolhido na verificação', () => {
        const html = pagina(indicadores(), 1);

        expect(html).toContain('Enunciado de mda_a2');
        expect(html).toContain('O distrator C');
    });

    it('sem verificação feita, o bloco de conteúdo diz que não há o que julgar', () => {
        const semVerificacao = indicadores({ ...DADOS, respostas: DADOS.respostas.filter((r) => r.fase === 'pre') });

        expect(pagina(semVerificacao)).toContain('Nenhuma questão foi respondida na verificação ainda');
    });

    it('o bloco de conteúdo traz o diagnóstico à parte e avisa que serve para casos gritantes, e não para ranking', () => {
        const html = pagina();
        const bloco = html.slice(html.indexOf('<h2>Conteúdo</h2>'), html.indexOf('<h2>Quem respondeu</h2>'));

        expect(bloco).toContain('<th>Diagnóstico</th>');
        expect(bloco).toContain('casos gritantes');
        expect(bloco).toContain('não é ranking');
    });

    it('a autoavaliação mostra o n e usa a régua que começa no acaso', () => {
        const html = pagina();
        const bloco = html.slice(html.indexOf('<h2>Autoavaliação</h2>'), html.indexOf('<h2>Por perfil</h2>'));

        expect(bloco).toContain('1 pessoa');
        expect(bloco).toContain('acaso');
        expect(bloco).toContain('25%');
    });

    it('por tópico, a cobertura e o aviso de que o ganho por tópico mistura a lição com quem a escolheu', () => {
        const html = pagina();
        const bloco = html.slice(html.indexOf('<h2>Aprendizagem</h2>'), html.indexOf('<h2>Consciência'));

        expect(bloco).toContain('<th>Forma A</th>');
        expect(bloco).toContain('quem escolheu');
        expect(bloco).toContain('ganho de cada pessoa');
    });

    describe('intervalos', () => {
        it('o resumo mostra o intervalo de 95% do ganho da turma', () => {
            const resumo = pagina().slice(0, pagina().indexOf('<h2>Aprendizagem</h2>'));

            expect(resumo).toContain('IC 95%');
        });

        it('quando o intervalo do ganho cruza o zero, a página diz que não há evidência de ganho', () => {
            const ind = indicadores();
            const semEvidencia = { ...ind, incerteza: { ...ind.incerteza, ganhoDaTurma: { estimativa: 0.05, inferior: -0.1, superior: 0.2 } } };

            expect(pagina(semEvidencia)).toContain('sem evidência de ganho');
            expect(pagina(ind)).not.toContain('sem evidência de ganho');
        });

        it('o cartão da mesma pessoa também avisa quando o intervalo cruza o zero', () => {
            const ind = indicadores();
            const cruza = { ...ind, incerteza: { ...ind.incerteza, pareado: { pessoas: 30, intervalo: { estimativa: 0.1, inferior: -0.05, superior: 0.25 } } } };
            const bloco = (html: string) => html.slice(html.indexOf('Na mesma pessoa'), html.indexOf('<h2>Perfis de resposta</h2>'));

            expect(bloco(pagina(cruza))).toContain('sem evidência de diferença');
        });

        it('a retenção traz Firmes menos Frágeis com o intervalo, a comparação pareada e o aviso de composição', () => {
            const html = pagina();
            const bloco = html.slice(html.indexOf('<h2>Retenção</h2>'), html.indexOf('<h2>Perfis de resposta</h2>'));

            expect(bloco).toContain('Firmes menos Frágeis');
            expect(bloco).toContain('mesma pessoa');
            expect(bloco).toContain('chute');
        });
    });

    it('sem autoavaliação, o bloco diz que ninguém deu as notas ainda', () => {
        const html = pagina(indicadores({ ...DADOS, autoavaliacoes: [] }));

        expect(html).toContain('Ninguém deu as notas antes do primeiro diagnóstico ainda');
    });

    it('sem participantes, a página diz que ainda não há dados', () => {
        const html = pagina(indicadores({ ...DADOS, perfis: [] }));

        expect(html).toContain('Ninguém aceitou o termo ainda');
    });

    it('o bloco por perfil mostra uma tabela por variável, com o aviso de que grupo pequeno engana', () => {
        const html = pagina();
        const bloco = html.slice(html.indexOf('<h2>Por perfil</h2>'), html.indexOf('<h2>Engajamento</h2>'));

        expect(bloco).toContain('Feminino');
        expect(bloco).toContain('Não informado');
        expect(bloco.match(/<table>/g)).toHaveLength(4);
        expect(bloco).toContain('acaso');
    });

    it('no bloco por perfil, o grupo oculto mostra só quantas pessoas tem', () => {
        const html = pagina(indicadoresDoRelatorio(exportarDados(DADOS, { agora: AGORA }), CONTEUDO), 1);
        const bloco = html.slice(html.indexOf('<h2>Por perfil</h2>'), html.indexOf('<h2>Engajamento</h2>'));

        expect(bloco).toContain('menos de 5 pessoas');
        expect(bloco).not.toMatch(/\d+%/);
        expect(bloco).not.toContain('0,67');
    });

    it('no bloco por perfil, o ganho segue a amostra: com poucas respostas, não aparece', () => {
        const porPerfil = (html: string) => html.slice(html.indexOf('<h2>Por perfil</h2>'), html.indexOf('<h2>Engajamento</h2>'));

        expect(porPerfil(pagina())).not.toContain('0,67');
        expect(porPerfil(pagina(indicadores(), 1))).toContain('0,67');
    });

    it('o bloco de perfis de resposta diz o critério de cada perfil', () => {
        const html = pagina();
        const bloco = html.slice(html.indexOf('<h2>Perfis de resposta</h2>'), html.indexOf('<h2>Autoavaliação</h2>'));

        expect(bloco).toContain('Poucas respostas');
        expect(bloco).toContain('ainda não dá para dizer');
        expect(bloco).toContain('Domina o conteúdo');
    });

    it('o resumo traz o ganho da turma como número principal, com a média por pessoa ao lado', () => {
        const html = pagina();
        const resumo = html.slice(html.indexOf('<h2>Em resumo</h2>'), html.indexOf('<h2>Aprendizagem</h2>'));

        expect(resumo).toContain('Ganho da turma');
        expect(resumo).toContain('0,67');
        expect(resumo).toContain('média por pessoa: 0,75');
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
