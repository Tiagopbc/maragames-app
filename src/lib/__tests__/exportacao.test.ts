import type { Answer, BlocoQuestao, Confianca, Fase, Question, Topico } from '../../types/domain';
import {
    arquivosDaExportacao,
    exportarDados,
    ganhoNormalizado,
    paraCsv,
    pastaDaExportacao,
    type DadosDaExportacao,
    type PerfilDoExport,
} from '../exportacao';

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

// Um tópico medido, com duas questões por forma e uma de prática, e um da trilha diária.
const QUESTOES: Question[] = [
    questao('mda_a1', 'mda', 'forma_a', 1),
    questao('mda_a2', 'mda', 'forma_a', 2),
    questao('mda_b1', 'mda', 'forma_b', 3),
    questao('mda_b2', 'mda', 'forma_b', 4),
    questao('mda_p1', 'mda', 'pratica', 5),
    questao('gdd_p1', 'gdd', 'pratica', 1),
];

const TOPICOS: Topico[] = [
    { id: 'mda', titulo: 'Framework MDA', modulo: null, ordem: 1 },
    { id: 'gdd', titulo: 'GDD', modulo: null, ordem: 5 },
];

const ANA: PerfilDoExport = {
    uid: 'uid-da-ana-123',
    nome: 'Ana Beatriz Souza',
    apelido: 'Aninha',
    email: 'ana.souza@exemplo.com',
    telefone: '98999990001',
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
    experiencia: 'avancado',
    formaPre: 'B',
    consentiuEm: em('2026-10-30 19:05'),
};

// Conta de teste do grupo, de antes do piloto, e alguém que criou conta e não aceitou o termo.
const TESTE: PerfilDoExport = { ...ANA, uid: 'uid-de-teste', nome: 'Conta de Teste', consentiuEm: em('2026-10-06 10:00') };
const SEM_TERMO: PerfilDoExport = { ...BIA, uid: 'uid-sem-termo', nome: 'Carla Sem Termo', formaPre: null, consentiuEm: null };

let n = 0;
function r(
    uid: string,
    fase: Fase,
    questionId: string,
    quando: string,
    correta: boolean,
    confianca: Confianca = 3,
    escolha?: string
): Answer {
    n += 1;
    return {
        id: `r${n}`,
        uid,
        questionId,
        topicId: questionId.split('_')[0],
        attemptId: 't',
        fase,
        escolha: escolha ?? (correta ? 'a' : 'b'),
        ordemExibida: ['c', 'a', 'd', 'b'],
        correta,
        confianca,
        tempoMs: 4_200,
        respondidaEm: em(quando),
    };
}

// A Ana fez tudo: pré (1 de 2), prática, pós (2 de 2), um tópico da trilha e o reteste no dia 7.
const DA_ANA: Answer[] = [
    r(ANA.uid, 'pre', 'mda_a1', '2026-10-30 19:10', true, 1),
    r(ANA.uid, 'pre', 'mda_a2', '2026-10-30 19:11', false, 3),
    r(ANA.uid, 'pratica', 'mda_p1', '2026-10-30 19:20', true, 3),
    r(ANA.uid, 'pos', 'mda_b1', '2026-10-30 19:40', true, 3),
    r(ANA.uid, 'pos', 'mda_b2', '2026-10-30 19:41', true, 2),
    r(ANA.uid, 'pratica', 'gdd_p1', '2026-10-31 09:00', true, 3),
    r(ANA.uid, 'reteste', 'mda_b1', '2026-11-06 10:00', true, 3),
    r(ANA.uid, 'reteste', 'mda_b2', '2026-11-06 10:01', false, 2),
];

// A Bia fez o dia 1 (forma B no pré) e o reteste cedo demais, no dia 3.
const DA_BIA: Answer[] = [
    r(BIA.uid, 'pre', 'mda_b1', '2026-10-30 19:10', false, 3, 'c'),
    r(BIA.uid, 'pre', 'mda_b2', '2026-10-30 19:11', false, 1, 'c'),
    r(BIA.uid, 'pratica', 'mda_p1', '2026-10-30 19:20', false, 2, 'd'),
    r(BIA.uid, 'pos', 'mda_a1', '2026-10-30 19:40', true, 3),
    r(BIA.uid, 'pos', 'mda_a2', '2026-10-30 19:41', false, 3, 'c'),
    r(BIA.uid, 'reteste', 'mda_a1', '2026-11-02 10:00', true, 3),
    r(BIA.uid, 'reteste', 'mda_a2', '2026-11-02 10:01', false, 1, 'c'),
];

