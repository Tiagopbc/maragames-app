// Turma simulada (item 23): alunos virtuais respondendo às lições, para mostrar à Beast Maragames
// como o relatório fica com gente usando o app. Função pura: sem React, sem Firebase, sem
// estado, e sem Math.random, para a mesma semente dar sempre a mesma turma.
//
// Nada disto vem do banco nem vai para ele. O que sai daqui tem o mesmo formato do que o script
// lê do Firestore, então passa pelas mesmas contas da exportação e do relatório, sem atalho. A
// página gerada diz, no topo, que os dados são simulados: isto mostra o formato do relatório e
// valida as contas, e não é resultado de pesquisa.

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
    SituacaoDeEstudo,
    Topico,
} from '../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from './bloco';
import { diaDeCalendario, inicioDoDia } from './calendario';
import { gerador, hash, ordemDasAlternativas } from './embaralhar';
import type { DadosDaExportacao, PerfilDoExport, TentativaDoExport } from './exportacao';
import { DIAS_ATE_A_REVISAO } from './licao';
import { modulosDosTopicos } from './perfil';

// A pergunta central do estudo é se a confiança declarada prevê o esquecimento. A simulação não
// responde isso: ela mostra como o relatório fica em cada uma das duas respostas possíveis.
export type Cenario = 'confianca_preve' | 'confianca_nao_preve';

export const CENARIOS: Record<Cenario, { titulo: string; descricao: string; arquivo: string }> = {
    confianca_preve: {
        titulo: 'Cenário 1: a confiança prevê o esquecimento',
        descricao: 'Nesta turma virtual, quem acertou com certeza esquece bem menos, em 7 dias, do que quem acertou sem certeza.',
        arquivo: 'index.html',
    },
    confianca_nao_preve: {
        titulo: 'Cenário 2: a confiança não faz diferença',
        descricao: 'Nesta turma virtual, quem acertou com certeza e quem acertou sem certeza esquecem na mesma medida.',
        arquivo: 'confianca-nao-preve.html',
    },
};

// A chance de um acerto da verificação continuar certo na revisão. É a única coisa que muda de
// um cenário para o outro: o resto da turma é igual.
const RETENCAO: Record<Cenario, { firme: number; fragil: number }> = {
    confianca_preve: { firme: 0.88, fragil: 0.52 },
    confianca_nao_preve: { firme: 0.72, fragil: 0.72 },
};
// Quem errou na verificação às vezes acerta na revisão, por sorte ou por ter pensado no assunto.
const ACERTO_NA_REVISAO_DE_QUEM_ERROU = 0.3;

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const DIAS_DE_ENTRADA = 14; // a turma chega ao longo de duas semanas
const DIAS_DA_SIMULACAO = 60; // tempo para todas as revisões abrirem

export interface OpcoesDaSimulacao {
    alunos: number;
    cenario: Cenario;
    inicio: number; // ms; o dia em que os primeiros alunos chegam
    semente?: number;
}

export interface Turma {
    dados: DadosDaExportacao;
    agora: number; // o instante em que a turma é "fotografada", depois de todas as revisões
}

// O que os arquivos de content/ trazem. O seed acrescenta o resto ao gravar no banco.
export type TopicoDoRepositorio = { topicId: string; ordem: number; titulo: string; modulo?: string | null };
export type QuestaoDoRepositorio = Omit<Question, 'lessonId' | 'order' | 'versaoConteudo'>;

/** Os tópicos e as questões de content/, no formato que as contas do app usam. */
export function conteudoDoRepositorio(
    topicos: readonly TopicoDoRepositorio[],
    questoes: readonly QuestaoDoRepositorio[]
): { topicos: Topico[]; questoes: Question[] } {
    const emOrdem = [...topicos].sort((a, b) => a.ordem - b.ordem);
    return {
        topicos: emOrdem.map((t) => ({ id: t.topicId, titulo: t.titulo, modulo: t.modulo ?? null, ordem: t.ordem })),
        questoes: emOrdem.flatMap((t) =>
            questoes
                .filter((q) => q.topicId === t.topicId)
                .map((q, i) => ({ ...q, lessonId: `licao_${t.topicId}`, order: i + 1, versaoConteudo: 'simulacao' }))
        ),
    };
}

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(maximo, Math.max(minimo, valor));

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

