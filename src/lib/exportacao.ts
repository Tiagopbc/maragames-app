// Exportação dos dados (M7, itens 23 e 30): transforma o que está no banco nas tabelas que o
// grupo envia à Mara Games e usa na análise. Função pura: sem React, sem Firebase, sem estado.
// Quem lê o Firestore e escreve os arquivos é o script em scripts/exportar-piloto.ts.
//
// As contas são as mesmas que o aluno vê no app: o estado e o ciclo de cada lição, o quadrante,
// o XP e a retenção vêm das funções de src/lib, e não de uma segunda versão delas.

import type { Answer, FormaPre, Question, Topico } from '../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from './bloco';
import { FUSO_MS, diaDeCalendario } from './calendario';
import { DIAS_ATE_A_REVISAO, licoesDoAluno } from './licao';
import { quadranteDe } from './quadrante';
import { resultadoDoBloco, type Taxa } from './resultado';
import { retencao } from './retencao';
import { xpDaResposta } from './xp';

// O que a exportação lê de `users/{uid}`. Nome e contato só vão para a chave do grupo.
export interface PerfilDoExport {
    uid: string;
    nome?: string;
    apelido?: string;
    email?: string;
    telefone?: string;
    experiencia?: string;
    formaPre: FormaPre | null;
    consentiuEm: number | null;
}

export interface DadosDaExportacao {
    perfis: readonly PerfilDoExport[];
    respostas: readonly Answer[];
    questoes: readonly Question[]; // dentro de cada tópico, na ordem de exibição
    topicos: readonly Topico[]; // na ordem sugerida
}

export interface OpcoesDaExportacao {
    desde?: number; // ms; só entra quem aceitou o termo a partir daqui (deixa de fora as contas de teste)
    agora?: number; // ms; diz se a revisão de uma lição já abriu. Por padrão, a hora da rodada.
}

export type Linha = Record<string, string | number | null>;

export interface Exportacao {
    eventos: Linha[]; // uma linha por resposta
    participantes: Linha[]; // uma linha por pessoa
    licoes: Linha[]; // uma linha por pessoa e por lição começada: é onde ficam o ganho e a retenção
    questoes: Linha[]; // uma linha por questão
    resumo: string; // os números agregados, em texto
    chave: Linha[]; // código ↔ nome: fica só com o grupo, nunca é enviada
}

/**
 * Ganho normalizado de Hake: do que faltava acertar no pré, a fração que passou a ser acertada
 * no pós. É negativo se o pós foi pior. É null sem pré ou sem pós, e quando o pré já foi 100%:
 * não havia o que ganhar.
 */
export function ganhoNormalizado(pre: Taxa, pos: Taxa): number | null {
    if (pre.total === 0 || pos.total === 0) return null;
    const antes = pre.acertos / pre.total;
    if (antes === 1) return null;
    return (pos.acertos / pos.total - antes) / (1 - antes);
}

/** "2026-10-30 19:10:00", no fuso fixo do app (São Luís). */
function dataHora(ms: number): string {
    return new Date(ms + FUSO_MS).toISOString().slice(0, 19).replace('T', ' ');
}

function maiorSequencia(dias: readonly number[]): number {
    const ordenados = [...new Set(dias)].sort((a, b) => a - b);
    let maior = 0;
    let atual = 0;
    ordenados.forEach((dia, i) => {
        atual = i > 0 && dia === ordenados[i - 1] + 1 ? atual + 1 : 1;
        maior = Math.max(maior, atual);
    });
    return maior;
}

const porcento = (taxa: Taxa) => (taxa.total === 0 ? 'sem respostas' : `${Math.round((taxa.acertos / taxa.total) * 100)}%`);
const fracao = (taxa: Taxa) => `${taxa.acertos} de ${taxa.total}`;
const zero = (): Taxa => ({ acertos: 0, total: 0 });
const somar = (em: Taxa, taxa: Taxa) => {
    em.acertos += taxa.acertos;
    em.total += taxa.total;
};

/**
 * Monta as tabelas da exportação. A unidade da medida é a lição (item 30): cada tópico tem o seu
 * pré, o seu pós e o seu reteste, então o ganho e a retenção saem por pessoa e por tópico, em
 * `licoes`. A linha de cada pessoa soma as lições dela em que a verificação foi concluída: só aí
 * o antes e o depois são um par.
 */