const DADOS: DadosDaExportacao = {
    perfis: [BIA, TESTE, SEM_TERMO, ANA],
    respostas: [...DA_BIA, ...DA_ANA, r(TESTE.uid, 'pre', 'mda_a1', '2026-10-06 10:05', true)],
    questoes: QUESTOES,
    topicos: TOPICOS,
};

const DESDE = em('2026-10-30 00:00');
// A exportação roda depois de tudo: 20/11.
const AGORA = em('2026-11-20 12:00');
const exportado = () => exportarDados(DADOS, { desde: DESDE, agora: AGORA });
const licaoDa = (codigo: string, topico: string) => exportado().licoes.find((l) => l.codigo === codigo && l.topico === topico)!;
const linhaDa = (codigo: string) => exportado().participantes.find((p) => p.codigo === codigo)!;

describe('quem entra na exportação', () => {
    it('só quem aceitou o termo a partir da data pedida, com código pela ordem do aceite', () => {
        expect(exportado().chave.map((c) => [c.codigo, c.nome])).toEqual([
            ['P01', 'Ana Beatriz Souza'],
            ['P02', 'Bianca Lima'],
        ]);
    });

    it('sem data, entra todo mundo que aceitou o termo', () => {
        expect(exportarDados(DADOS).chave.map((c) => c.nome)).toEqual([
            'Conta de Teste',
            'Ana Beatriz Souza',
            'Bianca Lima',
        ]);
    });

    it('o código não depende da ordem em que os perfis chegam do banco', () => {
        const embaralhado = exportarDados({ ...DADOS, perfis: [ANA, SEM_TERMO, BIA, TESTE] }, { desde: DESDE });

        expect(embaralhado.chave.map((c) => [c.codigo, c.uid])).toEqual(exportado().chave.map((c) => [c.codigo, c.uid]));
    });

    it('resposta de quem ficou de fora não entra nos eventos', () => {
        expect(exportado().eventos).toHaveLength(DA_ANA.length + DA_BIA.length);
    });
});

// O que sai para a Mara Games leva um código no lugar de nome e contato (item 23).
describe('nada que identifique alguém sai nos arquivos que são enviados', () => {
    it.each(['eventos', 'participantes', 'questoes'] as const)('%s', (arquivo) => {
        const texto = paraCsv(exportado()[arquivo]);

        for (const perfil of [ANA, BIA]) {
            for (const dado of [perfil.uid, perfil.nome, perfil.apelido, perfil.email, perfil.telefone]) {
                expect(texto).not.toContain(dado);
            }
        }
    });

    it('resumo', () => {
        const { resumo } = exportado();

        for (const dado of [ANA.uid, ANA.nome, ANA.email, BIA.uid, BIA.nome, BIA.email]) {
            expect(resumo).not.toContain(dado);
        }
    });

    it('a chave, que fica só com o grupo, é o único lugar com o nome', () => {
        expect(exportado().chave[0]).toEqual({
            codigo: 'P01',
            uid: ANA.uid,
            nome: ANA.nome,
            apelido: ANA.apelido,
            email: ANA.email,
            cidade: null,
        });
    });
});

describe('eventos: uma linha por resposta', () => {
    it('traz o código, a fase, o acerto, a confiança, o quadrante, o XP e as posições', () => {
        const primeiro = exportado().eventos[0];

        expect(primeiro).toEqual({
            codigo: 'P01',
            fase: 'pre',
            topico: 'mda',
            questao: 'mda_a1',
            bloco: 'forma_a',
            dificuldade: 'basico',
            correta: 1,
            confianca: 1,
            quadrante: 'fragil',
            xp: 1,
            // A ordem exibida foi c, a, d, b: a escolhida (a) estava na posição 2, e a certa também.
            posicao_escolhida: 2,
            posicao_certa: 2,
            tempo_ms: 4200,
            respondida_em: '2026-10-30 19:10:00',
            plataforma: null,
            versao_do_app: null,
        });
    });

    it('sai por participante e, dentro dele, na ordem em que as respostas foram dadas', () => {
        const eventos = exportado().eventos;

        expect(eventos.map((e) => e.codigo)).toEqual([...DA_ANA.map(() => 'P01'), ...DA_BIA.map(() => 'P02')]);
        expect(eventos.slice(0, 3).map((e) => e.questao)).toEqual(['mda_a1', 'mda_a2', 'mda_p1']);
    });

    it('a posição da certa é a da tela, não a do gabarito', () => {
        const erroDaBia = exportado().eventos.find((e) => e.codigo === 'P02' && e.questao === 'mda_b1' && e.fase === 'pre')!;

        // A Bia marcou c, que estava na posição 1; a certa (a) estava na 2.
        expect(erroDaBia).toMatchObject({ correta: 0, posicao_escolhida: 1, posicao_certa: 2, quadrante: 'ponto_cego', xp: -4 });
    });
});

