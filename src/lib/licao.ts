// O ciclo de uma lição, calculado a partir das respostas (item 30): diagnóstico, estudo,
// verificação e, 7 dias depois, revisão. No dado, as fases continuam `pre`, `pratica`, `pos` e
// `reteste`. Funções puras: sem React, sem Firebase, sem estado. O estado nunca é gravado.

import type { Answer, Fase, FormaPre, Question } from '../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from './bloco';
import type { Quadrante } from './quadrante';
import { resultadoDoBloco, type RespostaDoResultado, type Taxa } from './resultado';
import { diaDeCalendario, inicioDoDia } from './roteiro';

export type QuestaoDaLicao = Pick<Question, 'id' | 'topicId' | 'bloco'>;
export type RespostaDaLicao = Pick<Answer, 'questionId' | 'fase' | 'respondidaEm'>;

// Completo: o tópico tem questões das formas A e B, então tem antes e depois. Curto: só prática.
export type Ciclo = 'completo' | 'curto';

interface Progresso {
    respondidas: number;
    total: number;
    proximaQuestaoId: string;
}

// O cartão não é estado: vê-lo não gera evento em `answers`. A tela mostra o cartão quando o
// estudo tem zero respondidas, o mesmo corte do roteiro (item 22).
export type EstadoDaLicao =
    | { tipo: 'nova' }
    | ({ tipo: 'diagnostico' } & Progresso)
    | ({ tipo: 'estudo' } & Progresso)
    | ({ tipo: 'verificacao' } & Progresso)
    // `liberaEm` é o começo do dia em que a revisão abre.
    | { tipo: 'aguardando_revisao'; liberaEm: number; diasRestantes: number }
    | ({ tipo: 'revisao'; liberadaEm: number } & Progresso)
    | { tipo: 'concluida'; concluidaEm: number };

export interface Licao {
    topicId: string;
    ciclo: Ciclo; // o da pessoa (`cicloDoAluno`), que pode ser curto num tópico de conteúdo completo
    estado: EstadoDaLicao;
    ultimaRespostaEm: number | null; // a resposta mais recente da lição, de qualquer fase
}

// A revisão abre 7 dias de calendário depois do dia da verificação, e não fecha mais: a
// distância real entre as duas fica para a análise, pelos horários do servidor.
export const DIAS_ATE_A_REVISAO = 7;

/** O ciclo que o conteúdo do tópico permite, ou null quando o tópico não tem questão que vire lição. */
export function cicloDaLicao(questoes: readonly QuestaoDaLicao[], topicId: string): Ciclo | null {
    const tem = (bloco: Question['bloco']) => questoes.some((q) => q.topicId === topicId && q.bloco === bloco);

    if (tem('forma_a') && tem('forma_b')) return 'completo';
    return tem('pratica') ? 'curto' : null;
}

/**
 * O ciclo que vale para esta pessoa. É o do conteúdo, com uma exceção: quem respondeu prática do
 * tópico antes de terminar o diagnóstico dele fica no ciclo curto. Isso acontece quando o
 * conteúdo ganha diagnóstico depois de a pessoa já ter praticado; para ela, um "antes" feito
 * depois do estudo não mede nada, e a lição concluída não pode voltar a pedir o diagnóstico.
 * No fluxo normal não acontece: a trava só abre a prática com o diagnóstico completo.
 * Sai das respostas, como tudo: nada é gravado nem migrado.
 */
