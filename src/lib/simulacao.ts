// Base sintética para validar o app (itens 23 e 35): uma turma de alunos virtuais, de perfis
// variados, respondendo às lições. Função pura: sem React, sem Firebase, sem estado, e sem
// Math.random fora de `sementeAleatoria`, para a mesma semente dar sempre a mesma turma.
//
// Nada disto vem do banco nem vai para ele. O que sai daqui tem o mesmo formato do que o script
// lê do Firestore, então passa pelas mesmas contas da exportação e do relatório, sem atalho. A
// página gerada diz, no topo, que os dados são sintéticos: servem para testar o que a ferramenta
// mede, e não são evidência sobre a retenção de ninguém.
//
// Nada é plantado no resultado. Cada aluno tem um tipo, sorteado com proporções que também são
// sorteadas a cada turma, e traços sorteados dentro de faixas largas. O acerto, a confiança, o
// ganho e o que se mantém na revisão saem do que cada aluno sabe de verdade em cada momento. O
// cadastro inteiro (sexo, idade, experiência, estudo, aluno do site, plataforma) sai de um sorteio
// à parte e não toca o desempenho: nenhum recorte do relatório nasce plantado.
//
// Os cenários (item 36) servem para conferir a ferramenta: a mesma turma, com os mesmos alunos e
// os mesmos caminhos, respondendo com uma regra trocada. No nulo ninguém aprende nem esquece; na
// confiança cega a certeza não depende de saber; na forma B difícil, as questões da forma B são
// mais difíceis, para ver se o contrabalanceamento de A e B neutraliza a diferença.

import type {
    Answer,
    Autoavaliacao,
    Confianca,
    Dificuldade,
    Experiencia,
    FaixaEtaria,
    Fase,
    FormaPre,
    Question,
    Sexo,
    SituacaoDeEstudo,
    Topico,
} from '../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from './bloco';
import { diaDeCalendario, inicioDoDia } from './calendario';
import { gerador, hash, ordemDasAlternativas } from './embaralhar';
import type { DadosDaExportacao, PerfilDoExport, TentativaDoExport } from './exportacao';
import { DIAS_ATE_A_REVISAO } from './licao';
import { modulosDosTopicos } from './perfil';
import { perfilDeResposta, type PerfilDeResposta } from './perfis-de-resposta';

export type TipoDeAluno = 'domina' | 'aluno_do_curso' | 'com_dificuldade' | 'chutador' | 'confiante_demais' | 'inseguro' | 'desiste_cedo';

export const TIPOS_DE_ALUNO: Record<TipoDeAluno, { rotulo: string; descricao: string }> = {
    domina: { rotulo: 'Domina o assunto', descricao: 'sabe muito do conteúdo e declara a confiança certa' },
    aluno_do_curso: { rotulo: 'Aluno do curso', descricao: 'parte de um conhecimento médio e aprende bem com a lição' },
    com_dificuldade: { rotulo: 'Com dificuldade', descricao: 'sabe pouco, aprende devagar e esquece mais' },
    chutador: { rotulo: 'Chutador', descricao: 'responde em poucos segundos, sem ler, com qualquer confiança' },
    confiante_demais: { rotulo: 'Confiante demais', descricao: 'marca certeza também quando não sabe' },
    inseguro: { rotulo: 'Inseguro', descricao: 'sabe boa parte, mas quase nunca marca certeza' },
    desiste_cedo: { rotulo: 'Desiste cedo', descricao: 'para no meio do primeiro diagnóstico ou logo depois dele' },
};

const TIPOS = Object.keys(TIPOS_DE_ALUNO) as TipoDeAluno[];

type Faixa = readonly [minimo: number, maximo: number];

// Os traços de cada tipo, como faixas: cada aluno sorteia o seu valor dentro delas.
interface Tracos {
    saber: Faixa; // chance de saber uma questão básica antes de estudar
    aprender: Faixa; // do que faltava saber, quanto a lição ensina
    esquecer: Faixa; // do que sabia na verificação, quanto some em 7 dias
    certezaSabendo: Faixa; // chance de marcar "Tenho certeza" quando sabe
    certezaSemSaber: Faixa; // chance de marcar "Tenho certeza" quando não sabe
    tempoSegundos: Faixa;
    segue: Faixa; // chance de começar mais uma lição depois de terminar uma
    abandona: Faixa; // chance de parar no meio de uma lição, a cada passo
    volta: Faixa; // chance de voltar para a revisão
    viesDaNota: Faixa; // o quanto a nota que se dá fica acima (ou abaixo) do que sabe
}