// Questão mais difícil é sabida por menos gente e rende menos numa lição só.
const PESO_DA_DIFICULDADE: Record<Dificuldade, number> = { basico: 1, intermediario: 0.85, avancado: 0.7 };
const CONHECIMENTO_POR_EXPERIENCIA: Record<Experiencia, number> = { iniciante: 0.22, intermediario: 0.45, avancado: 0.68 };

/**
 * Uma turma de alunos virtuais, com o que cada um responderia. Cada aluno tem um perfil, um
 * conhecimento prévio por área, um jeito de declarar confiança, um ritmo de aprender e uma
 * disposição para continuar e para voltar. Só faz lição de ciclo completo.
 */
export function simularTurma(conteudo: { topicos: readonly Topico[]; questoes: readonly Question[] }, opcoes: OpcoesDaSimulacao): Turma {
    const { questoes } = conteudo;
    const semente = opcoes.semente ?? 1;
    const agora = opcoes.inicio + DIAS_DA_SIMULACAO * DIA;
    const modulos = modulosDosTopicos(conteudo.topicos);
    // Só lição de ciclo completo: sem as duas formas não há diagnóstico nem verificação.
    const topicos = conteudo.topicos.filter((t) =>
        (['forma_a', 'forma_b'] as const).every((bloco) => questoes.some((q) => q.topicId === t.id && q.bloco === bloco))
    );

    const perfis: PerfilDoExport[] = [];
    const respostas: Answer[] = [];
    const tentativas: TentativaDoExport[] = [];
    const autoavaliacoes: Autoavaliacao[] = [];

    for (let i = 0; i < opcoes.alunos; i++) {
        const uid = `virtual-${String(i + 1).padStart(3, '0')}`;
        const sorteio = gerador(hash(`${semente}|${uid}|aluno`));
        // O esquecimento tem o seu próprio sorteio: trocar de cenário não mexe em mais nada.
        const esquecimento = gerador(hash(`${semente}|${uid}|revisao`));

        const experiencia = escolher<Experiencia>(sorteio, [
            ['iniciante', 0.55],
            ['intermediario', 0.33],
            ['avancado', 0.12],
        ]);
        const formaPre: FormaPre = i % 2 === 0 ? 'A' : 'B';
        const plataforma = escolher(sorteio, [
            ['web', 0.55],
            ['android', 0.33],
            ['ios', 0.12],
        ] as const);
        const consentiuEm = Math.round(opcoes.inicio + Math.floor(sorteio() * DIAS_DE_ENTRADA) * DIA + (8 + sorteio() * 13) * HORA);

        perfis.push({
            uid,
            nome: `Aluno virtual ${String(i + 1).padStart(3, '0')}`,
            apelido: `Virtual ${i + 1}`,
            faixaEtaria: escolher<FaixaEtaria>(sorteio, [
                ['18_24', 0.45],
                ['25_34', 0.33],
                ['35_44', 0.16],
                ['45_mais', 0.06],
            ]),
            uf: escolher(sorteio, [
                ['MA', 0.7],
                ['PI', 0.1],
                ['PA', 0.08],
                ['CE', 0.07],
                ['SP', 0.05],
            ] as const),
            situacaoDeEstudo: escolher<SituacaoDeEstudo>(sorteio, [
                ['ensino_medio', 0.1],
                ['graduacao', 0.5],
                ['pos', 0.08],
                ['formado', 0.22],
                ['nao_estudo', 0.1],
            ]),
            experiencia,
            aceitaContato: sorteio() < 0.6,
            formaPre,
            consentiuEm,
        });

        // Os traços do aluno. Quem tem mais experiência sabe mais; o resto varia de pessoa para pessoa.
        const base = limitar(CONHECIMENTO_POR_EXPERIENCIA[experiencia] + (sorteio() - 0.5) * 0.24, 0.03, 0.95);
        const excessoDeConfianca = sorteio() * 0.5 - 0.05;
        const aprendizado = 0.35 + sorteio() * 0.4;
        const persistencia = 0.55 + sorteio() * 0.4;
        const voltaParaRevisar = 0.35 + sorteio() * 0.5;
        const conhecimentoPorModulo = new Map(modulos.map((m) => [m.nome, limitar(base + (sorteio() - 0.5) * 0.3, 0.02, 0.95)]));

        // A nota que a pessoa se dá: perto do que sabe, puxada para cima por quem se superestima,
        // e mais ainda por quem sabe pouco.
        const notas: Record<string, number> = {};
        for (const modulo of modulos) {
            const sabe = conhecimentoPorModulo.get(modulo.nome)!;
            const percebido = limitar(sabe + excessoDeConfianca + (0.5 - sabe) * 0.35 + (sorteio() - 0.5) * 0.2, 0, 1);
            notas[modulo.id] = 1 + Math.round(percebido * 4);
        }
        autoavaliacoes.push({ uid, notas, respondidaEm: consentiuEm + 2 * MINUTO });

        let relogio = consentiuEm + 4 * MINUTO;
        let numero = 0;

        const gravar = (questao: Question, fase: Fase, correta: boolean, confianca: Confianca, fonte: () => number) => {
            const ids = questao.alternativas.map((a) => a.id);
            const erradas = questao.alternativas.filter((a) => !a.correta);
            // Os distratores não atraem igual: o primeiro engana mais gente.
            const errada = escolher(
                fonte,
                erradas.map((a, k) => [a.id, [0.5, 0.3, 0.2][k] ?? 0.1] as const)
            );
            const tempoMs = Math.round(6000 + fonte() * 30000);
            relogio += tempoMs + Math.round(3000 + fonte() * 7000);
            numero += 1;
            const resposta: Answer = {
                id: `${uid}-r${numero}`,
                uid,
                questionId: questao.id,
                topicId: questao.topicId,
                attemptId: `${uid}-${questao.topicId}-${fase}`,
                fase,
                escolha: correta ? questao.alternativas.find((a) => a.correta)!.id : errada,
                ordemExibida: ordemDasAlternativas(uid, questao.id, fase, ids),
                correta,
                confianca,
                tempoMs,
                respondidaEm: relogio,
            };
            respostas.push(resposta);
            return resposta;
        };

        const abrirTentativa = (topicId: string, fase: Fase) => tentativas.push({ id: `${uid}-${topicId}-${fase}`, plataforma, versaoDoApp: '1.0.0' });

        /** Uma resposta de quem sabe a questão com a chance dada: o acerto e a confiança saem juntos. */
        const responder = (questao: Question, fase: Fase, chanceDeSaber: number) => {
            const sabe = sorteio() < chanceDeSaber;
            const correta = sabe ? sorteio() < 0.95 : sorteio() < 0.25;
            // Quem sabe tende a marcar certeza; quem não sabe, palpite. Quem se superestima marca
            // certeza também quando não sabe, e é daí que sai o ponto cego.
            const certeza = sabe ? limitar(0.55 + excessoDeConfianca * 0.6, 0.05, 0.95) : limitar(0.08 + excessoDeConfianca * 0.7, 0.02, 0.6);
            const duvida = (1 - certeza) * (sabe ? 0.75 : 0.45);
            const confianca = escolher<Confianca>(sorteio, [
                [3, certeza],
                [2, duvida],
                [1, 1 - certeza - duvida],
            ]);
            return gravar(questao, fase, correta, confianca, sorteio);
        };

        // A maioria segue a ordem sugerida; os outros escolhem por onde começar, como o app deixa.
        const ordem = [...topicos];
        if (sorteio() < 0.3) {
            for (let k = ordem.length - 1; k > 0; k--) {
                const j = Math.floor(sorteio() * (k + 1));
                [ordem[k], ordem[j]] = [ordem[j], ordem[k]];
            }
        }

        const revisoes: { topicId: string; quando: number; daVerificacao: Answer[] }[] = [];

        for (let k = 0; k < ordem.length; k++) {
            if (k > 0 && sorteio() >= persistencia) break;
            const topico = ordem[k];
            if (k > 0) relogio += Math.round(Math.floor(sorteio() * 4) * DIA + (10 + sorteio() * 180) * MINUTO);

            const sabeAntes = (q: Question) => (conhecimentoPorModulo.get(topico.modulo ?? '') ?? base) * PESO_DA_DIFICULDADE[q.dificuldade];
            const sabeDepois = (q: Question, quanto: number) => {
                const antes = sabeAntes(q);
                return antes + (1 - antes) * aprendizado * PESO_DA_DIFICULDADE[q.dificuldade] * quanto;
            };

            // Diagnóstico. Uma parte pequena desiste no meio dele.
            const doDiagnostico = questoesDoBlocoMedido(questoes, 'pre', [topico.id], formaPre);
            abrirTentativa(topico.id, 'pre');
            if (sorteio() < 0.04) {
                responder(doDiagnostico[0], 'pre', sabeAntes(doDiagnostico[0]));
                break;
            }
            for (const q of doDiagnostico) responder(q, 'pre', sabeAntes(q));
            if (sorteio() >= 0.9) break;

            // Cartão e prática: a pessoa já leu o conceito, mas ainda está aprendendo.
            relogio += Math.round((2 + sorteio() * 6) * MINUTO);
            const daPratica = questoesDaPratica(questoes, topico.id);
            if (daPratica.length > 0) abrirTentativa(topico.id, 'pratica');
            for (const q of daPratica) responder(q, 'pratica', sabeDepois(q, 0.7));
            if (sorteio() >= 0.92) break;

            // Verificação.
            relogio += Math.round((1 + sorteio() * 4) * MINUTO);
            abrirTentativa(topico.id, 'pos');
            const daVerificacao = questoesDoBlocoMedido(questoes, 'pos', [topico.id], formaPre).map((q) => responder(q, 'pos', sabeDepois(q, 1)));

            // A revisão abre 7 dias depois; nem todo mundo volta, e quem volta não volta no primeiro dia.
            if (sorteio() < voltaParaRevisar) {
                const dia = diaDeCalendario(relogio) + DIAS_ATE_A_REVISAO + Math.floor(sorteio() * 5);
                revisoes.push({ topicId: topico.id, quando: Math.round(inicioDoDia(dia) + (8 + sorteio() * 12) * HORA), daVerificacao });
            }
        }

        // As revisões, cada uma no seu dia. Aqui entra o cenário: o que foi esquecido.
        const retencao = RETENCAO[opcoes.cenario];
        for (const revisao of revisoes.sort((a, b) => a.quando - b.quando)) {
            relogio = Math.max(relogio + 5 * MINUTO, revisao.quando);
            if (relogio + HORA > agora) continue;
            abrirTentativa(revisao.topicId, 'reteste');
            for (const naVerificacao of revisao.daVerificacao) {
                const questao = questoes.find((q) => q.id === naVerificacao.questionId)!;
                const chance = !naVerificacao.correta
                    ? ACERTO_NA_REVISAO_DE_QUEM_ERROU
                    : naVerificacao.confianca === 3
                      ? retencao.firme
                      : retencao.fragil;
                const correta = esquecimento() < chance;
                const confianca = escolher<Confianca>(
                    esquecimento,
                    correta
                        ? [
                              [3, 0.6],
                              [2, 0.3],
                              [1, 0.1],
                          ]
                        : [
                              [3, 0.2],
                              [2, 0.35],
                              [1, 0.45],
                          ]
                );
                gravar(questao, 'reteste', correta, confianca, esquecimento);
            }
        }
    }

    // Como no banco, onde cada pessoa tem as suas respostas na ordem em que foram dadas.
    const ordemDoAluno = new Map(perfis.map((p, i) => [p.uid, i]));
    respostas.sort((a, b) => ordemDoAluno.get(a.uid)! - ordemDoAluno.get(b.uid)! || a.respondidaEm - b.respondidaEm);

    return { dados: { perfis, respostas, questoes, topicos: conteudo.topicos, tentativas, autoavaliacoes }, agora };
}