export function cicloDoAluno(entrada: Pick<EntradaDaLicao, 'topicId' | 'respostas' | 'questoes' | 'formaPre'>): Ciclo | null {
    const { topicId, respostas, questoes, formaPre } = entrada;
    const doConteudo = cicloDaLicao(questoes, topicId);
    if (doConteudo !== 'completo') return doConteudo;

    const horarios = (fase: Fase, ids: readonly string[]) =>
        respostas.filter((r) => r.fase === fase && ids.includes(r.questionId)).map((r) => r.respondidaEm);

    const daPratica = horarios(
        'pratica',
        questoesDaPratica(questoes, topicId).map((q) => q.id)
    );
    if (daPratica.length === 0) return 'completo';
    // Sem a forma, não há diagnóstico feito: a prática veio antes.
    if (formaPre === null) return 'curto';

    const idsDoPre = questoesDoBlocoMedido(questoes, 'pre', [topicId], formaPre).map((q) => q.id);
    const respondidasNoPre = new Set(respostas.filter((r) => r.fase === 'pre' && idsDoPre.includes(r.questionId)).map((r) => r.questionId));
    if (respondidasNoPre.size < idsDoPre.length) return 'curto';

    // O diagnóstico só vale como "antes" se terminou antes da primeira resposta de prática.
    return Math.min(...daPratica) < Math.max(...horarios('pre', idsDoPre)) ? 'curto' : 'completo';
}

export interface EntradaDaLicao {
    topicId: string;
    respostas: readonly RespostaDaLicao[]; // todas as do aluno; as de outros tópicos são ignoradas
    questoes: readonly QuestaoDaLicao[]; // dentro de cada tópico, já na ordem de exibição
    formaPre: FormaPre | null; // users/{uid}.formaPre
    agora: number; // ms; vem de fora para a função continuar pura
}

/**
 * Em que passo a lição está: o primeiro, na ordem do ciclo da pessoa (`cicloDoAluno`), que ainda
 * tem questão sem resposta.
 */
export function estadoDaLicao(entrada: EntradaDaLicao): EstadoDaLicao {
    const { topicId, respostas, questoes, formaPre, agora } = entrada;
    const ciclo = cicloDoAluno(entrada);
    if (ciclo === null) throw new Error(`O tópico ${topicId} não tem questões: o conteúdo não foi carregado.`);

    const doTopico = new Set(questoes.filter((q) => q.topicId === topicId).map((q) => q.id));
    if (!respostas.some((r) => doTopico.has(r.questionId))) return { tipo: 'nova' };

    // Horário da resposta mais recente de cada questão, numa fase.
    const horariosDa = (fase: Fase, ids: readonly string[]): Map<string, number> => {
        const horarios = new Map<string, number>();
        for (const r of respostas) {
            if (r.fase === fase && ids.includes(r.questionId)) {
                horarios.set(r.questionId, Math.max(horarios.get(r.questionId) ?? 0, r.respondidaEm));
            }
        }
        return horarios;
    };
    // Progresso de um passo, ou null quando todas as questões dele já têm resposta.
    const progresso = (ids: readonly string[], horarios: Map<string, number>): Progresso | null => {
        const proximaQuestaoId = ids.find((id) => !horarios.has(id));
        if (proximaQuestaoId === undefined) return null;
        return { respondidas: horarios.size, total: ids.length, proximaQuestaoId };
    };

    const idsDaPratica = questoesDaPratica(questoes, topicId).map((q) => q.id);
    const daPratica = horariosDa('pratica', idsDaPratica);

    if (ciclo === 'curto') {
        const pratica = progresso(idsDaPratica, daPratica);
        return pratica ? { tipo: 'estudo', ...pratica } : { tipo: 'concluida', concluidaEm: Math.max(...daPratica.values()) };
    }

    // Sem a forma, não há como saber quais questões são o diagnóstico: a lição nem começou.
    if (formaPre === null) return { tipo: 'nova' };

    // Quais questões entram em cada fase é regra de src/lib/bloco.ts, a mesma que a tela da pergunta usa.
    const idsDoPre = questoesDoBlocoMedido(questoes, 'pre', [topicId], formaPre).map((q) => q.id);
    const idsDoPos = questoesDoBlocoMedido(questoes, 'pos', [topicId], formaPre).map((q) => q.id);

    const pre = progresso(idsDoPre, horariosDa('pre', idsDoPre));
    if (pre) return { tipo: 'diagnostico', ...pre };

    const pratica = progresso(idsDaPratica, daPratica);
    if (pratica) return { tipo: 'estudo', ...pratica };

    const doPos = horariosDa('pos', idsDoPos);
    const pos = progresso(idsDoPos, doPos);
    if (pos) return { tipo: 'verificacao', ...pos };

    const doReteste = horariosDa('reteste', idsDoPos);
    const reteste = progresso(idsDoPos, doReteste);
    if (!reteste) return { tipo: 'concluida', concluidaEm: Math.max(...doReteste.values()) };

    const diaDaLiberacao = diaDeCalendario(Math.max(...doPos.values())) + DIAS_ATE_A_REVISAO;
    const hoje = diaDeCalendario(agora);
    const liberaEm = inicioDoDia(diaDaLiberacao);

    if (hoje < diaDaLiberacao) return { tipo: 'aguardando_revisao', liberaEm, diasRestantes: diaDaLiberacao - hoje };
    return { tipo: 'revisao', liberadaEm: liberaEm, ...reteste };
}