const TRACOS: Record<TipoDeAluno, Tracos> = {
    domina: {
        saber: [0.72, 0.97],
        aprender: [0.3, 0.7],
        esquecer: [0.02, 0.15],
        certezaSabendo: [0.75, 0.95],
        certezaSemSaber: [0.02, 0.12],
        tempoSegundos: [6, 20],
        segue: [0.65, 0.95],
        abandona: [0, 0.03],
        volta: [0.5, 0.95],
        viesDaNota: [-0.1, 0.1],
    },
    aluno_do_curso: {
        saber: [0.3, 0.6],
        aprender: [0.4, 0.8],
        esquecer: [0.05, 0.25],
        certezaSabendo: [0.45, 0.8],
        certezaSemSaber: [0.05, 0.2],
        tempoSegundos: [8, 35],
        segue: [0.6, 0.95],
        abandona: [0, 0.05],
        volta: [0.4, 0.9],
        viesDaNota: [-0.1, 0.2],
    },
    com_dificuldade: {
        saber: [0, 0.2],
        aprender: [0.05, 0.3],
        esquecer: [0.15, 0.45],
        certezaSabendo: [0.2, 0.5],
        certezaSemSaber: [0.03, 0.15],
        tempoSegundos: [10, 45],
        segue: [0.3, 0.8],
        abandona: [0.02, 0.1],
        volta: [0.2, 0.7],
        viesDaNota: [0, 0.3],
    },
    chutador: {
        saber: [0, 0.15],
        aprender: [0, 0.15],
        esquecer: [0.3, 0.7],
        certezaSabendo: [0.1, 0.7], // a mesma com e sem saber: a confiança não diz nada
        certezaSemSaber: [0.1, 0.7],
        tempoSegundos: [1.5, 5],
        segue: [0.2, 0.7],
        abandona: [0.02, 0.1],
        volta: [0.1, 0.5],
        viesDaNota: [-0.2, 0.4],
    },
    confiante_demais: {
        saber: [0.1, 0.45],
        aprender: [0.15, 0.5],
        esquecer: [0.1, 0.35],
        certezaSabendo: [0.85, 0.98],
        certezaSemSaber: [0.55, 0.9],
        tempoSegundos: [5, 20],
        segue: [0.4, 0.9],
        abandona: [0, 0.06],
        volta: [0.3, 0.8],
        viesDaNota: [0.25, 0.5],
    },
    inseguro: {
        saber: [0.5, 0.85],
        aprender: [0.3, 0.7],
        esquecer: [0.05, 0.25],
        certezaSabendo: [0.02, 0.15],
        certezaSemSaber: [0, 0.05],
        tempoSegundos: [12, 45],
        segue: [0.5, 0.9],
        abandona: [0, 0.05],
        volta: [0.4, 0.9],
        viesDaNota: [-0.35, -0.1],
    },
    desiste_cedo: {
        saber: [0.05, 0.6],
        aprender: [0.1, 0.6],
        esquecer: [0.1, 0.4],
        certezaSabendo: [0.3, 0.7],
        certezaSemSaber: [0.05, 0.3],
        tempoSegundos: [6, 30],
        segue: [0, 0],
        abandona: [1, 1],
        volta: [0, 0.2],
        viesDaNota: [-0.2, 0.3],
    },
};

// Quem sabe acerta quase sempre; quem não sabe acerta no chute, uma em quatro.
const ACERTO_SABENDO = 0.96;
const ACERTO_NO_CHUTE = 0.25;
// Quem não sabia na verificação às vezes aprende depois, por conta própria.
const APRENDE_ATE_A_REVISAO = 0.08;

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const DIAS_DE_ENTRADA = 14; // a turma chega ao longo de duas semanas
/** Quanto tempo a turma dura: o bastante para todas as revisões abrirem. */
export const DIAS_DA_SIMULACAO = 60;

export type Cenario = 'base' | 'nulo' | 'confianca_cega' | 'forma_b_dificil';

