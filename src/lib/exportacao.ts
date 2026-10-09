// Exportação do piloto (M7, item 23): transforma o que está no banco nas tabelas que o grupo
// envia à Mara Games e usa no paper. Função pura: sem React, sem Firebase, sem estado. Quem lê
// o Firestore e escreve os arquivos é o script em scripts/exportar-piloto.ts.
//
// As contas são as mesmas que o aluno vê no app: quadrante, XP, retenção e trilha vêm das
// funções de src/lib, e não de uma segunda versão delas.

import type { Answer, FormaPre, Question, Topico } from '../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido, topicosDaTrilha, topicosMedidos } from './bloco';
import { quadranteDe } from './quadrante';
import { resultadoDoBloco, type Taxa } from './resultado';
import { retencao } from './retencao';
import { DIAS_ATE_RETESTE, FUSO_MS, ULTIMO_DIA_DA_JANELA, diaDeCalendario, terminoDoPos } from './roteiro';
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

export interface DadosDoPiloto {
    perfis: readonly PerfilDoExport[];
    respostas: readonly Answer[];
    questoes: readonly Question[]; // dentro de cada tópico, na ordem de exibição
    topicos: readonly Topico[]; // na ordem de apresentação
}

export interface OpcoesDaExportacao {
    desde?: number; // ms; só entra quem aceitou o termo a partir daqui (deixa de fora as contas de teste)
}

export type Linha = Record<string, string | number | null>;