describe('participantes: uma linha por pessoa', () => {
    it('acertos de cada fase medida', () => {
        expect(linhaDa('P01')).toMatchObject({
            forma_pre: 'A',
            experiencia: 'iniciante',
            pre_acertos: 1,
            pre_total: 2,
            pos_acertos: 2,
            pos_total: 2,
            reteste_acertos: 1,
            reteste_total: 2,
        });
    });

    it('ganho normalizado: do que faltava aprender no pré, quanto foi aprendido', () => {
        // Ana: 50% no pré, 100% no pós: aprendeu tudo o que faltava.
        expect(linhaDa('P01').ganho_normalizado).toBe(1);
        // Bia: 0% no pré, 50% no pós.
        expect(linhaDa('P02').ganho_normalizado).toBe(0.5);
    });

    it('retenção e o que foi mantido, separando Firme de Frágil', () => {
        expect(linhaDa('P01')).toMatchObject({
            retencao: 0.5,
            firmes_no_pos: 1,
            firmes_mantidos: 1,
            frageis_no_pos: 1,
            frageis_mantidos: 0,
        });
    });

    // A correção do chute (item 37) precisa do acerto em cada nível de confiança, e o acerto
    // conta também as erradas: por isso as respostas todas da verificação, das lições revisadas.
    it('quantas respostas da verificação revisada foram com confiança alta e com baixa, certas ou não', () => {
        expect(linhaDa('P01')).toMatchObject({ confianca_alta_no_pos: 1, confianca_baixa_no_pos: 1 });
        // A Bia marcou certeza nas duas, e errou uma.
        expect(linhaDa('P02')).toMatchObject({ confianca_alta_no_pos: 2, confianca_baixa_no_pos: 0, firmes_no_pos: 1 });
    });

    it('quantas lições a pessoa começou, verificou, revisou e concluiu', () => {
        // Ana: MDA com revisão feita e GDD (só prática) concluída.
        expect(linhaDa('P01')).toMatchObject({ licoes_comecadas: 2, licoes_verificadas: 1, licoes_revisadas: 1, licoes_concluidas: 2 });
        expect(linhaDa('P02')).toMatchObject({ licoes_comecadas: 1, licoes_verificadas: 1, licoes_revisadas: 1, licoes_concluidas: 1 });
    });

    it('ponto cego no pós e dias de uso', () => {
        expect(linhaDa('P01')).toMatchObject({
            pontos_cegos_no_pos: 0,
            // 30/10, 31/10 e 06/11: três dias com resposta; os dois primeiros, seguidos.
            dias_ativos: 3,
            maior_sequencia: 2,
        });
        expect(linhaDa('P02')).toMatchObject({ pontos_cegos_no_pos: 1, dias_ativos: 2, maior_sequencia: 1 });
    });

    it('só a lição com a verificação completa entra no antes e depois da pessoa', () => {
        // Sem a segunda resposta do pós, a verificação da Ana fica pela metade.
        const pelaMetade = exportarDados(
            { ...DADOS, respostas: DADOS.respostas.filter((x) => !(x.uid === ANA.uid && x.questionId === 'mda_b2')) },
            { desde: DESDE, agora: AGORA }
        ).participantes[0];

        expect(pelaMetade).toMatchObject({ licoes_verificadas: 0, pre_total: 0, pos_total: 0, ganho_normalizado: null });
    });

    it('quem não fez o reteste fica com os campos dele vazios, e não com zero', () => {
        const semReteste = exportarDados(
            { ...DADOS, respostas: DADOS.respostas.filter((x) => x.fase !== 'reteste') },
            { desde: DESDE, agora: AGORA }
        ).participantes[0];

        expect(semReteste).toMatchObject({
            reteste_acertos: null,
            reteste_total: null,
            retencao: null,
            licoes_revisadas: 0,
            confianca_alta_no_pos: null,
            confianca_baixa_no_pos: null,
        });
    });
});