export const CENARIOS: Record<Cenario, { rotulo: string; descricao: string }> = {
    base: { rotulo: 'Base', descricao: 'a turma como foi sorteada' },
    nulo: { rotulo: 'Nulo', descricao: 'ninguém aprende nem esquece: a lição não faz efeito' },
    confianca_cega: { rotulo: 'Confiança cega', descricao: 'a chance de marcar certeza é a mesma sabendo ou não' },
    forma_b_dificil: { rotulo: 'Forma B difícil', descricao: 'as questões da forma B são mais difíceis que as da A' },
};

// Na forma B difícil, a chance de saber uma questão da forma B cai a este tanto.
const FATOR_DA_FORMA_B_DIFICIL = 0.75;

export interface OpcoesDaSimulacao {
    alunos: number;
    inicio: number; // ms; o dia em que os primeiros alunos chegam
    semente: number; // a turma: tipos, traços e respostas
    // Só o sorteio do cadastro: sexo, idade, estado, experiência, estudo, aluno do site, plataforma
    // e aceite de contato. Por padrão, a mesma semente. Separado para provar que nada disso entra
    // no desempenho.
    sementeDoPerfil?: number;
    cenario?: Cenario; // por padrão, 'base'
    limiteDiario?: boolean; // no máximo uma lição nova por dia de calendário
    diasDeEstudo?: number; // lições novas só nos primeiros N dias desde a entrada; as revisões seguem
}

export interface Turma {
    dados: DadosDaExportacao;
    agora: number; // o instante em que a turma é "fotografada", depois de todas as revisões
    tipos: Record<string, TipoDeAluno>; // o tipo sorteado para cada aluno, pelo uid: só para validar
    proporcoes: Record<TipoDeAluno, number>; // as proporções sorteadas para esta turma
    topicos: Record<string, string[]>; // os tópicos que cada aluno começou, na ordem
    cenario: Cenario;
}

// O que os arquivos de content/ trazem. O seed acrescenta o resto ao gravar no banco.
export type TopicoDoRepositorio = { topicId: string; ordem: number; titulo: string; modulo?: string | null };
export type QuestaoDoRepositorio = Omit<Question, 'lessonId' | 'order' | 'versaoConteudo'>;

/**
 * Os tópicos e as questões de content/, no formato que as contas do app usam. A versão é a que o
 * seed grava (o hash dos dois arquivos), calculada pelo script.
 */
export function conteudoDoRepositorio(
    topicos: readonly TopicoDoRepositorio[],
    questoes: readonly QuestaoDoRepositorio[],
    versaoConteudo = 'simulacao'
): { topicos: Topico[]; questoes: Question[] } {
    const emOrdem = [...topicos].sort((a, b) => a.ordem - b.ordem);
    return {
        topicos: emOrdem.map((t) => ({ id: t.topicId, titulo: t.titulo, modulo: t.modulo ?? null, ordem: t.ordem })),
        questoes: emOrdem.flatMap((t) =>
            questoes
                .filter((q) => q.topicId === t.topicId)
                .map((q, i) => ({ ...q, lessonId: `licao_${t.topicId}`, order: i + 1, versaoConteudo }))
        ),
    };
}

/** Uma semente nova, para cada rodada sortear uma turma diferente. É o único sorteio sem semente. */
export function sementeAleatoria(): number {
    const valores = new Uint32Array(1);
    globalThis.crypto.getRandomValues(valores);
    return (valores[0] % 2_000_000_000) + 1;
}

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(maximo, Math.max(minimo, valor));
const dentro = (sorteio: () => number, [minimo, maximo]: Faixa) => minimo + sorteio() * (maximo - minimo);

/** Sorteia uma opção com os pesos dados. */
function escolher<T>(sorteio: () => number, opcoes: readonly (readonly [T, number])[]): T {
    const total = opcoes.reduce((soma, [, peso]) => soma + peso, 0);
    let ponto = sorteio() * total;
    for (const [opcao, peso] of opcoes) {
        ponto -= peso;
        if (ponto < 0) return opcao;
    }
    return opcoes[opcoes.length - 1][0];
}

/**
 * Proporções sorteadas para uma lista de opções, somando 1: qualquer divisão é igualmente
 * provável, de uma bem equilibrada a uma em que uma opção quase some.
 */
function proporcoesSorteadas(sorteio: () => number, quantas: number): number[] {
    const pesos = Array.from({ length: quantas }, () => -Math.log(1 - sorteio()));
    const total = pesos.reduce((a, b) => a + b, 0);
    return pesos.map((p) => p / total);
}