export interface EntradaDasLicoes extends Omit<EntradaDaLicao, 'topicId'> {
    topicos: readonly string[]; // ids, na ordem sugerida do conteúdo
}

/**
 * Todas as lições do aluno, na ordem recebida. Tópico sem questão fica de fora; conteúdo sem
 * lição nenhuma é erro, para a tela não confundir banco vazio com "tudo concluído".
 */
export function licoesDoAluno(entrada: EntradaDasLicoes): Licao[] {
    const { topicos, respostas, questoes } = entrada;

    const licoes = topicos.flatMap((topicId): Licao[] => {
        const ciclo = cicloDoAluno({ ...entrada, topicId });
        if (ciclo === null) return [];

        const doTopico = new Set(questoes.filter((q) => q.topicId === topicId).map((q) => q.id));
        const horarios = respostas.filter((r) => doTopico.has(r.questionId)).map((r) => r.respondidaEm);
        return [
            {
                topicId,
                ciclo,
                estado: estadoDaLicao({ ...entrada, topicId }),
                ultimaRespostaEm: horarios.length > 0 ? Math.max(...horarios) : null,
            },
        ];
    });

    if (licoes.length === 0) throw new Error('Conteúdo sem lições: nenhum tópico tem questões.');
    return licoes;
}

// Os passos que têm tela. O cartão não tem questão; os outros são um bloco de uma fase.
export type PassoComQuestoes = 'diagnostico' | 'pratica' | 'verificacao' | 'revisao';
export type PassoDaLicao = PassoComQuestoes | 'cartao';

// O nome na tela é um; no dado, a fase continua a de sempre (item 30).
export const FASE_DO_PASSO: Record<PassoComQuestoes, Fase> = {
    diagnostico: 'pre',
    pratica: 'pratica',
    verificacao: 'pos',
    revisao: 'reteste',
};

export type DestinoDaLicao = { tipo: 'termo' } | { tipo: 'passo'; passo: PassoDaLicao };

/**
 * O que o botão principal da lição abre, ou null quando não há passo da vez (aguardando a
 * revisão, ou lição concluída). `temForma` diz se o termo foi aceito: é o aceite que define a
 * forma do diagnóstico, então a lição de ciclo completo começa por ele (decisão D3 do plano).
 */
export function destinoDaLicao(licao: Pick<Licao, 'ciclo' | 'estado'>, temForma: boolean): DestinoDaLicao | null {
    const { ciclo, estado } = licao;
    const passo = (p: PassoDaLicao): DestinoDaLicao => ({ tipo: 'passo', passo: p });

    switch (estado.tipo) {
        case 'nova':
            if (ciclo === 'curto') return passo('cartao');
            return temForma ? passo('diagnostico') : { tipo: 'termo' };
        case 'diagnostico':
            return passo('diagnostico');
        case 'estudo':
            // Sem resposta de prática, o estudo começa pelo cartão: o mesmo corte do roteiro (item 22).
            return passo(estado.respondidas === 0 ? 'cartao' : 'pratica');
        case 'verificacao':
            return passo('verificacao');
        case 'revisao':
            return passo('revisao');
        case 'aguardando_revisao':
        case 'concluida':
            return null;
    }
}