// O ganho e a retenção de cada lição de cada pessoa (item 30): a unidade da medida é o tópico.
describe('licoes: uma linha por pessoa e por lição começada', () => {
    it('a lição de ciclo completo traz o antes, o depois, a revisão, o ganho e a retenção', () => {
        expect(licaoDa('P01', 'mda')).toMatchObject({
            ciclo: 'completo',
            estado: 'concluida',
            pratica_acertos: 1,
            pratica_total: 1,
            antes_acertos: 1,
            antes_total: 2,
            depois_acertos: 2,
            depois_total: 2,
            revisao_acertos: 1,
            revisao_total: 2,
            ganho_normalizado: 1,
            retencao: 0.5,
            firmes_na_verificacao: 1,
            firmes_mantidos: 1,
            frageis_na_verificacao: 1,
            frageis_mantidos: 0,
            pontos_cegos_na_verificacao: 0,
        });
    });

    // O app libera a revisão pelo relógio do aparelho; aqui a conta é pelos horários do servidor.
    it('dias entre a verificação e a revisão, e quem a fez antes dos 7 dias', () => {
        expect(licaoDa('P01', 'mda')).toMatchObject({ dias_ate_a_revisao: 7, revisao_antes_da_hora: 0 });
        expect(licaoDa('P02', 'mda')).toMatchObject({ dias_ate_a_revisao: 3, revisao_antes_da_hora: 1 });
    });

    it('a lição só com prática sai com o ciclo curto e os campos do antes e depois vazios', () => {
        expect(licaoDa('P01', 'gdd')).toMatchObject({
            ciclo: 'curto',
            estado: 'concluida',
            pratica_acertos: 1,
            pratica_total: 1,
            antes_acertos: null,
            depois_acertos: null,
            ganho_normalizado: null,
            retencao: null,
        });
    });

    it('lição que a pessoa não começou não tem linha', () => {
        expect(exportado().licoes.map((l) => `${l.codigo}/${l.topico}`)).toEqual(['P01/mda', 'P01/gdd', 'P02/mda']);
    });

    it('sem a revisão, os campos dela ficam vazios, e não com zero', () => {
        const semRevisao = exportarDados(
            { ...DADOS, respostas: DADOS.respostas.filter((x) => x.fase !== 'reteste') },
            { desde: DESDE, agora: AGORA }
        ).licoes[0];

        expect(semRevisao).toMatchObject({
            estado: 'revisao',
            revisao_acertos: null,
            revisao_total: null,
            retencao: null,
            dias_ate_a_revisao: null,
            revisao_antes_da_hora: null,
        });
    });

    it('nada que identifique alguém sai nas linhas de lição', () => {
        const texto = paraCsv(exportado().licoes);

        expect(texto).not.toContain('Ana');
        expect(texto).not.toContain(ANA.uid);
    });
});

describe('ganhoNormalizado', () => {
    it('é a fração do que faltava no pré e foi ganha no pós', () => {
        expect(ganhoNormalizado({ acertos: 1, total: 4 }, { acertos: 3, total: 4 })).toBeCloseTo(2 / 3);
    });

    it('é negativo quando o pós foi pior que o pré', () => {
        expect(ganhoNormalizado({ acertos: 2, total: 4 }, { acertos: 1, total: 4 })).toBe(-0.5);
    });

    // Quem já gabaritou o pré não tinha o que ganhar: a divisão não existe.
    it('é indefinido quando o pré já foi 100%', () => {
        expect(ganhoNormalizado({ acertos: 4, total: 4 }, { acertos: 4, total: 4 })).toBeNull();
    });

    it('é indefinido sem pré ou sem pós', () => {
        expect(ganhoNormalizado({ acertos: 0, total: 0 }, { acertos: 3, total: 4 })).toBeNull();
        expect(ganhoNormalizado({ acertos: 1, total: 4 }, { acertos: 0, total: 0 })).toBeNull();
    });
});