export function exportarDados(dados: DadosDaExportacao, opcoes: OpcoesDaExportacao = {}): Exportacao {
    const { questoes, topicos } = dados;
    const agora = opcoes.agora ?? Date.now();
    const ids = topicos.map((t) => t.id);
    const questaoPorId = new Map(questoes.map((q) => [q.id, q]));

    // Só quem aceitou o termo, na ordem do aceite: o código é o mesmo a cada rodada.
    const participantes = dados.perfis
        .filter((p): p is PerfilDoExport & { formaPre: FormaPre; consentiuEm: number } => p.consentiuEm !== null && p.formaPre !== null)
        .filter((p) => opcoes.desde === undefined || p.consentiuEm >= opcoes.desde)
        .sort((a, b) => a.consentiuEm - b.consentiuEm || a.uid.localeCompare(b.uid))
        .map((perfil, i) => ({ perfil, codigo: `P${String(i + 1).padStart(2, '0')}` }));

    const respostasDe = (uid: string) =>
        dados.respostas.filter((r) => r.uid === uid).sort((a, b) => a.respondidaEm - b.respondidaEm);

    const eventos: Linha[] = [];
    const linhasDeParticipante: Linha[] = [];
    const linhasDeLicao: Linha[] = [];
    const total = {
        pre: zero(),
        pos: zero(),
        reteste: zero(),
        firmes: zero(),
        frageis: zero(),
        porConfianca: { 1: zero(), 2: zero(), 3: zero() },
        pontosCegosNoPos: 0,
        verificadas: 0,
        revisadas: 0,
        antesDaHora: 0,
        ganhos: [] as number[],
    };
    const porTopico = new Map<string, { pre: Taxa; pos: Taxa; pessoas: number }>();

    for (const { perfil, codigo } of participantes) {
        const respostas = respostasDe(perfil.uid);

        for (const r of respostas) {
            const questao = questaoPorId.get(r.questionId);
            const certa = questao?.alternativas.find((a) => a.correta)?.id;
            eventos.push({
                codigo,
                fase: r.fase,
                topico: r.topicId,
                questao: r.questionId,
                bloco: questao?.bloco ?? null,
                dificuldade: questao?.dificuldade ?? null,
                correta: r.correta ? 1 : 0,
                confianca: r.confianca,
                quadrante: quadranteDe(r.correta, r.confianca),
                xp: xpDaResposta(r.correta, r.confianca),
                // A posição na tela, de 1 a 4: serve para conferir efeito de posição (item 22).
                posicao_escolhida: r.ordemExibida.indexOf(r.escolha) + 1,
                posicao_certa: certa === undefined ? null : r.ordemExibida.indexOf(certa) + 1,
                tempo_ms: r.tempoMs,
                respondida_em: dataHora(r.respondidaEm),
            });
        }

        const daFase = (fase: Answer['fase']) => respostas.filter((r) => r.fase === fase);
        const daPessoa = {
            pre: zero(),
            pos: zero(),
            reteste: zero(),
            firmes: zero(),
            frageis: zero(),
            acertosNoPosComPar: 0,
            acertosNoRetesteComPar: 0,
            pontosCegosNoPos: 0,
            comecadas: 0,
            verificadas: 0,
            revisadas: 0,
            concluidas: 0,
        };

        // As mesmas contas que o app faz para a pessoa, inclusive o ciclo de quem praticou antes de
        // a lição ter diagnóstico (`cicloDoAluno`).
        const licoes = licoesDoAluno({ topicos: ids, respostas, questoes, formaPre: perfil.formaPre, agora });
        for (const licao of licoes) {
            if (licao.ultimaRespostaEm === null) continue;
            const { topicId } = licao;
            daPessoa.comecadas += 1;
            if (licao.estado.tipo === 'concluida') daPessoa.concluidas += 1;

            const pratica = resultadoDoBloco(daFase('pratica'), questoesDaPratica(questoes, topicId));
            const linha: Linha = {
                codigo,
                topico: topicId,
                ciclo: licao.ciclo,
                estado: licao.estado.tipo,
                pratica_acertos: pratica.acertos,
                pratica_total: pratica.total,
                antes_acertos: null,
                antes_total: null,
                depois_acertos: null,
                depois_total: null,
                // Sem revisão, os campos dela ficam vazios: zero diria que a pessoa errou tudo.
                revisao_acertos: null,
                revisao_total: null,
                ganho_normalizado: null,
                retencao: null,
                firmes_na_verificacao: null,
                firmes_mantidos: null,
                frageis_na_verificacao: null,
                frageis_mantidos: null,
                dias_ate_a_revisao: null,
                revisao_antes_da_hora: null,
                pontos_cegos_na_verificacao: null,
            };
            linhasDeLicao.push(linha);
            if (licao.ciclo !== 'completo') continue;

            const blocoDoPre = questoesDoBlocoMedido(questoes, 'pre', [topicId], perfil.formaPre);
            const blocoDoPos = questoesDoBlocoMedido(questoes, 'pos', [topicId], perfil.formaPre);
            const pre = resultadoDoBloco(daFase('pre'), blocoDoPre);
            const pos = resultadoDoBloco(daFase('pos'), blocoDoPos);
            // Só com o diagnóstico e a verificação completos o antes e o depois são um par.
            if (pre.total < blocoDoPre.length || pos.total < blocoDoPos.length) continue;

            const idsDoPos = new Set(blocoDoPos.map((q) => q.id));
            const ganho = ganhoNormalizado(pre, pos);
            Object.assign(linha, {
                antes_acertos: pre.acertos,
                antes_total: pre.total,
                depois_acertos: pos.acertos,
                depois_total: pos.total,
                ganho_normalizado: ganho,
                pontos_cegos_na_verificacao: pos.quadrantes.ponto_cego,
            });
            daPessoa.verificadas += 1;
            somar(daPessoa.pre, pre);
            somar(daPessoa.pos, pos);
            daPessoa.pontosCegosNoPos += pos.quadrantes.ponto_cego;
            for (const nivel of [1, 2, 3] as const) somar(total.porConfianca[nivel], pos.porConfianca[nivel]);
            const doTopico = porTopico.get(topicId) ?? { pre: zero(), pos: zero(), pessoas: 0 };
            somar(doTopico.pre, pre);
            somar(doTopico.pos, pos);
            doTopico.pessoas += 1;
            porTopico.set(topicId, doTopico);

            const reteste = resultadoDoBloco(daFase('reteste'), blocoDoPos);
            if (reteste.total < blocoDoPos.length) continue;

            // Dias entre a verificação e a revisão, pelos horários do servidor: o app libera a
            // revisão pelo relógio do aparelho, então é aqui que se vê quem a fez antes da hora.
            const fimDaVerificacao = Math.max(...daFase('pos').filter((r) => idsDoPos.has(r.questionId)).map((r) => r.respondidaEm));
            const inicioDaRevisao = daFase('reteste').find((r) => idsDoPos.has(r.questionId))!.respondidaEm;
            const dias = diaDeCalendario(inicioDaRevisao) - diaDeCalendario(fimDaVerificacao);
            const retido = retencao(respostas, blocoDoPos);
            Object.assign(linha, {
                revisao_acertos: reteste.acertos,
                revisao_total: reteste.total,
                retencao: retido.razao,
                firmes_na_verificacao: retido.mantidas.firme.total,
                firmes_mantidos: retido.mantidas.firme.acertos,
                frageis_na_verificacao: retido.mantidas.fragil.total,
                frageis_mantidos: retido.mantidas.fragil.acertos,
                dias_ate_a_revisao: dias,
                revisao_antes_da_hora: dias < DIAS_ATE_A_REVISAO ? 1 : 0,
            });
            daPessoa.revisadas += 1;
            somar(daPessoa.reteste, reteste);
            somar(daPessoa.firmes, retido.mantidas.firme);
            somar(daPessoa.frageis, retido.mantidas.fragil);
            daPessoa.acertosNoPosComPar += retido.acertosNoPos;
            daPessoa.acertosNoRetesteComPar += retido.acertosNoReteste;
            if (dias < DIAS_ATE_A_REVISAO) total.antesDaHora += 1;
        }

        const dias = respostas.map((r) => diaDeCalendario(r.respondidaEm));
        const revisou = daPessoa.revisadas > 0;
        const ganho = ganhoNormalizado(daPessoa.pre, daPessoa.pos);

        linhasDeParticipante.push({
            codigo,
            forma_pre: perfil.formaPre,
            experiencia: perfil.experiencia ?? null,
            aceitou_em: dataHora(perfil.consentiuEm).slice(0, 10),
            licoes_comecadas: daPessoa.comecadas,
            licoes_verificadas: daPessoa.verificadas,
            licoes_revisadas: daPessoa.revisadas,
            licoes_concluidas: daPessoa.concluidas,
            // A soma das lições com a verificação feita: o antes e o depois das mesmas lições.
            pre_acertos: daPessoa.pre.acertos,
            pre_total: daPessoa.pre.total,
            pos_acertos: daPessoa.pos.acertos,
            pos_total: daPessoa.pos.total,
            // Sem revisão, os campos dela ficam vazios: zero diria que a pessoa errou tudo.
            reteste_acertos: revisou ? daPessoa.reteste.acertos : null,
            reteste_total: revisou ? daPessoa.reteste.total : null,
            ganho_normalizado: ganho,
            retencao: daPessoa.acertosNoPosComPar === 0 ? null : daPessoa.acertosNoRetesteComPar / daPessoa.acertosNoPosComPar,
            firmes_no_pos: revisou ? daPessoa.firmes.total : null,
            firmes_mantidos: revisou ? daPessoa.firmes.acertos : null,
            frageis_no_pos: revisou ? daPessoa.frageis.total : null,
            frageis_mantidos: revisou ? daPessoa.frageis.acertos : null,
            pontos_cegos_no_pos: daPessoa.pontosCegosNoPos,
            dias_ativos: new Set(dias).size,
            maior_sequencia: maiorSequencia(dias),
        });

        somar(total.pre, daPessoa.pre);
        somar(total.pos, daPessoa.pos);
        somar(total.reteste, daPessoa.reteste);
        somar(total.firmes, daPessoa.firmes);
        somar(total.frageis, daPessoa.frageis);
        total.pontosCegosNoPos += daPessoa.pontosCegosNoPos;
        total.verificadas += daPessoa.verificadas;
        total.revisadas += daPessoa.revisadas;
        if (ganho !== null) total.ganhos.push(ganho);
    }

    // Qualidade do conteúdo. O reteste fica de fora: ele repete as questões do pós, e contá-lo
    // daria peso dobrado a quem voltou.
    const uids = new Set(participantes.map((p) => p.perfil.uid));
    const validas = dados.respostas.filter((r) => uids.has(r.uid) && r.fase !== 'reteste');
    const linhasDeQuestao: Linha[] = ids.flatMap((topicId) =>
        questoes
            .filter((q) => q.topicId === topicId)
            .map((q) => {
                const respostas = validas.filter((r) => r.questionId === q.id);
                const acertos = respostas.filter((r) => r.correta).length;
                const pontosCegos = respostas.filter((r) => quadranteDe(r.correta, r.confianca) === 'ponto_cego').length;
                // No empate, fica o primeiro na ordem das alternativas do conteúdo.
                const distrator = q.alternativas
                    .filter((a) => !a.correta)
                    .map((a) => ({ texto: a.texto, vezes: respostas.filter((r) => r.escolha === a.id).length }))
                    .reduce<{ texto: string; vezes: number } | null>((maior, d) => (d.vezes > (maior?.vezes ?? 0) ? d : maior), null);

                return {
                    questao: q.id,
                    topico: q.topicId,
                    bloco: q.bloco,
                    dificuldade_prevista: q.dificuldade,
                    respostas: respostas.length,
                    acertos,
                    taxa_de_acerto: respostas.length === 0 ? null : acertos / respostas.length,
                    pontos_cegos: pontosCegos,
                    taxa_de_ponto_cego: respostas.length === 0 ? null : pontosCegos / respostas.length,
                    distrator_mais_escolhido: distrator?.texto ?? null,
                    vezes_no_distrator: distrator?.vezes ?? null,
                };
            })
    );

    const n = participantes.length;
    const media = (valores: number[]) => (valores.length === 0 ? null : valores.reduce((a, b) => a + b, 0) / valores.length);
    const ganhoMedio = media(total.ganhos);
    const resumo = [
        '# Beast Maragames: resumo dos dados',
        '',
        `Participantes: ${n}`,
        `Lições com a verificação feita: ${total.verificadas}`,
        `Lições com a revisão feita: ${total.revisadas} de ${total.verificadas}`,
        `Revisões feitas antes dos ${DIAS_ATE_A_REVISAO} dias: ${total.antesDaHora}`,
        '',
        '## Aprendizagem',
        '',
        'Só entram as lições com o diagnóstico e a verificação completos.',
        '',
        `Acerto no diagnóstico: ${porcento(total.pre)} (${fracao(total.pre)})`,
        `Acerto na verificação: ${porcento(total.pos)} (${fracao(total.pos)})`,
        `Acerto na revisão: ${porcento(total.reteste)} (${fracao(total.reteste)})`,
        `Ganho normalizado médio, por pessoa: ${ganhoMedio === null ? 'sem dados' : ganhoMedio.toFixed(2).replace('.', ',')}`,
        '',
        '## Por tópico',
        '',
        ...(porTopico.size === 0
            ? ['Nenhuma lição com a verificação feita.']
            : topicos
                  .filter((t) => porTopico.has(t.id))
                  .map((t) => {
                      const { pre, pos, pessoas } = porTopico.get(t.id)!;
                      return `${t.titulo}: antes ${porcento(pre)} (${fracao(pre)}), depois ${porcento(pos)} (${fracao(pos)}), ${pessoas} pessoa${pessoas === 1 ? '' : 's'}`;
                  })),
        '',
        '## Consciência do próprio saber (verificação)',
        '',
        `Quando marcou Palpite, acertou: ${porcento(total.porConfianca[1])} (${fracao(total.porConfianca[1])})`,
        `Quando marcou Tenho dúvida, acertou: ${porcento(total.porConfianca[2])} (${fracao(total.porConfianca[2])})`,
        `Quando marcou Tenho certeza, acertou: ${porcento(total.porConfianca[3])} (${fracao(total.porConfianca[3])})`,
        `Pontos cegos (erro com certeza): ${total.pontosCegosNoPos} de ${total.pos.total} respostas`,
        '',
        '## Retenção: a confiança prevê o esquecimento?',
        '',
        `Acertos Firmes no pós que continuaram certos no reteste: ${fracao(total.firmes)}`,
        `Acertos Frágeis no pós que continuaram certos no reteste: ${fracao(total.frageis)}`,
        '',
        `Com ${n} participante${n === 1 ? '' : 's'} e sem grupo de controle, estes números descrevem e não provam causa.`,
        '',
    ].join('\n');

    return {
        eventos,
        participantes: linhasDeParticipante,
        licoes: linhasDeLicao,
        questoes: linhasDeQuestao,
        resumo,
        chave: participantes.map(({ perfil, codigo }) => ({
            codigo,
            uid: perfil.uid,
            nome: perfil.nome ?? null,
            apelido: perfil.apelido ?? null,
            email: perfil.email ?? null,
        })),
    };
}