/**
 * A trava da lição: o que cada estado deixa abrir. Vale para quem chega por qualquer caminho,
 * como a URL digitada na web. Entre lições não há trava; dentro de uma, os passos não se pulam
 * (D1) e, da verificação até a revisão, a prática fica fechada e o cartão, livre (D2): refazer
 * a prática na véspera mudaria o que a revisão mede, e reler o cartão não gera evento.
 */
export function podeAbrirNaLicao(licao: Pick<Licao, 'ciclo' | 'estado'>, passo: PassoDaLicao, temForma: boolean): boolean {
    const estado = licao.estado.tipo;

    if (licao.ciclo === 'curto') return passo === 'cartao' || passo === 'pratica';

    switch (passo) {
        case 'diagnostico':
            return temForma && (estado === 'nova' || estado === 'diagnostico');
        case 'cartao':
            return estado !== 'nova' && estado !== 'diagnostico';
        case 'pratica':
            return estado === 'estudo' || estado === 'concluida';
        case 'verificacao':
            return estado === 'verificacao';
        case 'revisao':
            return estado === 'revisao';
    }
}

// As linhas da página da lição. Cartão e prática são uma etapa só, "estudo".
export type EtapaDaLicao = 'diagnostico' | 'estudo' | 'verificacao' | 'revisao';
// `espera`: a revisão ainda não abriu. Não é a etapa da vez, porque não há o que fazer nela.
export type SituacaoDaEtapa = 'feito' | 'agora' | 'espera' | 'depois';

const ETAPAS: Record<Ciclo, readonly EtapaDaLicao[]> = {
    completo: ['diagnostico', 'estudo', 'verificacao', 'revisao'],
    curto: ['estudo'],
};

// Quantas etapas já ficaram para trás em cada estado.
const ETAPAS_FEITAS: Record<Ciclo, Record<EstadoDaLicao['tipo'], number>> = {
    completo: { nova: 0, diagnostico: 0, estudo: 1, verificacao: 2, aguardando_revisao: 3, revisao: 3, concluida: 4 },
    curto: { nova: 0, diagnostico: 0, estudo: 0, verificacao: 0, aguardando_revisao: 0, revisao: 0, concluida: 1 },
};

/** As etapas que o ciclo da lição tem, na ordem, com a situação de cada uma. */
export function etapasDaLicao(
    licao: Pick<Licao, 'ciclo' | 'estado'>
): { etapa: EtapaDaLicao; situacao: SituacaoDaEtapa }[] {
    const feitas = ETAPAS_FEITAS[licao.ciclo][licao.estado.tipo];
    const daVez: SituacaoDaEtapa = licao.estado.tipo === 'aguardando_revisao' ? 'espera' : 'agora';

    return ETAPAS[licao.ciclo].map((etapa, i) => ({
        etapa,
        situacao: i < feitas ? 'feito' : i === feitas ? daVez : 'depois',
    }));
}

// O que a lição mostra de resultado. No ciclo completo, o antes só aparece ao lado do depois:
// dizer o acerto do diagnóstico antes do estudo seria o feedback que a medida evita (item 19).
export type ResultadoDaLicao =
    | { ciclo: 'curto'; pratica: Taxa; xp: number; quadrantes: Record<Quadrante, number> }
    | {
          ciclo: 'completo';
          antes: Taxa; // diagnóstico
          depois: Taxa; // verificação
          revisao: Taxa | null; // null enquanto a revisão não foi concluída
          xp: number; // saldo dos blocos que já podem aparecer; pode ser negativo (item 14)
          quadrantes: Record<Quadrante, number>; // do bloco sem feedback mais recente
      };