describe('questoes: a qualidade do conteúdo', () => {
    const linha = (id: string) => exportado().questoes.find((q) => q.questao === id)!;

    it('acerto e ponto cego de cada questão, sem contar o reteste, que a repete', () => {
        // mda_a2: a Ana errou com certeza no pré e a Bia errou com certeza no pós.
        expect(linha('mda_a2')).toMatchObject({ respostas: 2, acertos: 0, taxa_de_acerto: 0, pontos_cegos: 2 });
        // mda_b1: a Bia errou no pré e a Ana acertou no pós; as duas respostas do reteste não entram.
        expect(linha('mda_b1')).toMatchObject({ respostas: 2, acertos: 1, taxa_de_acerto: 0.5 });
    });

    it('o distrator mais escolhido, pelo texto', () => {
        // Em mda_a2, a Ana marcou b e a Bia marcou c: empate, fica o primeiro na ordem das alternativas.
        expect(linha('mda_a2')).toMatchObject({ distrator_mais_escolhido: 'O distrator B', vezes_no_distrator: 1 });
        expect(linha('mda_b2')).toMatchObject({ distrator_mais_escolhido: 'O distrator C', vezes_no_distrator: 1 });
    });

    it('questão sem resposta aparece, com a taxa vazia', () => {
        const semRespostas = exportarDados({ ...DADOS, respostas: [] }, { desde: DESDE }).questoes[0];

        expect(semRespostas).toMatchObject({ respostas: 0, taxa_de_acerto: null, distrator_mais_escolhido: null });
    });

    it('separa as fases: a dificuldade sai do diagnóstico, e a qualidade, só da verificação', () => {
        // mda_a2: a Ana errou no diagnóstico (marcou b); a Bia errou com certeza na verificação (marcou c).
        expect(linha('mda_a2')).toMatchObject({
            diagnostico_respostas: 1,
            diagnostico_acertos: 0,
            verificacao_respostas: 1,
            verificacao_acertos: 0,
            verificacao_pontos_cegos: 1,
            verificacao_distrator_mais_escolhido: 'O distrator C',
            verificacao_vezes_no_distrator: 1,
        });
        // A prática não é diagnóstico nem verificação.
        expect(linha('mda_p1')).toMatchObject({ diagnostico_respostas: 0, verificacao_respostas: 0, verificacao_distrator_mais_escolhido: null });
    });

    it('traz a dificuldade prevista ao lado da observada', () => {
        expect(linha('mda_a1')).toMatchObject({ topico: 'mda', bloco: 'forma_a', dificuldade_prevista: 'basico' });
    });
});

describe('resumo', () => {
    it('diz quantos participaram, a adesão ao reteste e o indicador central', () => {
        const { resumo } = exportado();

        expect(resumo).toContain('Participantes: 2');
        expect(resumo).toContain('Lições com a verificação feita: 2');
        expect(resumo).toContain('Lições com a revisão feita: 2 de 2');
        expect(resumo).toContain('Revisões feitas antes dos 7 dias: 1');
        // Por tópico: Ana 1 de 2 e Bia 0 de 2 no diagnóstico; Ana 2 de 2 e Bia 1 de 2 na verificação.
        expect(resumo).toContain('Framework MDA: antes 25% (1 de 4), depois 75% (3 de 4), 2 pessoas');
        // Ana: 1 firme mantido de 1. Bia: 1 firme mantido de 1 (mda_a1). Frágeis: 0 de 1.
        expect(resumo).toContain('Acertos Firmes no pós que continuaram certos no reteste: 2 de 2');
        expect(resumo).toContain('Acertos Frágeis no pós que continuaram certos no reteste: 0 de 1');
    });

    it('lembra o limite do estudo', () => {
        expect(exportado().resumo).toContain('descrevem e não provam causa');
    });
});

describe('paraCsv', () => {
    it('usa ponto e vírgula, cabeçalho na primeira linha e a marca que o Excel reconhece', () => {
        const csv = paraCsv([{ codigo: 'P01', acertos: 3 }]);

        expect(csv).toBe('\uFEFFcodigo;acertos\r\nP01;3\r\n');
    });

    it('põe entre aspas o campo que tem ponto e vírgula, aspas ou quebra de linha', () => {
        const csv = paraCsv([{ texto: 'a; b' }, { texto: 'disse "oi"' }, { texto: 'duas\nlinhas' }]);

        expect(csv).toContain('"a; b"');
        expect(csv).toContain('"disse ""oi"""');
        expect(csv).toContain('"duas\nlinhas"');
    });

    it('mantém os acentos e escreve decimal com vírgula, como o Excel em português espera', () => {
        const csv = paraCsv([{ titulo: 'Lógica de Programação', taxa: 0.75 }]);

        expect(csv).toContain('Lógica de Programação;0,75');
    });

    it('campo vazio fica vazio, e não "null"', () => {
        expect(paraCsv([{ a: null, b: 1 }])).toContain('\r\n;1\r\n');
    });

    it('sem linhas, devolve só a marca', () => {
        expect(paraCsv([])).toBe('\uFEFF');
    });
});