const MARCA = '﻿'; // faz o Excel abrir o arquivo como UTF-8

function campo(valor: string | number | null): string {
    if (valor === null) return '';
    if (typeof valor === 'number') {
        // Decimal com vírgula e até três casas, como o Excel em português espera.
        return Number.isInteger(valor) ? String(valor) : String(Number(valor.toFixed(3))).replace('.', ',');
    }
    return /[;"\r\n]/.test(valor) ? `"${valor.replaceAll('"', '""')}"` : valor;
}

/** CSV com ponto e vírgula, para abrir direto no Excel em português. As colunas são as da primeira linha. */
export function paraCsv(linhas: readonly Linha[]): string {
    if (linhas.length === 0) return MARCA;
    const colunas = Object.keys(linhas[0]);
    const texto = [colunas.join(';'), ...linhas.map((linha) => colunas.map((c) => campo(linha[c] ?? null)).join(';'))];
    return MARCA + texto.map((l) => `${l}\r\n`).join('');
}

/**
 * Nome da pasta de uma rodada. Com filtro, a data dele entra no nome: duas rodadas no mesmo
 * dia, uma com as contas de teste e outra sem, não escrevem uma por cima da outra.
 */
export function pastaDaExportacao(hoje: string, desde?: string): string {
    return desde ? `${hoje}-desde-${desde}` : hoje;
}

export interface ArquivoDaExportacao {
    nome: string;
    conteudo: string;
}

/**
 * O que o script grava. Sem participantes não há arquivo nenhum: um filtro que não pega
 * ninguém gravaria tabelas vazias, sem avisar.
 */
export function arquivosDaExportacao(exportado: Exportacao): ArquivoDaExportacao[] {
    if (exportado.participantes.length === 0) return [];
    return [
        { nome: 'eventos.csv', conteudo: paraCsv(exportado.eventos) },
        { nome: 'participantes.csv', conteudo: paraCsv(exportado.participantes) },
        { nome: 'licoes.csv', conteudo: paraCsv(exportado.licoes) },
        { nome: 'questoes.csv', conteudo: paraCsv(exportado.questoes) },
        { nome: 'resumo.md', conteudo: exportado.resumo },
        // Liga cada código ao nome: fica só com o grupo, nunca é enviada.
        { nome: 'chave.csv', conteudo: paraCsv(exportado.chave) },
    ];
}
