import type { Answer, BlocoQuestao, Confianca, Fase, Question, Topico } from '../../types/domain';
import { exportarPiloto, ganhoNormalizado, paraCsv, type DadosDoPiloto, type PerfilDoExport } from '../exportacao';

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

const DADOS: DadosDoPiloto = {
    perfis: [BIA, TESTE, SEM_TERMO, ANA],
    respostas: [...DA_BIA, ...DA_ANA, r(TESTE.uid, 'pre', 'mda_a1', '2026-10-06 10:05', true)],
    questoes: QUESTOES,
    topicos: TOPICOS,
};

const DESDE = em('2026-10-30 00:00');
const exportado = () => exportarPiloto(DADOS, { desde: DESDE });
const linhaDa = (codigo: string) => exportado().participantes.find((p) => p.codigo === codigo)!;

describe('quem entra na exportação', () => {
    it('só quem aceitou o termo a partir da data pedida, com código pela ordem do aceite', () => {
        expect(exportado().chave.map((c) => [c.codigo, c.nome])).toEqual([
            ['P01', 'Ana Beatriz Souza'],
            ['P02', 'Bianca Lima'],
        ]);
    });

    it('sem data, entra todo mundo que aceitou o termo', () => {
        expect(exportarPiloto(DADOS).chave.map((c) => c.nome)).toEqual([
            'Conta de Teste',
            'Ana Beatriz Souza',
            'Bianca Lima',
        ]);
    });

    it('o código não depende da ordem em que os perfis chegam do banco', () => {
        const embaralhado = exportarPiloto({ ...DADOS, perfis: [ANA, SEM_TERMO, BIA, TESTE] }, { desde: DESDE });

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

    // O porteiro do app usa o relógio do aparelho; aqui a conta é pelos horários do servidor (item 22).
    it('dias entre o pós e o reteste, pelos horários gravados, e quem ficou fora da janela', () => {
        expect(linhaDa('P01')).toMatchObject({ dias_ate_o_reteste: 7, fora_da_janela: 0 });
        expect(linhaDa('P02')).toMatchObject({ dias_ate_o_reteste: 3, fora_da_janela: 1 });
    });

    it('ponto cego no pós, trilha e dias de uso', () => {
        expect(linhaDa('P01')).toMatchObject({
            pontos_cegos_no_pos: 0,
            topicos_da_trilha: 1,
            // 30/10, 31/10 e 06/11: três dias com resposta; os dois primeiros, seguidos.
            dias_ativos: 3,
            maior_sequencia: 2,
        });
        expect(linhaDa('P02')).toMatchObject({ pontos_cegos_no_pos: 1, topicos_da_trilha: 0, dias_ativos: 2, maior_sequencia: 1 });
    });

    it('quem não fez o reteste fica com os campos dele vazios, e não com zero', () => {
        const semReteste = exportarPiloto(
            { ...DADOS, respostas: DADOS.respostas.filter((x) => x.fase !== 'reteste') },
            { desde: DESDE }
        ).participantes[0];

        expect(semReteste).toMatchObject({
            reteste_acertos: null,
            reteste_total: null,
            retencao: null,
            dias_ate_o_reteste: null,
            fora_da_janela: null,
        });
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
        const semRespostas = exportarPiloto({ ...DADOS, respostas: [] }, { desde: DESDE }).questoes[0];

        expect(semRespostas).toMatchObject({ respostas: 0, taxa_de_acerto: null, distrator_mais_escolhido: null });
    });

    it('traz a dificuldade prevista ao lado da observada', () => {
        expect(linha('mda_a1')).toMatchObject({ topico: 'mda', bloco: 'forma_a', dificuldade_prevista: 'basico' });
    });
});

describe('resumo', () => {
    it('diz quantos participaram, a adesão ao reteste e o indicador central', () => {
        const { resumo } = exportado();

        expect(resumo).toContain('Participantes: 2');
        expect(resumo).toContain('Fizeram o reteste: 2 de 2');
        expect(resumo).toContain('Fora da janela de 7 a 9 dias: 1');
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