// Duas rodadas no mesmo dia, com filtros diferentes, não podem escrever uma por cima da outra.
describe('pastaDaExportacao', () => {
    it('sem filtro, é o dia da rodada', () => {
        expect(pastaDaExportacao('2026-11-12')).toBe('2026-11-12');
    });

    it('com filtro, leva a data do filtro no nome', () => {
        expect(pastaDaExportacao('2026-11-12', '2026-10-30')).toBe('2026-11-12-desde-2026-10-30');
    });
});

describe('arquivosDaExportacao', () => {
    it('com participantes, são os seis arquivos, cada um com o seu conteúdo', () => {
        const arquivos = arquivosDaExportacao(exportado());

        expect(arquivos.map((a) => a.nome)).toEqual([
            'eventos.csv',
            'participantes.csv',
            'licoes.csv',
            'questoes.csv',
            'resumo.md',
            'chave.csv',
        ]);
        expect(arquivos[1].conteudo).toBe(paraCsv(exportado().participantes));
        expect(arquivos[2].conteudo).toBe(paraCsv(exportado().licoes));
        expect(arquivos[4].conteudo).toBe(exportado().resumo);
    });

    // Um filtro que não pega ninguém gravava arquivos vazios, sem avisar, por cima dos de antes.
    it('sem participantes, não há arquivo nenhum para gravar', () => {
        const ninguem = exportarDados(DADOS, { desde: em('2027-01-01 00:00') });

        expect(ninguem.participantes).toHaveLength(0);
        expect(arquivosDaExportacao(ninguem)).toEqual([]);
    });
});

// Os dados do perfil de 12/10/2026 em diante (item 34).
describe('os dados novos do perfil na exportação', () => {
    const ANA_COMPLETA: PerfilDoExport = {
        ...ANA,
        faixaEtaria: '18_24',
        sexo: 'feminino',
        cidade: 'São Luís',
        uf: 'MA',
        situacaoDeEstudo: 'graduacao',
        instituicao: 'UNDB',
        curso: 'Engenharia de Software',
        aceitaContato: true,
        ocupacao: 'estudo',
        engines: ['godot', 'unity'],
        linguagens: ['python'],
        estudoDeGameDesign: 'sozinho',
        interesses: ['programacao', 'game_design'],
        objetivo: 'carreira',
        tempoPorSemana: '1_a_3h',
        comoConheceu: 'instagram',
        alunoDoSite: false,
    };
    const comAAna = () =>
        exportarDados({ ...DADOS, perfis: [ANA_COMPLETA, BIA] }, { desde: DESDE, agora: AGORA });
    const daAna = () => comAAna().participantes.find((p) => p.codigo === 'P01')!;
    const daBia = () => comAAna().participantes.find((p) => p.codigo === 'P02')!;

    it('o núcleo vai para os participantes, com o código no lugar do nome', () => {
        expect(daAna()).toMatchObject({
            faixa_etaria: '18_24',
            sexo: 'feminino',
            uf: 'MA',
            situacao_de_estudo: 'graduacao',
            instituicao: 'UNDB',
            curso: 'Engenharia de Software',
        });
    });

    it('as opcionais também, com as listas separadas por barra', () => {
        expect(daAna()).toMatchObject({
            ocupacao: 'estudo',
            engines: 'godot|unity',
            linguagens: 'python',
            estudo_de_game_design: 'sozinho',
            interesses: 'programacao|game_design',
            objetivo: 'carreira',
            tempo_por_semana: '1_a_3h',
            como_conheceu: 'instagram',
            aluno_do_site: 0,
            aceita_contato: 1,
        });
    });

    it('quem não respondeu sai com os campos vazios, e não com zero', () => {
        expect(daBia()).toMatchObject({
            faixa_etaria: null,
            sexo: null,
            uf: null,
            ocupacao: null,
            engines: null,
            aluno_do_site: null,
            // O aceite de contato ausente é "não": a pessoa nunca marcou a caixa.
            aceita_contato: 0,
        });
    });

    it('a cidade ajuda a identificar a pessoa: fica só na chave do grupo', () => {
        const exportado = comAAna();

        expect(exportado.chave[0]).toMatchObject({ codigo: 'P01', cidade: 'São Luís' });
        expect(paraCsv(exportado.participantes)).not.toContain('São Luís');
        expect(paraCsv(exportado.eventos)).not.toContain('São Luís');
    });

    it('todas as linhas de participantes têm as mesmas colunas', () => {
        expect(Object.keys(daAna())).toEqual(Object.keys(daBia()));
    });
});