/** Pesos de referência puxados para cima ou para baixo, ao acaso, a cada turma. */
function pesosVariados(sorteio: () => number, base: readonly number[]): number[] {
    return base.map((p) => p * (0.25 + sorteio() * 1.5));
}

// Questão mais difícil é sabida por menos gente e rende menos numa lição só.
const PESO_DA_DIFICULDADE: Record<Dificuldade, number> = { basico: 1, intermediario: 0.85, avancado: 0.7 };
const EXPERIENCIAS: readonly Experiencia[] = ['iniciante', 'intermediario', 'avancado'];
const PESOS_DA_EXPERIENCIA = [0.5, 0.35, 0.15];
const PESOS_DA_SITUACAO = [0.1, 0.5, 0.08, 0.22, 0.1];
const SITUACOES: readonly SituacaoDeEstudo[] = ['ensino_medio', 'graduacao', 'pos', 'formado', 'nao_estudo'];
const FAIXAS: readonly FaixaEtaria[] = ['18_24', '25_34', '35_44', '45_mais'];
const UFS_DA_TURMA = ['MA', 'PI', 'PA', 'CE', 'SP'] as const;

/**
 * Uma turma de alunos virtuais e o que cada um responderia. Só faz lição de ciclo completo: sem as
 * duas formas não há diagnóstico nem verificação.
 */