export interface Exportacao {
    eventos: Linha[]; // uma linha por resposta
    participantes: Linha[]; // uma linha por pessoa
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

/** "2026-10-30 19:10:00", no fuso fixo do roteiro (São Luís). */
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

export function exportarPiloto(dados: DadosDoPiloto, opcoes: OpcoesDaExportacao = {}): Exportacao {
    const { questoes, topicos } = dados;
    const ids = topicos.map((t) => t.id);
    const medidos = topicosMedidos(questoes, ids);
    const daTrilha = topicosDaTrilha(questoes, ids);
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
    const total = {
        pre: { acertos: 0, total: 0 },
        pos: { acertos: 0, total: 0 },
        reteste: { acertos: 0, total: 0 },
        firmes: { acertos: 0, total: 0 },
        frageis: { acertos: 0, total: 0 },
        porConfianca: { 1: { acertos: 0, total: 0 }, 2: { acertos: 0, total: 0 }, 3: { acertos: 0, total: 0 } },
        pontosCegosNoPos: 0,
        fizeramOReteste: 0,
        foraDaJanela: 0,
        topicosDaTrilha: 0,
        ganhos: [] as number[],
    };

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

        const blocoDoPre = questoesDoBlocoMedido(questoes, 'pre', medidos, perfil.formaPre);
        const blocoDoPos = questoesDoBlocoMedido(questoes, 'pos', medidos, perfil.formaPre);
        const daFase = (fase: Answer['fase']) => respostas.filter((r) => r.fase === fase);
        const pre = resultadoDoBloco(daFase('pre'), blocoDoPre);
        const pos = resultadoDoBloco(daFase('pos'), blocoDoPos);
        const reteste = resultadoDoBloco(daFase('reteste'), blocoDoPos);
        const retido = retencao(respostas, blocoDoPos);
        const ganho = ganhoNormalizado(pre, pos);

        // Dias entre o pós e o reteste, pelos horários do servidor: o porteiro do app usa o
        // relógio do aparelho, então é aqui que se vê quem fez fora da janela (item 22).
        const fimDoPos = terminoDoPos({ respostas, questoes, topicos: medidos, formaPre: perfil.formaPre });
        const idsDoPos = new Set(blocoDoPos.map((q) => q.id));
        const inicioDoReteste = daFase('reteste').find((r) => idsDoPos.has(r.questionId))?.respondidaEm;
        const diasAteOReteste =
            fimDoPos === null || inicioDoReteste === undefined
                ? null
                : diaDeCalendario(inicioDoReteste) - diaDeCalendario(fimDoPos);
        const foraDaJanela =
            diasAteOReteste === null ? null : diasAteOReteste < DIAS_ATE_RETESTE || diasAteOReteste > ULTIMO_DIA_DA_JANELA ? 1 : 0;

        const respondidasNaPratica = new Set(daFase('pratica').map((r) => r.questionId));
        const topicosFeitos = daTrilha.filter((topicId) =>
            questoesDaPratica(questoes, topicId).every((q) => respondidasNaPratica.has(q.id))
        ).length;
        const dias = respostas.map((r) => diaDeCalendario(r.respondidaEm));
        const fezReteste = reteste.total > 0;
        const temPares = retido.pares > 0;

        linhasDeParticipante.push({
            codigo,
            forma_pre: perfil.formaPre,
            experiencia: perfil.experiencia ?? null,
            aceitou_em: dataHora(perfil.consentiuEm).slice(0, 10),
            pre_acertos: pre.acertos,
            pre_total: pre.total,
            pos_acertos: pos.acertos,
            pos_total: pos.total,
            // Sem reteste, os campos dele ficam vazios: zero diria que a pessoa errou tudo.
            reteste_acertos: fezReteste ? reteste.acertos : null,
            reteste_total: fezReteste ? reteste.total : null,
            ganho_normalizado: ganho,
            retencao: retido.razao,
            firmes_no_pos: temPares ? retido.mantidas.firme.total : null,
            firmes_mantidos: temPares ? retido.mantidas.firme.acertos : null,
            frageis_no_pos: temPares ? retido.mantidas.fragil.total : null,
            frageis_mantidos: temPares ? retido.mantidas.fragil.acertos : null,
            dias_ate_o_reteste: diasAteOReteste,
            fora_da_janela: foraDaJanela,
            pontos_cegos_no_pos: pos.quadrantes.ponto_cego,
            topicos_da_trilha: topicosFeitos,
            dias_ativos: new Set(dias).size,
            maior_sequencia: maiorSequencia(dias),
        });

        for (const [chave, taxa] of [['pre', pre], ['pos', pos], ['reteste', reteste]] as const) {
            total[chave].acertos += taxa.acertos;
            total[chave].total += taxa.total;
        }
        for (const nivel of [1, 2, 3] as const) {
            total.porConfianca[nivel].acertos += pos.porConfianca[nivel].acertos;
            total.porConfianca[nivel].total += pos.porConfianca[nivel].total;
        }
        total.firmes.acertos += retido.mantidas.firme.acertos;
        total.firmes.total += retido.mantidas.firme.total;
        total.frageis.acertos += retido.mantidas.fragil.acertos;
        total.frageis.total += retido.mantidas.fragil.total;
        total.pontosCegosNoPos += pos.quadrantes.ponto_cego;
        total.topicosDaTrilha += topicosFeitos;
        if (blocoDoPos.length > 0 && reteste.total === blocoDoPos.length) total.fizeramOReteste += 1;
        if (foraDaJanela === 1) total.foraDaJanela += 1;
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
        '# Piloto Beast Maragames: resumo',
        '',
        `Participantes: ${n}`,
        `Fizeram o reteste: ${total.fizeramOReteste} de ${n}`,
        `Fora da janela de ${DIAS_ATE_RETESTE} a ${ULTIMO_DIA_DA_JANELA} dias: ${total.foraDaJanela}`,
        '',
        '## Aprendizagem',
        '',
        `Acerto no pré-teste: ${porcento(total.pre)} (${fracao(total.pre)})`,
        `Acerto no pós-teste: ${porcento(total.pos)} (${fracao(total.pos)})`,
        `Acerto no reteste: ${porcento(total.reteste)} (${fracao(total.reteste)})`,
        `Ganho normalizado médio: ${ganhoMedio === null ? 'sem dados' : ganhoMedio.toFixed(2).replace('.', ',')}`,
        '',
        '## Consciência do próprio saber (pós-teste)',
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
        '## Trilha diária',
        '',
        `Tópicos concluídos, em média: ${n === 0 ? 'sem dados' : (total.topicosDaTrilha / n).toFixed(1).replace('.', ',')} de ${daTrilha.length}`,
        '',
        `Com ${n} participante${n === 1 ? '' : 's'} e sem grupo de controle, estes números descrevem e não provam causa.`,
        '',
    ].join('\n');

    return {
        eventos,
        participantes: linhasDeParticipante,
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
        { nome: 'questoes.csv', conteudo: paraCsv(exportado.questoes) },
        { nome: 'resumo.md', conteudo: exportado.resumo },
        // Liga cada código ao nome: fica só com o grupo, nunca é enviada.
        { nome: 'chave.csv', conteudo: paraCsv(exportado.chave) },
    ];
}