describe('de onde cada resposta veio', () => {
    it('a plataforma e a versão do app saem da tentativa da resposta', () => {
        const exportado = exportarDados(
            { ...DADOS, tentativas: [{ id: 't', plataforma: 'android', versaoDoApp: '1.0.0' }] },
            { desde: DESDE, agora: AGORA }
        );

        expect(exportado.eventos[0]).toMatchObject({ plataforma: 'android', versao_do_app: '1.0.0' });
    });

    it('tentativa de antes de 12/10/2026, sem esses campos, sai vazia', () => {
        expect(exportado().eventos[0]).toMatchObject({ plataforma: null, versao_do_app: null });
        expect(
            exportarDados({ ...DADOS, tentativas: [{ id: 't' }] }, { desde: DESDE, agora: AGORA }).eventos[0]
        ).toMatchObject({ plataforma: null, versao_do_app: null });
    });
});

describe('a autoavaliação na exportação', () => {
    const TOPICOS_COM_MODULO: Topico[] = [
        { id: 'mda', titulo: 'Framework MDA', modulo: 'Fundamentos de Game Design', ordem: 1 },
        { id: 'gdd', titulo: 'GDD', modulo: 'Arte & Pixel Art', ordem: 5 },
    ];
    const com = (respondidaEm: number) =>
        exportarDados(
            {
                ...DADOS,
                topicos: TOPICOS_COM_MODULO,
                autoavaliacoes: [
                    { uid: ANA.uid, notas: { fundamentos_de_game_design: 2, arte_pixel_art: 4 }, respondidaEm },
                    { uid: TESTE.uid, notas: { fundamentos_de_game_design: 5 }, respondidaEm },
                ],
            },
            { desde: DESDE, agora: AGORA }
        );

    it('uma linha por pessoa e por módulo, com o nome do módulo e o código da pessoa', () => {
        const { autoavaliacoes } = com(em('2026-10-30 19:01'));

        expect(autoavaliacoes).toEqual([
            {
                codigo: 'P01',
                modulo: 'Fundamentos de Game Design',
                nota: 2,
                respondida_em: '2026-10-30 19:01:00',
                antes_do_primeiro_diagnostico: 1,
            },
            {
                codigo: 'P01',
                modulo: 'Arte & Pixel Art',
                nota: 4,
                respondida_em: '2026-10-30 19:01:00',
                antes_do_primeiro_diagnostico: 1,
            },
        ]);
    });

    it('quem ficou de fora da exportação não entra', () => {
        expect(com(em('2026-10-30 19:01')).autoavaliacoes.every((a) => a.codigo === 'P01')).toBe(true);
    });

    // A nota só serve de "antes" se veio antes de a pessoa ver qualquer questão de diagnóstico.
    it('nota dada depois do primeiro diagnóstico sai marcada', () => {
        const { autoavaliacoes } = com(em('2026-11-10 10:00'));

        expect(autoavaliacoes[0].antes_do_primeiro_diagnostico).toBe(0);
    });

    it('sem autoavaliação nenhuma, a tabela sai vazia e o arquivo não é gravado', () => {
        expect(exportado().autoavaliacoes).toEqual([]);
        expect(arquivosDaExportacao(exportado()).map((a) => a.nome)).not.toContain('autoavaliacao.csv');
    });

    it('com autoavaliação, o arquivo entra na pasta', () => {
        expect(arquivosDaExportacao(com(em('2026-10-30 19:01'))).map((a) => a.nome)).toContain('autoavaliacao.csv');
    });
});