export function simularTurma(conteudo: { topicos: readonly Topico[]; questoes: readonly Question[] }, opcoes: OpcoesDaSimulacao): Turma {
    const { questoes, topicos: todos } = conteudo;
    const { semente } = opcoes;
    const sementeDoPerfil = opcoes.sementeDoPerfil ?? semente;
    const cenario = opcoes.cenario ?? 'base';
    // A dificuldade real de cada questão: a prevista pelo autor, deslocada por um sorteio fixo da
    // turma. Assim a real pode divergir da prevista, e as formas A e B não são gêmeas perfeitas.
    const dificuldadeReal = new Map(
        questoes.map((q) => {
            const fator = PESO_DA_DIFICULDADE[q.dificuldade] * (0.8 + gerador(hash(`${semente}|${q.id}|dificuldade`))() * 0.4);
            return [q.id, cenario === 'forma_b_dificil' && q.bloco === 'forma_b' ? fator * FATOR_DA_FORMA_B_DIFICIL : fator];
        })
    );
    // O quanto cada alternativa errada atrai quem não sabe: fixo por questão, como num item de verdade.
    const atracao = (questaoId: string, alternativaId: string) => 0.3 + gerador(hash(`${questaoId}|${alternativaId}`))();
    const agora = opcoes.inicio + DIAS_DA_SIMULACAO * DIA;
    const modulos = modulosDosTopicos(todos);
    const topicos = todos.filter((t) =>
        (['forma_a', 'forma_b'] as const).every((bloco) => questoes.some((q) => q.topicId === t.id && q.bloco === bloco))
    );

    // O que vale para a turma inteira: a mistura de tipos e a de perfis.
    const daTurma = gerador(hash(`${semente}|turma`));
    const proporcoes = Object.fromEntries(proporcoesSorteadas(daTurma, TIPOS.length).map((p, i) => [TIPOS[i], p])) as Record<TipoDeAluno, number>;
    const doPerfilDaTurma = gerador(hash(`${sementeDoPerfil}|turma-perfil`));
    const semSexo = 0.03 + doPerfilDaTurma() * 0.1;
    const feminino = (1 - semSexo) * (0.3 + doPerfilDaTurma() * 0.4);
    const pesosDoSexo: readonly (readonly [Sexo, number])[] = [
        ['feminino', feminino],
        ['masculino', 1 - semSexo - feminino],
        ['nao_informado', semSexo],
    ];
    const pesosDaFaixa = pesosVariados(doPerfilDaTurma, [0.45, 0.33, 0.16, 0.06]);
    const pesosDaUf = pesosVariados(doPerfilDaTurma, [0.7, 0.1, 0.08, 0.07, 0.05]);

    const perfis: PerfilDoExport[] = [];
    const respostas: Answer[] = [];
    const tentativas: TentativaDoExport[] = [];
    const autoavaliacoes: Autoavaliacao[] = [];
    const tipos: Record<string, TipoDeAluno> = {};
    const topicosDoAluno: Record<string, string[]> = {};

    for (let i = 0; i < opcoes.alunos; i++) {
        const numeroDoAluno = String(i + 1).padStart(3, '0');
        const uid = `virtual-${numeroDoAluno}`;
        const sorteio = gerador(hash(`${semente}|${uid}|desempenho`));
        const doPerfil = gerador(hash(`${sementeDoPerfil}|${uid}|perfil`));

        const tipo = escolher(sorteio, TIPOS.map((t) => [t, proporcoes[t]] as const));
        tipos[uid] = tipo;
        const tracos = TRACOS[tipo];
        const formaPre: FormaPre = i % 2 === 0 ? 'A' : 'B';
        const consentiuEm = Math.round(opcoes.inicio + Math.floor(sorteio() * DIAS_DE_ENTRADA) * DIA + (8 + sorteio() * 13) * HORA);
        const plataforma = escolher(doPerfil, [
            ['web', 0.55],
            ['android', 0.33],
            ['ios', 0.12],
        ] as const);
        const experiencia = escolher(doPerfil, EXPERIENCIAS.map((e, k) => [e, PESOS_DA_EXPERIENCIA[k]] as const));
        const situacaoDeEstudo = escolher(doPerfil, SITUACOES.map((s, k) => [s, PESOS_DA_SITUACAO[k]] as const));
        // A pergunta é opcional no app: três em cada dez não respondem.
        const alunoDoSite = doPerfil() < 0.7 ? doPerfil() < 0.45 : undefined;

        perfis.push({
            uid,
            nome: `Aluno virtual ${numeroDoAluno}`,
            apelido: `Virtual ${i + 1}`,
            faixaEtaria: escolher(doPerfil, FAIXAS.map((f, k) => [f, pesosDaFaixa[k]] as const)),
            sexo: escolher(doPerfil, pesosDoSexo),
            uf: escolher(doPerfil, UFS_DA_TURMA.map((u, k) => [u, pesosDaUf[k]] as const)),
            aceitaContato: doPerfil() < 0.6,
            situacaoDeEstudo,
            experiencia,
            ...(alunoDoSite === undefined ? {} : { alunoDoSite }),
            formaPre,
            consentiuEm,
        });

        // Os traços deste aluno, cada um sorteado dentro da faixa do tipo.
        const saber = dentro(sorteio, tracos.saber);
        let aprender = dentro(sorteio, tracos.aprender);
        let esquecer = dentro(sorteio, tracos.esquecer);
        let certezaSabendo = dentro(sorteio, tracos.certezaSabendo);
        // No chute, a confiança não depende de saber: é a mesma nos dois casos.
        let certezaSemSaber = tipo === 'chutador' ? certezaSabendo : dentro(sorteio, tracos.certezaSemSaber);
        const duvidaEmVezDePalpite = 0.3 + sorteio() * 0.4;
        const tempoSegundos = dentro(sorteio, tracos.tempoSegundos);
        const segue = dentro(sorteio, tracos.segue);
        const abandona = dentro(sorteio, tracos.abandona);
        const volta = dentro(sorteio, tracos.volta);
        const viesDaNota = dentro(sorteio, tracos.viesDaNota);
        const saberPorModulo = new Map(modulos.map((m) => [m.nome, limitar(saber + (sorteio() - 0.5) * 0.25, 0, 0.98)]));
        // O peso de cada tópico na escolha: um interesse que não tem a ver com o tipo, e uma
        // afinidade com o que o aluno já sabe daquele módulo.
        const pesoDoTopico = new Map(topicos.map((t) => [t.id, 0.15 + sorteio() + (saberPorModulo.get(t.modulo ?? '') ?? saber)]));

        // O cenário troca uma regra depois de os traços serem sorteados: os alunos são os mesmos.
        let aprendeAteARevisao = APRENDE_ATE_A_REVISAO;
        if (cenario === 'nulo') {
            aprender = 0;
            esquecer = 0;
            aprendeAteARevisao = 0;
        }
        if (cenario === 'confianca_cega') {
            certezaSabendo = (certezaSabendo + certezaSemSaber) / 2;
            certezaSemSaber = certezaSabendo;
        }

        const notas: Record<string, number> = {};
        for (const modulo of modulos) {
            const sabe = saberPorModulo.get(modulo.nome)!;
            notas[modulo.id] = 1 + Math.round(limitar(sabe + viesDaNota + (sorteio() - 0.5) * 0.2, 0, 1) * 4);
        }
        autoavaliacoes.push({ uid, notas, respondidaEm: consentiuEm + 2 * MINUTO });

        let relogio = consentiuEm + 4 * MINUTO;
        let numero = 0;

        const abrirTentativa = (topicId: string, fase: Fase) => tentativas.push({ id: `${uid}-${topicId}-${fase}`, plataforma, versaoDoApp: '1.0.0' });

        /** Uma resposta, de quem sabe ou não a questão: o acerto e a confiança saem juntos. */
        const responder = (questao: Question, fase: Fase, sabe: boolean) => {
            const correta = sorteio() < (sabe ? ACERTO_SABENDO : ACERTO_NO_CHUTE);
            const certeza = sabe ? certezaSabendo : certezaSemSaber;
            // Os dois sorteios saem sempre, para a sequência não depender do resultado: assim um
            // cenário que muda a confiança não muda o resto da turma.
            const sorteioDaCerteza = sorteio();
            const sorteioDaDuvida = sorteio();
            const confianca: Confianca = sorteioDaCerteza < certeza ? 3 : sorteioDaDuvida < duvidaEmVezDePalpite ? 2 : 1;
            const erradas = questao.alternativas.filter((a) => !a.correta);
            // Os distratores não atraem igual, e quem atrai mais depende da questão.
            const errada = escolher(
                sorteio,
                erradas.map((a) => [a.id, atracao(questao.id, a.id)] as const)
            );
            const tempoMs = Math.max(800, Math.round(tempoSegundos * 1000 * (0.6 + sorteio() * 0.8)));
            relogio += tempoMs + Math.round(2000 + sorteio() * 6000);
            numero += 1;
            const resposta: Answer = {
                id: `${uid}-r${numero}`,
                uid,
                questionId: questao.id,
                topicId: questao.topicId,
                attemptId: `${uid}-${questao.topicId}-${fase}`,
                fase,
                escolha: correta ? questao.alternativas.find((a) => a.correta)!.id : errada,
                ordemExibida: ordemDasAlternativas(uid, questao.id, fase, questao.alternativas.map((a) => a.id)),
                correta,
                confianca,
                tempoMs,
                respondidaEm: relogio,
            };
            respostas.push(resposta);
            return resposta;
        };

        const revisoes: { topicId: string; quando: number; daVerificacao: { questao: Question; sabia: boolean }[] }[] = [];
        const feitos: string[] = [];
        topicosDoAluno[uid] = feitos;
        const diaDeEntrada = diaDeCalendario(consentiuEm);
        let diaDaUltimaLicao: number | null = null;

        // Cada lição, o aluno escolhe um tópico que ainda não fez, pelos pesos dele. Não há
        // refazer: o app não mede uma lição duas vezes.
        while (feitos.length < topicos.length) {
            if (feitos.length > 0 && sorteio() >= segue) break;
            const restantes = topicos.filter((t) => !feitos.includes(t.id));
            const topico = escolher(sorteio, restantes.map((t) => [t, pesoDoTopico.get(t.id)!] as const));
            if (feitos.length > 0) relogio += Math.round(Math.floor(sorteio() * 4) * DIA + (10 + sorteio() * 180) * MINUTO);
            // Com o limite diário, a lição nova fica para o dia seguinte, de manhã ou de tarde.
            if (opcoes.limiteDiario && diaDaUltimaLicao !== null && diaDeCalendario(relogio) <= diaDaUltimaLicao) {
                relogio = Math.round(inicioDoDia(diaDaUltimaLicao + 1) + (8 + sorteio() * 12) * HORA);
            }
            if (opcoes.diasDeEstudo !== undefined && diaDeCalendario(relogio) - diaDeEntrada >= opcoes.diasDeEstudo) break;
            feitos.push(topico.id);
            diaDaUltimaLicao = diaDeCalendario(relogio);

            const chance = (q: Question) => (saberPorModulo.get(topico.modulo ?? '') ?? saber) * dificuldadeReal.get(q.id)!;
            const antes = (q: Question) => limitar(chance(q), 0, 0.98);
            const depois = (q: Question, quanto: number) =>
                limitar(antes(q) + (1 - antes(q)) * aprender * dificuldadeReal.get(q.id)! * quanto, 0, 0.98);

            // Diagnóstico. Quem desiste cedo para no meio dele ou logo depois.
            const doDiagnostico = questoesDoBlocoMedido(questoes, 'pre', [topico.id], formaPre);
            abrirTentativa(topico.id, 'pre');
            const noDiagnostico = tipo === 'desiste_cedo' ? 1 + Math.floor(sorteio() * doDiagnostico.length) : doDiagnostico.length;
            for (const q of doDiagnostico.slice(0, noDiagnostico)) responder(q, 'pre', sorteio() < antes(q));
            if (tipo === 'desiste_cedo' || sorteio() < abandona) break;

            // Cartão e prática: a pessoa já leu o conceito, mas ainda está aprendendo.
            relogio += Math.round((2 + sorteio() * 6) * MINUTO);
            const daPratica = questoesDaPratica(questoes, topico.id);
            if (daPratica.length > 0) abrirTentativa(topico.id, 'pratica');
            for (const q of daPratica) responder(q, 'pratica', sorteio() < depois(q, 0.6));
            if (sorteio() < abandona) break;

            // Verificação: o que a pessoa sabe agora é o que ela leva para a revisão.
            relogio += Math.round((1 + sorteio() * 4) * MINUTO);
            abrirTentativa(topico.id, 'pos');
            const daVerificacao = questoesDoBlocoMedido(questoes, 'pos', [topico.id], formaPre).map((questao) => {
                const sabia = sorteio() < depois(questao, 1);
                responder(questao, 'pos', sabia);
                return { questao, sabia };
            });

            // A revisão abre 7 dias depois; nem todo mundo volta, e quem volta não volta no primeiro dia.
            if (sorteio() < volta) {
                const dia = diaDeCalendario(relogio) + DIAS_ATE_A_REVISAO + Math.floor(sorteio() * 5);
                revisoes.push({ topicId: topico.id, quando: Math.round(inicioDoDia(dia) + (8 + sorteio() * 12) * HORA), daVerificacao });
            }
        }

        // As revisões, cada uma no seu dia. O que se sabia pode ter sido esquecido; o que não se
        // sabia raramente foi aprendido no meio-tempo.
        for (const revisao of revisoes.sort((a, b) => a.quando - b.quando)) {
            relogio = Math.max(relogio + 5 * MINUTO, revisao.quando);
            if (relogio + HORA > agora) continue;
            abrirTentativa(revisao.topicId, 'reteste');
            for (const { questao, sabia } of revisao.daVerificacao) {
                const sabeAinda = sabia ? sorteio() >= esquecer : sorteio() < aprendeAteARevisao;
                responder(questao, 'reteste', sabeAinda);
            }
        }
    }

    // Como no banco, onde cada pessoa tem as suas respostas na ordem em que foram dadas.
    const ordemDoAluno = new Map(perfis.map((p, i) => [p.uid, i]));
    respostas.sort((a, b) => ordemDoAluno.get(a.uid)! - ordemDoAluno.get(b.uid)! || a.respondidaEm - b.respondidaEm);

    return {
        dados: { perfis, respostas, questoes, topicos: todos, tentativas, autoavaliacoes },
        agora,
        tipos,
        proporcoes,
        topicos: topicosDoAluno,
        cenario,
    };
}

/**
 * O tipo sorteado de cada aluno contra o perfil que as respostas dele mostram, fora a revisão.
 * Serve para conferir o classificador: a diagonal não prova nada sozinha, porque os tipos foram
 * desenhados junto com os perfis, mas os desvios dela mostram onde o classificador confunde.
 */
export function matrizDeConfusao(turma: Turma): Record<TipoDeAluno, Record<PerfilDeResposta, number>> {
    const vazia = (): Record<PerfilDeResposta, number> => ({
        domina: 0,
        em_progresso: 0,
        inseguro: 0,
        com_dificuldade: 0,
        confiante_demais: 0,
        chuta: 0,
        poucas_respostas: 0,
    });
    const matriz = Object.fromEntries(TIPOS.map((t) => [t, vazia()])) as Record<TipoDeAluno, Record<PerfilDeResposta, number>>;
    for (const perfil of turma.dados.perfis) {
        const delas = turma.dados.respostas.filter((r) => r.uid === perfil.uid && r.fase !== 'reteste');
        matriz[turma.tipos[perfil.uid]][perfilDeResposta(delas)] += 1;
    }
    return matriz;
}