export interface EntradaDoResultadoDaLicao {
    licao: Pick<Licao, 'topicId' | 'ciclo' | 'estado'>;
    respostas: readonly (RespostaDoResultado & Pick<Answer, 'fase'>)[]; // da mais antiga para a mais recente
    questoes: readonly QuestaoDaLicao[];
    formaPre: FormaPre | null;
}

/**
 * O resultado da lição, ou null enquanto não há o que mostrar: no ciclo completo, até a
 * verificação terminar; no curto, até a prática terminar. As contas de cada bloco são as de
 * `resultadoDoBloco`, as mesmas do fim de bloco.
 */
export function resultadoDaLicao(entrada: EntradaDoResultadoDaLicao): ResultadoDaLicao | null {
    const { licao, respostas, questoes, formaPre } = entrada;
    const estado = licao.estado.tipo;
    const taxa = ({ acertos, total }: Taxa): Taxa => ({ acertos, total });
    const doBloco = (fase: Fase, bloco: readonly QuestaoDaLicao[]) =>
        resultadoDoBloco(
            respostas.filter((r) => r.fase === fase),
            bloco
        );
    const pratica = doBloco('pratica', questoesDaPratica(questoes, licao.topicId));

    if (licao.ciclo === 'curto') {
        if (estado !== 'concluida') return null;
        return { ciclo: 'curto', pratica: taxa(pratica), xp: pratica.xp, quadrantes: pratica.quadrantes };
    }

    if (formaPre === null || (estado !== 'aguardando_revisao' && estado !== 'revisao' && estado !== 'concluida')) {
        return null;
    }

    const doPos = questoesDoBlocoMedido(questoes, 'pos', [licao.topicId], formaPre);
    const pre = doBloco('pre', questoesDoBlocoMedido(questoes, 'pre', [licao.topicId], formaPre));
    const pos = doBloco('pos', doPos);
    // A revisão pela metade não aparece: sem feedback por questão, o parcial revelaria o acerto.
    const reteste = estado === 'concluida' ? doBloco('reteste', doPos) : null;

    return {
        ciclo: 'completo',
        antes: taxa(pre),
        depois: taxa(pos),
        revisao: reteste ? taxa(reteste) : null,
        xp: pre.xp + pratica.xp + pos.xp + (reteste?.xp ?? 0),
        quadrantes: (reteste ?? pos).quadrantes,
    };
}

// Em que estados da lição cada bloco sem feedback do tópico já pode aparecer. O diagnóstico só
// aparece junto com a verificação: o resultado dele fica para o fim da lição, ao lado do depois.
const A_VISTA_NA_LICAO: Record<Exclude<Fase, 'pratica'>, readonly EstadoDaLicao['tipo'][]> = {
    pre: ['aguardando_revisao', 'revisao', 'concluida'],
    pos: ['aguardando_revisao', 'revisao', 'concluida'],
    reteste: ['concluida'],
};

/**
 * As respostas que já podem virar número na tela: XP total, domínio, Progresso. A prática
 * entra sempre, porque o feedback dela sai questão a questão. Um bloco sem feedback só entra
 * quando a lição do tópico passou dele; pela metade, qualquer total revelaria o acerto (itens 14
 * e 19). Bloco sem feedback de tópico que não é lição fica de fora, e o de lição que a pessoa faz
 * no ciclo curto também: ali ele não faz parte da lição.
 */
export function respostasAVista<R extends Pick<Answer, 'fase' | 'topicId'>>(
    respostas: readonly R[],
    licoes: readonly { topicId: string; ciclo: Ciclo; estado: Pick<EstadoDaLicao, 'tipo'> }[]
): R[] {
    const licaoDe = new Map(licoes.map((l) => [l.topicId, l]));

    return respostas.filter((r) => {
        if (r.fase === 'pratica') return true;
        const licao = licaoDe.get(r.topicId);
        return licao !== undefined && licao.ciclo === 'completo' && A_VISTA_NA_LICAO[r.fase].includes(licao.estado.tipo);
    });
}
