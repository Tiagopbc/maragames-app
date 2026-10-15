// Relatório para a Beast Maragames (item 23): uma página só, com os números em conjunto, feita a
// partir do que a exportação já calcula. Função pura: sem React, sem Firebase, sem estado. Quem
// lê o Firestore e grava o arquivo é o script em scripts/gerar-relatorio.ts.
//
// A página não leva nada de pessoa nenhuma: nem nome, nem contato, nem o código que a exportação
// dá a cada participante. O detalhe por pessoa fica nos arquivos do grupo (`npm run exportar`).

import { CoresDoRelatorio } from '../constants/cores-do-relatorio';
import {
    ROTULO_CONFIANCA,
    ROTULO_DA_EXPERIENCIA,
    ROTULO_DA_FAIXA_ETARIA,
    ROTULO_DA_SITUACAO_DE_ESTUDO,
    ROTULO_DO_SEXO,
    ROTULO_QUADRANTE,
} from '../constants/textos';
import type { Question, Topico } from '../types/domain';
import { ganhoNormalizado, type Agregados, type Exportacao, type Linha } from './exportacao';
import { PERFIS_DE_RESPOSTA, perfilDeResposta, type PerfilDeResposta } from './perfis-de-resposta';
import type { Quadrante } from './quadrante';
import type { Taxa } from './resultado';
import { intervaloPorReamostragem, incluiZero, type Intervalo } from './estatistica';

/** Com menos respostas que isto, um percentual engana: a página mostra só a contagem. */
export const AMOSTRA_MINIMA = 10;

/**
 * Com menos pessoas que isto, um grupo do bloco "Por perfil" mostra só a contagem: com uma ou duas
 * pessoas, os números do grupo são os delas.
 */
export const MINIMO_DE_PESSOAS_POR_GRUPO = 5;

const MAXIMO_DE_QUESTOES_A_REVER = 10;
const ACASO = 0.25; // uma de quatro alternativas

export interface Contagem {
    rotulo: string;
    pessoas: number;
}

// Uma questão que pede revisão. Acerto, pontos cegos e distrator são da verificação, depois da
// lição; o diagnóstico, antes dela, diz só o quanto a questão é difícil e vem à parte.
export interface QuestaoARever {
    enunciado: string;
    topico: string;
    acerto: Taxa;
    pontosCegos: number;
    distrator: string | null;
    diagnostico: Taxa;
}

// Quantas pessoas começaram cada lição, em que forma, e quantas chegaram à verificação.
export interface CoberturaDoTopico {
    titulo: string;
    pessoas: number;
    formaA: number;
    formaB: number;
    verificadas: number;
}

// Os intervalos de 95%, reamostrando pessoas (src/lib/estatistica.ts).
export interface Incerteza {
    ganhoDaTurma: Intervalo | null;
    retencao: Intervalo | null;
    firmesMenosFrageis: Intervalo | null;
    // A diferença entre Firmes e Frágeis dentro da mesma pessoa, em média, de quem tem os dois.
    pareado: { intervalo: Intervalo; pessoas: number } | null;
}

// Um grupo de pessoas (por sexo, idade, experiência...) com os números principais delas. O grupo
// oculto leva só a contagem: os números nem chegam à página.
export type GrupoDoRelatorio =
    | { rotulo: string; pessoas: number; oculto: true }
    | {
          rotulo: string;
          pessoas: number;
          oculto: false;
          pre: Taxa; // das lições com o diagnóstico e a verificação completos, como no resto da página
          pos: Taxa;
          ganho: number | null; // o de Hake sobre o acerto do grupo, como o ganho da turma (item 35)
          retencao: Taxa;
          pontoCego: Taxa; // erro com certeza, sobre as respostas da verificação
      };

export interface Indicadores extends Agregados {
    retencao: Taxa; // dos acertos da verificação, os que continuaram certos na revisão
    pontosCegos: Taxa; // das respostas da verificação, as que foram erro com certeza
    engajamento: {
        licoes: { comecadas: number; verificadas: number; revisadas: number; concluidas: number };
        voltaramOutroDia: Taxa; // pessoas com resposta em mais de um dia
        diasAtivosEmMedia: number | null;
        maiorSequencia: number; // a maior entre todas as pessoas, em dias seguidos
        plataformas: { rotulo: string; respostas: number }[];
    };
    autoavaliacao: { modulo: string; notaMedia: number; pessoas: number; diagnostico: Taxa }[];
    conteudo: { total: number; avaliadas: number; aRever: QuestaoARever[] };
    cobertura: CoberturaDoTopico[];
    incerteza: Incerteza;
    perfil: { titulo: string; itens: Contagem[] }[];
    perfisDeResposta: { perfil: PerfilDeResposta; rotulo: string; criterio: string; pessoas: number }[];
    porGrupo: { titulo: string; grupos: GrupoDoRelatorio[] }[];
}

export interface ConteudoDoRelatorio {
    topicos: readonly Topico[];
    questoes: readonly Question[];
}

const numero = (linha: Linha, campo: string) => (typeof linha[campo] === 'number' ? (linha[campo] as number) : 0);
const texto = (linha: Linha, campo: string) => (typeof linha[campo] === 'string' ? (linha[campo] as string) : null);
const soma = (linhas: readonly Linha[], campo: string) => linhas.reduce((total, l) => total + numero(l, campo), 0);

const ROTULO_DA_PLATAFORMA: Record<string, string> = { web: 'Web', ios: 'iPhone', android: 'Android' };
const SEM_INFORMAR = 'Não informada';
const SEM_SEXO = 'Não informado'; // conta de antes de o perfil pedir o sexo; "Prefiro não informar" é outra coisa
// Em lista, e não em objeto: num objeto, as chaves '0' e '1' sairiam em ordem numérica.
const ROTULO_DO_ALUNO_DO_SITE: readonly (readonly [string, string])[] = [
    ['1', 'Já é aluno'],
    ['0', 'Ainda não é'],
];
const SEM_RESPOSTA_DO_ALUNO_DO_SITE = 'Não respondeu';
const SEM_PLATAFORMA = 'Não registrada';
const OUTRA_PLATAFORMA = 'Outra';

/**
 * As pessoas de cada opção, na ordem em que a tela as mostra; quem não respondeu vai no fim, num
 * grupo à parte. Opção sem ninguém não aparece.
 */
type Rotulos = Readonly<Record<string, string>> | readonly (readonly [string, string])[];

function agrupar(participantes: readonly Linha[], campo: string, rotulos: Rotulos, semResposta = SEM_INFORMAR) {
    const opcoes = Array.isArray(rotulos) ? rotulos : Object.entries(rotulos);
    const conhecidos = new Set(opcoes.map(([valor]) => valor));
    const grupos = opcoes
        .map(([valor, rotulo]) => ({ rotulo, pessoas: participantes.filter((p) => String(p[campo]) === valor) }))
        .filter((g) => g.pessoas.length > 0);
    const sem = participantes.filter((p) => !conhecidos.has(String(p[campo])));
    return sem.length > 0 ? [...grupos, { rotulo: semResposta, pessoas: sem }] : grupos;
}

/** Quantas pessoas em cada opção. */
function contar(participantes: readonly Linha[], campo: string, rotulos: Rotulos, semResposta = SEM_INFORMAR): Contagem[] {
    return agrupar(participantes, campo, rotulos, semResposta).map((g) => ({ rotulo: g.rotulo, pessoas: g.pessoas.length }));
}

/** Os números principais de um grupo de pessoas, das colunas que a exportação dá a cada uma. */
function numerosDoGrupo(rotulo: string, pessoas: readonly Linha[]): GrupoDoRelatorio {
    const pre = { acertos: soma(pessoas, 'pre_acertos'), total: soma(pessoas, 'pre_total') };
    const pos = { acertos: soma(pessoas, 'pos_acertos'), total: soma(pessoas, 'pos_total') };
    return {
        rotulo,
        pessoas: pessoas.length,
        oculto: false,
        pre,
        pos,
        ganho: ganhoNormalizado(pre, pos),
        retencao: {
            acertos: soma(pessoas, 'firmes_mantidos') + soma(pessoas, 'frageis_mantidos'),
            total: soma(pessoas, 'firmes_no_pos') + soma(pessoas, 'frageis_no_pos'),
        },
        pontoCego: { acertos: soma(pessoas, 'pontos_cegos_no_pos'), total: soma(pessoas, 'pos_total') },
    };
}

/**
 * Os grupos de uma variável, com os pequenos ocultos. Ocultar só o pequeno não basta: o total da
 * turma menos os grupos visíveis daria os números dele. Por isso, enquanto os ocultos somarem
 * menos que o mínimo, o menor grupo visível é ocultado junto (no empate, o que vem depois).
 */
function ocultarGruposPequenos(grupos: readonly GrupoDoRelatorio[], minimo: number): GrupoDoRelatorio[] {
    const ocultos = new Set(grupos.filter((g) => g.pessoas < minimo).map((g) => g.rotulo));
    const somaDosOcultos = () => grupos.filter((g) => ocultos.has(g.rotulo)).reduce((total, g) => total + g.pessoas, 0);
    while (somaDosOcultos() > 0 && somaDosOcultos() < minimo) {
        const visiveis = grupos.filter((g) => !ocultos.has(g.rotulo));
        if (visiveis.length === 0) break;
        const menor = visiveis.reduce((menor, g) => (g.pessoas <= menor.pessoas ? g : menor));
        ocultos.add(menor.rotulo);
    }
    return grupos.map((g) => (ocultos.has(g.rotulo) ? { rotulo: g.rotulo, pessoas: g.pessoas, oculto: true } : g));
}

// As variáveis do perfil pelas quais o relatório separa os resultados.
const VARIAVEIS_DOS_GRUPOS = [
    { titulo: 'Sexo', campo: 'sexo', rotulos: ROTULO_DO_SEXO, semResposta: SEM_SEXO },
    { titulo: 'Faixa etária', campo: 'faixa_etaria', rotulos: ROTULO_DA_FAIXA_ETARIA, semResposta: SEM_INFORMAR },
    { titulo: 'Experiência em criar jogos', campo: 'experiencia', rotulos: ROTULO_DA_EXPERIENCIA, semResposta: SEM_INFORMAR },
    { titulo: 'Aluno do site', campo: 'aluno_do_site', rotulos: ROTULO_DO_ALUNO_DO_SITE, semResposta: SEM_RESPOSTA_DO_ALUNO_DO_SITE },
] as const;

/**
 * Os números do relatório: os que a exportação já soma (`agregados`) e os que só o relatório
 * mostra, tirados das mesmas tabelas. Nada aqui carrega o código de ninguém.
 */
export function indicadoresDoRelatorio(
    exportado: Exportacao,
    conteudo: ConteudoDoRelatorio,
    opcoes: { minimoDePessoas?: number } = {}
): Indicadores {
    const { agregados, participantes, licoes, eventos, questoes, autoavaliacoes } = exportado;
    const tituloDoTopico = new Map(conteudo.topicos.map((t) => [t.id, t.titulo]));
    const enunciadoDaQuestao = new Map(conteudo.questoes.map((q) => [q.id, q.enunciado]));

    // De onde as respostas vieram, da plataforma mais usada para a menos.
    const porPlataforma = new Map<string, number>();
    for (const evento of eventos) {
        const plataforma = texto(evento, 'plataforma');
        // O campo não é limitado pelas regras do banco: o que não for uma plataforma conhecida entra
        // num grupo só, e o texto gravado nunca vai para a página.
        const rotulo = plataforma === null ? SEM_PLATAFORMA : (ROTULO_DA_PLATAFORMA[plataforma] ?? OUTRA_PLATAFORMA);
        porPlataforma.set(rotulo, (porPlataforma.get(rotulo) ?? 0) + 1);
    }

    // Os diagnósticos concluídos, por pessoa e por lição, com ou sem a verificação feita: para a
    // autoavaliação basta o "antes". Concluído é o que tem todas as questões da forma da pessoa;
    // fica de fora a lição que ela faz no ciclo curto, em que a prática veio antes do diagnóstico.
    const formaDe = new Map(participantes.map((p) => [p.codigo, texto(p, 'forma_pre')]));
    const diagnosticosConcluidos = licoes
        .filter((l) => l.ciclo === 'completo')
        .flatMap((l) => {
            const topico = String(l.topico);
            const bloco = `forma_${formaDe.get(l.codigo)?.toLowerCase()}`;
            const doBloco = new Set(conteudo.questoes.filter((q) => q.topicId === topico && q.bloco === bloco).map((q) => q.id));
            const respondidas = new Map(
                eventos
                    .filter((e) => e.codigo === l.codigo && e.fase === 'pre' && doBloco.has(String(e.questao)))
                    .map((e) => [e.questao, numero(e, 'correta')])
            );
            if (doBloco.size === 0 || respondidas.size < doBloco.size) return [];
            return [{ codigo: l.codigo, topico, acertos: [...respondidas.values()].reduce((a, b) => a + b, 0), total: respondidas.size }];
        });

    // A nota só serve de "antes" se veio antes de qualquer questão de diagnóstico.
    const notas = autoavaliacoes.filter((a) => a.antes_do_primeiro_diagnostico === 1);
    const modulos = [...new Set([...conteudo.topicos.flatMap((t) => (t.modulo ? [t.modulo] : [])), ...notas.map((a) => texto(a, 'modulo') ?? '')])];
    // A nota e o acerto são das mesmas pessoas: quem deu a nota antes e fez o diagnóstico de alguma
    // lição do módulo. Comparar a nota de todos com o acerto de poucos misturaria gente diferente.
    const autoavaliacao = modulos.flatMap((modulo) => {
        const topicosDoModulo = new Set(conteudo.topicos.filter((t) => t.modulo === modulo).map((t) => t.id));
        const feitosNoModulo = diagnosticosConcluidos.filter((d) => topicosDoModulo.has(d.topico));
        const quemFez = new Set(feitosNoModulo.map((d) => d.codigo));
        const doModulo = notas.filter((a) => a.modulo === modulo && quemFez.has(a.codigo));
        if (doModulo.length === 0) return [];
        const quemDeuNota = new Set(doModulo.map((a) => a.codigo));
        const diagnostico = { acertos: 0, total: 0 };
        for (const feito of feitosNoModulo) {
            if (!quemDeuNota.has(feito.codigo)) continue;
            diagnostico.acertos += feito.acertos;
            diagnostico.total += feito.total;
        }
        return [
            {
                modulo,
                notaMedia: soma(doModulo, 'nota') / doModulo.length,
                pessoas: doModulo.length,
                diagnostico,
            },
        ];
    });

    // Só a verificação julga a questão: no diagnóstico ninguém estudou ainda, e a prática é treino.
    // A que mais pede revisão vem primeiro: menor acerto e, no empate, mais ponto cego. Sem corte de
    // respostas: com poucas por questão, a lista serve para casos gritantes, e não para ranking.
    const dasFormas = questoes.filter((q) => q.bloco === 'forma_a' || q.bloco === 'forma_b');
    const avaliadas = dasFormas.filter((q) => numero(q, 'verificacao_respostas') > 0);
    const taxaNaVerificacao = (q: Linha) => numero(q, 'verificacao_acertos') / numero(q, 'verificacao_respostas');
    const cegosNaVerificacao = (q: Linha) => numero(q, 'verificacao_pontos_cegos') / numero(q, 'verificacao_respostas');
    const aRever = avaliadas
        .filter((q) => numero(q, 'verificacao_acertos') < numero(q, 'verificacao_respostas'))
        .sort((a, b) => taxaNaVerificacao(a) - taxaNaVerificacao(b) || cegosNaVerificacao(b) - cegosNaVerificacao(a))
        .slice(0, MAXIMO_DE_QUESTOES_A_REVER)
        .map((q) => ({
            enunciado: enunciadoDaQuestao.get(String(q.questao)) ?? String(q.questao),
            topico: tituloDoTopico.get(String(q.topico)) ?? String(q.topico),
            acerto: { acertos: numero(q, 'verificacao_acertos'), total: numero(q, 'verificacao_respostas') },
            pontosCegos: numero(q, 'verificacao_pontos_cegos'),
            distrator: texto(q, 'verificacao_distrator_mais_escolhido'),
            diagnostico: { acertos: numero(q, 'diagnostico_acertos'), total: numero(q, 'diagnostico_respostas') },
        }));

    // Quem começou cada lição de ciclo completo, e em que forma. Com escolha livre, cada tópico tem
    // a sua gente: a cobertura diz de quantas pessoas sai cada número por tópico.
    const cobertura = conteudo.topicos.flatMap((t) => {
        const daLicao = licoes.filter((l) => l.topico === t.id && l.ciclo === 'completo');
        if (daLicao.length === 0) return [];
        const naForma = (forma: string) => daLicao.filter((l) => formaDe.get(l.codigo) === forma).length;
        return [
            {
                titulo: t.titulo,
                pessoas: daLicao.length,
                formaA: naForma('A'),
                formaB: naForma('B'),
                verificadas: daLicao.filter((l) => l.antes_total !== null).length,
            },
        ];
    });

    // Os intervalos, reamostrando pessoas. Cada conta usa as colunas que a exportação dá a cada uma.
    const taxaDe = (acertos: number, total: number) => (total === 0 ? null : acertos / total);
    const somaDe = (amostra: readonly Linha[], campo: string) => soma(amostra, campo);
    const ganhoDe = (amostra: readonly Linha[]) =>
        ganhoNormalizado(
            { acertos: somaDe(amostra, 'pre_acertos'), total: somaDe(amostra, 'pre_total') },
            { acertos: somaDe(amostra, 'pos_acertos'), total: somaDe(amostra, 'pos_total') }
        );
    const retencaoDe = (amostra: readonly Linha[]) =>
        taxaDe(
            somaDe(amostra, 'firmes_mantidos') + somaDe(amostra, 'frageis_mantidos'),
            somaDe(amostra, 'firmes_no_pos') + somaDe(amostra, 'frageis_no_pos')
        );
    const diferencaDe = (amostra: readonly Linha[]) => {
        const firmes = taxaDe(somaDe(amostra, 'firmes_mantidos'), somaDe(amostra, 'firmes_no_pos'));
        const frageis = taxaDe(somaDe(amostra, 'frageis_mantidos'), somaDe(amostra, 'frageis_no_pos'));
        return firmes === null || frageis === null ? null : firmes - frageis;
    };
    // Pareado: só quem tem Firmes e Frágeis na revisão; a diferença de cada um, e a média delas.
    const diferencasPorPessoa = participantes
        .filter((p) => numero(p, 'firmes_no_pos') > 0 && numero(p, 'frageis_no_pos') > 0)
        .map((p) => numero(p, 'firmes_mantidos') / numero(p, 'firmes_no_pos') - numero(p, 'frageis_mantidos') / numero(p, 'frageis_no_pos'));
    const mediaDe = (xs: readonly number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
    const intervaloPareado = intervaloPorReamostragem(diferencasPorPessoa, mediaDe);
    const incerteza: Incerteza = {
        ganhoDaTurma: intervaloPorReamostragem(participantes, ganhoDe),
        retencao: intervaloPorReamostragem(participantes, retencaoDe),
        firmesMenosFrageis: intervaloPorReamostragem(participantes, diferencaDe),
        pareado: intervaloPareado === null ? null : { intervalo: intervaloPareado, pessoas: diferencasPorPessoa.length },
    };

    // O perfil de resposta de cada pessoa, pelas respostas dela. A revisão fica de fora: repete as
    // questões da verificação, e contá-la daria peso dobrado a quem voltou.
    const perfilDe = new Map(
        participantes.map((p) => [
            p.codigo,
            perfilDeResposta(
                eventos
                    .filter((e) => e.codigo === p.codigo && e.fase !== 'reteste')
                    .map((e) => ({ correta: e.correta === 1, confianca: numero(e, 'confianca') as 1 | 2 | 3, tempoMs: numero(e, 'tempo_ms') }))
            ),
        ])
    );

    const n = participantes.length;
    return {
        ...agregados,
        retencao: {
            acertos: agregados.firmes.acertos + agregados.frageis.acertos,
            total: agregados.firmes.total + agregados.frageis.total,
        },
        pontosCegos: { acertos: agregados.quadrantesNoPos.ponto_cego, total: agregados.pos.total },
        engajamento: {
            licoes: {
                comecadas: soma(participantes, 'licoes_comecadas'),
                verificadas: soma(participantes, 'licoes_verificadas'),
                revisadas: soma(participantes, 'licoes_revisadas'),
                concluidas: soma(participantes, 'licoes_concluidas'),
            },
            voltaramOutroDia: { acertos: participantes.filter((p) => numero(p, 'dias_ativos') > 1).length, total: n },
            diasAtivosEmMedia: n === 0 ? null : soma(participantes, 'dias_ativos') / n,
            maiorSequencia: Math.max(0, ...participantes.map((p) => numero(p, 'maior_sequencia'))),
            plataformas: [...porPlataforma].map(([rotulo, respostas]) => ({ rotulo, respostas })).sort((a, b) => b.respostas - a.respostas),
        },
        autoavaliacao,
        conteudo: { total: dasFormas.length, avaliadas: avaliadas.length, aRever },
        cobertura,
        incerteza,
        perfil: [
            { titulo: 'Faixa etária', itens: contar(participantes, 'faixa_etaria', ROTULO_DA_FAIXA_ETARIA) },
            { titulo: 'Sexo', itens: contar(participantes, 'sexo', ROTULO_DO_SEXO, SEM_SEXO) },
            { titulo: 'Experiência em criar jogos', itens: contar(participantes, 'experiencia', ROTULO_DA_EXPERIENCIA) },
            { titulo: 'Situação de estudo', itens: contar(participantes, 'situacao_de_estudo', ROTULO_DA_SITUACAO_DE_ESTUDO) },
            { titulo: 'Aluno do site', itens: contar(participantes, 'aluno_do_site', ROTULO_DO_ALUNO_DO_SITE, SEM_RESPOSTA_DO_ALUNO_DO_SITE) },
        ],
        perfisDeResposta: (Object.keys(PERFIS_DE_RESPOSTA) as PerfilDeResposta[]).map((perfil) => ({
            perfil,
            ...PERFIS_DE_RESPOSTA[perfil],
            pessoas: participantes.filter((p) => perfilDe.get(p.codigo) === perfil).length,
        })),
        porGrupo: VARIAVEIS_DOS_GRUPOS.map((v) => ({
            titulo: v.titulo,
            grupos: ocultarGruposPequenos(
                agrupar(participantes, v.campo, v.rotulos, v.semResposta).map((g) => numerosDoGrupo(g.rotulo, g.pessoas)),
                opcoes.minimoDePessoas ?? MINIMO_DE_PESSOAS_POR_GRUPO
            ),
        })),
    };
}

// --- A página ---

export interface OpcoesDoRelatorio {
    geradoEm: string; // AAAA-MM-DD, o dia da rodada
    desde?: string; // AAAA-MM-DD, quando a rodada deixou de fora quem aceitou o termo antes
    amostraMinima?: number;
    // Quando os dados são de alunos virtuais (src/lib/simulacao.ts): a página avisa no topo, e o
    // rodapé diz como repetir a turma.
    simulacao?: {
        alunos: number;
        semente: number;
        versaoConteudo?: string;
        cenario?: { rotulo: string; descricao: string };
        // O tipo sorteado contra o perfil lido, para conferir o classificador.
        matriz?: { tipos: { rotulo: string; contagens: number[] }[]; perfis: string[] };
    };
}

/** Texto do conteúdo e dos rótulos vira texto na página, e nunca marcação. */
function esc(valor: string): string {
    return valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const dia = (data: string) => data.split('-').reverse().join('/');
const decimal = (valor: number, casas = 1) => valor.toFixed(casas).replace('.', ',');
const pontos = (valor: number) => `${valor > 0 ? '+' : valor < 0 ? '−' : ''}${Math.round(Math.abs(valor) * 100)} pontos`;
/** "IC 95%: 0,21 a 0,38", para ler embaixo de um número. */
const textoDoIntervalo = (i: Intervalo, formato: (v: number) => string) => `IC 95%: ${formato(i.inferior)} a ${formato(i.superior)}`;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const fracao = (taxa: Taxa) => `${taxa.acertos} de ${taxa.total}`;
const largura = (parte: number, todo: number) => (todo <= 0 ? 0 : Math.round((Math.min(parte, todo) / todo) * 100));

const ORDEM_DOS_QUADRANTES: readonly Quadrante[] = ['firme', 'fragil', 'lacuna', 'ponto_cego'];
// Na terceira pessoa: no app o aluno lê "você"; aqui quem lê é a Beast Maragames.
const O_QUE_E_O_QUADRANTE: Record<Quadrante, string> = {
    firme: 'acertou com certeza',
    fragil: 'acertou sem certeza',
    lacuna: 'errou sem certeza',
    ponto_cego: 'errou com certeza',
};

/** As cores de um tema como variáveis de CSS, uma por nome: `--fundo`, `--texto`, `--antes`... */
function variaveis(tema: keyof typeof CoresDoRelatorio): string {
    return Object.entries(CoresDoRelatorio[tema])
        .map(([nome, cor]) => `--${nome}:${cor}`)
        .join(';');
}

const ESTILO = `
:root{${variaveis('claro')}}
@media (prefers-color-scheme: dark){:root{${variaveis('escuro')}}}
*{box-sizing:border-box}
body{margin:0;background:var(--fundo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:880px;margin:0 auto;padding:32px 20px 64px}
header{margin-bottom:32px}
.marca{margin:0;color:var(--marca);font-weight:600}
h1{margin:4px 0 8px;font-size:32px;line-height:1.2}
h2{margin:0 0 4px;font-size:22px}
h3{margin:24px 0 8px;font-size:16px}
p{margin:0 0 12px}
.meta,.pergunta,.nota,.n{color:var(--texto2)}
.pergunta{margin-bottom:16px}
.nota{font-size:14px;margin-top:10px}
section{padding:28px 0;border-top:1px solid var(--borda)}
.aviso{margin:0 0 32px;padding:16px 20px;border:1px solid var(--borda);border-left:6px solid var(--marca);border-radius:8px;background:var(--elemento)}
.aviso p{margin:0 0 8px}
.aviso p:last-child{margin:0}
.aviso a{color:var(--marca);font-weight:600}
.cartoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.cartao{background:var(--elemento);border:1px solid var(--borda);border-radius:12px;padding:16px}
.cartao .valor{font-size:28px;font-weight:600;line-height:1.2}
.cartao .rotulo{font-weight:600}
.cartao .sub{color:var(--texto2);font-size:14px}
.linha{display:grid;grid-template-columns:minmax(120px,30%) 1fr minmax(120px,26%);gap:12px;align-items:center;margin:0 0 2px}
.linha .rot{font-size:14px}
.linha .val{font-size:14px;font-variant-numeric:tabular-nums}
.trilho{background:var(--elemento);height:16px;border-radius:0 4px 4px 0;overflow:hidden}
.grupo .trilho{height:12px}
.fill{height:100%;min-width:2px;border-radius:0 4px 4px 0;background:var(--depois)}
.c-antes{background:var(--antes)}.c-depois{background:var(--depois)}.c-revisao{background:var(--revisao)}
.c-firme{background:var(--firme)}.c-fragil{background:var(--fragil)}.c-lacuna{background:var(--lacuna)}.c-ponto_cego{background:var(--ponto_cego)}
.pequena{opacity:.5;background-image:repeating-linear-gradient(45deg,transparent 0 4px,var(--fundo) 4px 6px)}
.grupo{margin:0 0 16px}
.grupo .titulo{font-weight:600;margin:0 0 4px}
.legenda{display:flex;flex-wrap:wrap;gap:6px 16px;margin:0 0 12px;padding:0;list-style:none;font-size:14px}
.legenda i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.pilha{display:flex;gap:2px;height:20px;margin:0 0 12px}
.pilha div{min-width:2px}
.pilha div:last-child{border-radius:0 4px 4px 0}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;vertical-align:top;padding:8px 12px 8px 0;border-bottom:1px solid var(--borda)}
th{color:var(--texto2);font-weight:600}
td.num{white-space:nowrap;font-variant-numeric:tabular-nums}
.tabela{overflow-x:auto;margin:0 0 8px}
ul.ler{margin:0;padding-left:20px}
ul.ler li{margin-bottom:8px}
.colunas{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px 32px}
.colunas .linha{grid-template-columns:minmax(90px,40%) 1fr auto}
footer{margin-top:32px;color:var(--texto2);font-size:14px}
@media (max-width:560px){.linha{grid-template-columns:1fr;gap:2px;margin-bottom:10px}h1{font-size:26px}}
`;

/** Um gerador de trechos da página, com a amostra mínima daquela rodada. */
function pecas(minima: number) {
    const pequena = (taxa: Taxa) => taxa.total > 0 && taxa.total < minima;

    /** "75% (3 de 4)"; com poucas respostas, só a contagem; sem resposta, "sem dados". */
    const leitura = (taxa: Taxa): string => {
        if (taxa.total === 0) return 'sem dados';
        if (pequena(taxa)) return `${fracao(taxa)} <span class="n">· amostra pequena</span>`;
        return `<strong>${largura(taxa.acertos, taxa.total)}%</strong> <span class="n">(${fracao(taxa)})</span>`;
    };

    /** O valor grande de um cartão e a contagem que vai embaixo dele. */
    const destaque = (taxa: Taxa): { valor: string; contagem: string } => {
        if (taxa.total === 0) return { valor: 'sem dados', contagem: '' };
        if (pequena(taxa)) return { valor: fracao(taxa), contagem: 'amostra pequena · ' };
        return { valor: `${largura(taxa.acertos, taxa.total)}%`, contagem: `${fracao(taxa)} · ` };
    };

    const barra = (rotulo: string, taxa: Taxa, cor = 'depois'): string =>
        `<div class="linha"><div class="rot">${esc(rotulo)}</div>` +
        `<div class="trilho" title="${esc(rotulo)}: ${taxa.total === 0 ? 'sem dados' : fracao(taxa)}">` +
        (taxa.acertos === 0 ? '' : `<div class="fill c-${cor}${pequena(taxa) ? ' pequena' : ''}" style="width:${largura(taxa.acertos, taxa.total)}%"></div>`) +
        `</div><div class="val">${leitura(taxa)}</div></div>`;

    return { leitura, destaque, barra, pequena };
}

/** Uma barra de contagem: o comprimento é em relação à maior da lista. */
function contagem(rotulo: string, valor: number, maior: number, unidade: string): string {
    return (
        `<div class="linha"><div class="rot">${esc(rotulo)}</div>` +
        `<div class="trilho" title="${esc(rotulo)}: ${unidade}">` +
        (valor === 0 ? '' : `<div class="fill" style="width:${largura(valor, maior)}%"></div>`) +
        `</div><div class="val">${unidade}</div></div>`
    );
}

const cartao = (rotulo: string, valor: string, sub: string) =>
    `<div class="cartao"><div class="valor">${valor}</div><div class="rotulo">${esc(rotulo)}</div><div class="sub">${sub}</div></div>`;

const legenda = (itens: readonly (readonly [cor: string, rotulo: string])[]) =>
    `<ul class="legenda">${itens.map(([cor, rotulo]) => `<li><i class="c-${cor}"></i>${esc(rotulo)}</li>`).join('')}</ul>`;

const bloco = (titulo: string, pergunta: string, corpo: string) =>
    `<section><h2>${titulo}</h2>${pergunta ? `<p class="pergunta">${pergunta}</p>` : ''}${corpo}</section>`;

/** A página do relatório, pronta para gravar: um arquivo só, que não busca nada fora dele. */
export function relatorioHtml(ind: Indicadores, opcoes: OpcoesDoRelatorio): string {
    const minima = opcoes.amostraMinima ?? AMOSTRA_MINIMA;
    const { leitura, destaque, barra, pequena } = pecas(minima);
    const n = ind.participantes;
    const filtro = opcoes.desde ? ` · só quem aceitou o termo a partir de ${dia(opcoes.desde)}` : '';

    const { simulacao } = opcoes;
    // O aviso vem antes de qualquer número: ninguém pode ler esta página como resultado de pesquisa.
    const aviso = simulacao
        ? `<div class="aviso"><p><strong>Dados sintéticos para validação do aplicativo · ${plural(simulacao.alunos, 'aluno virtual', 'alunos virtuais')} · semente ${simulacao.semente}` +
          (simulacao.cenario ? ` · cenário ${esc(simulacao.cenario.rotulo)}` : '') +
          `.</strong></p>` +
          (simulacao.cenario && simulacao.cenario.rotulo !== 'Base' ? `<p>Neste cenário, ${esc(simulacao.cenario.descricao)}.</p>` : '') +
          `<p>Os perfis foram sorteados por um gerador aleatório, para testar o que a ferramenta consegue medir a partir das respostas. ` +
          `Nenhum número desta página veio de alunos de verdade, e nenhum é evidência sobre a retenção de conteúdo.</p></div>`
        : '';

    const cabecalho =
        `<header><p class="marca">Beast Maragames</p><h1>Relatório de aprendizagem</h1>` +
        (simulacao
            ? `<p class="meta">Simulação de ${dia(opcoes.geradoEm)} · ${plural(simulacao.alunos, 'aluno virtual', 'alunos virtuais')}</p></header>${aviso}`
            : `<p class="meta">Dados de ${dia(opcoes.geradoEm)} · ${plural(n, 'participante', 'participantes')}${filtro}</p></header>`);

    const pagina = (corpo: string) =>
        `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n` +
        `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
        `<meta name="robots" content="noindex, nofollow">\n` +
        `<title>Beast Maragames · Relatório de aprendizagem${opcoes.simulacao ? ' (simulação)' : ''}</title>\n<style>${ESTILO}</style>\n</head>\n` +
        `<body>\n<main>\n${cabecalho}\n${corpo}\n` +
        `<footer>Feito pelo grupo Mobile Builders, na disciplina de Programação Mobile da UNDB.` +
        (simulacao
            ? `<br>Dados sintéticos · semente ${simulacao.semente}` +
              (simulacao.versaoConteudo ? ` · versão do conteúdo ${esc(simulacao.versaoConteudo)}` : '') +
              (simulacao.cenario ? ` · cenário ${esc(simulacao.cenario.rotulo)}` : '')
            : '') +
        `</footer>\n</main>\n</body>\n</html>\n`;

    if (n === 0) {
        return pagina(
            `<p>${opcoes.desde ? `Ninguém aceitou o termo desde ${dia(opcoes.desde)}` : 'Ninguém aceitou o termo ainda'}: não há dados para mostrar.</p>`
        );
    }

    // 1. Em resumo
    const retencao = destaque(ind.retencao);
    const pontosCegos = destaque(ind.pontosCegos);
    const resumo = bloco(
        'Em resumo',
        '',
        `<div class="cartoes">` +
            cartao('Participantes', String(n), simulacao ? 'alunos virtuais' : 'aceitaram o termo') +
            cartao('Lições verificadas', String(ind.verificadas), 'com o antes e o depois medidos') +
            cartao(
                'Ganho da turma',
                ind.ganhoDaTurma === null ? 'sem dados' : decimal(ind.ganhoDaTurma, 2),
                'do que faltava acertar, a parte que passou a ser acertada' +
                    (ind.incerteza.ganhoDaTurma
                        ? ` · ${textoDoIntervalo(ind.incerteza.ganhoDaTurma, (v) => decimal(v, 2))}` +
                          (incluiZero(ind.incerteza.ganhoDaTurma) ? ' · sem evidência de ganho' : '')
                        : '') +
                    (ind.ganhoMedio === null ? '' : ` · média por pessoa: ${decimal(ind.ganhoMedio, 2)}`)
            ) +
            cartao('Retenção', retencao.valor, `${retencao.contagem}acertos que continuaram certos 7 dias depois`) +
            cartao('Ponto cego', pontosCegos.valor, `${pontosCegos.contagem}respostas erradas com certeza`) +
            `</div>`
    );

    // 2. Aprendizagem
    const series = [
        ['antes', 'Diagnóstico (antes)'],
        ['depois', 'Verificação (depois)'],
        ['revisao', 'Revisão (7 dias depois)'],
    ] as const;
    const aprendizagem = bloco(
        'Aprendizagem',
        'Os alunos acertam mais depois de estudar a lição?',
        legenda(series) +
            barra('Diagnóstico', ind.pre, 'antes') +
            barra('Verificação', ind.pos, 'depois') +
            barra('Revisão', ind.reteste, 'revisao') +
            `<p class="nota">Só entram as lições com o diagnóstico e a verificação completos. A revisão conta quem voltou: ${ind.revisadas} de ${ind.verificadas} ${ind.verificadas === 1 ? 'lição' : 'lições'}.</p>` +
            `<h3>Por tópico</h3>` +
            (ind.cobertura.length === 0
                ? ''
                : `<div class="tabela"><table><thead><tr><th>Tópico</th><th>Começaram</th><th>Forma A</th><th>Forma B</th><th>Verificaram</th></tr></thead><tbody>` +
                  ind.cobertura
                      .map(
                          (c) =>
                              `<tr><td>${esc(c.titulo)}</td><td class="num">${c.pessoas}</td><td class="num">${c.formaA}</td><td class="num">${c.formaB}</td><td class="num">${c.verificadas}</td></tr>`
                      )
                      .join('') +
                  `</tbody></table></div>` +
                  `<p class="nota">Cada pessoa escolhe que lições faz, então cada tópico tem a sua gente: o número de um tópico mistura o efeito da lição com quem escolheu fazê-la, e um tópico não se compara com outro como se fossem a mesma turma. A comparação justa é o ganho de cada pessoa, que compara a pessoa com ela mesma. A forma A e a B se alternam entre as pessoas; num tópico com poucas, uma forma pode pesar mais.</p>`) +
            (ind.porTopico.length === 0
                ? `<p>Nenhuma lição com a verificação feita.</p>`
                : ind.porTopico
                      .map(
                          (t) =>
                              `<div class="grupo"><p class="titulo">${esc(t.titulo)} <span class="n">· ${plural(t.pessoas, 'pessoa', 'pessoas')}</span></p>` +
                              barra('Diagnóstico', t.pre, 'antes') +
                              barra('Verificação', t.pos, 'depois') +
                              (t.reteste.total > 0 ? barra('Revisão', t.reteste, 'revisao') : '') +
                              `</div>`
                      )
                      .join(''))
    );

    // 3. Consciência do próprio saber
    const respostasNoPos = ORDEM_DOS_QUADRANTES.reduce((total, q) => total + ind.quadrantesNoPos[q], 0);
    const consciencia = bloco(
        'Consciência do próprio saber',
        'Quem diz que sabe, sabe? Em cada questão a pessoa declara o quanto confia na resposta.',
        `<h3>Acerto por nível de confiança, na verificação</h3>` +
            ([1, 2, 3] as const).map((nivel) => barra(ROTULO_CONFIANCA[nivel], ind.porConfianca[nivel])).join('') +
            `<p class="nota">Se a confiança diz alguma coisa, o acerto sobe de Palpite para Tenho certeza.</p>` +
            `<h3>Como as respostas da verificação se dividem</h3>` +
            (respostasNoPos === 0
                ? `<p>sem dados</p>`
                : `<div class="pilha">` +
                  ORDEM_DOS_QUADRANTES.filter((q) => ind.quadrantesNoPos[q] > 0)
                      .map(
                          (q) =>
                              `<div class="c-${q}" style="flex:${ind.quadrantesNoPos[q]} 1 0" title="${ROTULO_QUADRANTE[q]}: ${ind.quadrantesNoPos[q]} de ${respostasNoPos}"></div>`
                      )
                      .join('') +
                  `</div>`) +
            `<ul class="legenda">${ORDEM_DOS_QUADRANTES.map(
                (q) => `<li><i class="c-${q}"></i><strong>${ROTULO_QUADRANTE[q]}</strong>: ${ind.quadrantesNoPos[q]} <span class="n">(${O_QUE_E_O_QUADRANTE[q]})</span></li>`
            ).join('')}</ul>`
    );

    // 4. Retenção
    const retencaoBloco = bloco(
        'Retenção',
        'A confiança declarada indica o que vai ser esquecido? A revisão repete, 7 dias depois, as questões da verificação: aqui só entram as que a pessoa tinha acertado.',
        barra('Firmes que continuaram certos', ind.firmes, 'firme') +
            barra('Frágeis que continuaram certos', ind.frageis, 'fragil') +
            `<p class="nota">Se os Firmes resistem mais que os Frágeis, a confiança prevê o esquecimento, e o app sabe o que cada pessoa precisa rever.` +
            (ind.antesDaHora > 0 ? ` Revisões feitas antes dos 7 dias: ${ind.antesDaHora}.` : '') +
            `</p>` +
            (ind.incerteza.firmesMenosFrageis === null
                ? ''
                : `<div class="cartoes">` +
                  cartao(
                      'Firmes menos Frágeis',
                      pontos(ind.incerteza.firmesMenosFrageis.estimativa),
                      `na turma · ${textoDoIntervalo(ind.incerteza.firmesMenosFrageis, pontos)}` +
                          (incluiZero(ind.incerteza.firmesMenosFrageis) ? ' · sem evidência de diferença' : '')
                  ) +
                  (ind.incerteza.pareado === null
                      ? ''
                      : cartao(
                            'Na mesma pessoa',
                            pontos(ind.incerteza.pareado.intervalo.estimativa),
                            `média de ${plural(ind.incerteza.pareado.pessoas, 'pessoa', 'pessoas')} com Firmes e Frágeis · ${textoDoIntervalo(ind.incerteza.pareado.intervalo, pontos)}`
                        )) +
                  `</div>` +
                  `<p class="nota">A diferença na turma mistura duas coisas além da confiança: os Frágeis incluem acertos no chute, que não têm o que reter, e quem marca certeza costuma ser quem sabe mais. A comparação na mesma pessoa tira a segunda; a primeira continua. Os intervalos reamostram pessoas, e não respostas.</p>`)
    );

    // Perfis de resposta
    const maisDeUmPerfil = Math.max(1, ...ind.perfisDeResposta.map((p) => p.pessoas));
    const perfisDeResposta = bloco(
        'Perfis de resposta',
        'Que tipo de respondente cada pessoa é? O perfil sai só das respostas dela: quanto acerta, com que certeza, quanto erra achando que sabe e em quanto tempo responde.',
        ind.perfisDeResposta.map((p) => contagem(p.rotulo, p.pessoas, maisDeUmPerfil, plural(p.pessoas, 'pessoa', 'pessoas'))).join('') +
            `<ul class="ler nota">${ind.perfisDeResposta.map((p) => `<li><strong>${esc(p.rotulo)}:</strong> ${esc(p.criterio)}.</li>`).join('')}</ul>` +
            `<p class="nota">A revisão não entra nesta conta, porque repete as questões da verificação. Os limites de cada perfil são escolhas do grupo, a revisar com dados de verdade.</p>`
    );

    // 5. Autoavaliação
    // O acerto no diagnóstico numa régua que começa no acaso: chutando, acerta-se uma de quatro.
    const acimaDoAcaso = (taxa: Taxa) => {
        if (taxa.total === 0 || pequena(taxa)) return barra('Diagnóstico', taxa, 'depois');
        const acerto = taxa.acertos / taxa.total;
        const preenchido = Math.round(Math.max(0, (acerto - ACASO) / (1 - ACASO)) * 100);
        return (
            `<div class="linha"><div class="rot">Diagnóstico</div>` +
            `<div class="trilho" title="Diagnóstico: ${largura(taxa.acertos, taxa.total)}%, numa régua de 25% a 100%"><div class="fill c-depois" style="width:${preenchido}%"></div></div>` +
            `<div class="val">${leitura(taxa)}</div></div>`
        );
    };
    const autoavaliacao = bloco(
        'Autoavaliação',
        'Em que área as pessoas acham que sabem mais do que sabem? Antes da primeira lição, cada uma se dá uma nota de 1 a 5 por área.',
        ind.autoavaliacao.length === 0
            ? `<p>Ninguém deu as notas antes do primeiro diagnóstico ainda.</p>`
            : legenda([
                  ['antes', 'Nota que as pessoas se deram'],
                  ['depois', 'Acerto no diagnóstico, das mesmas pessoas'],
              ]) +
              ind.autoavaliacao
                  .map(
                      (a) =>
                          `<div class="grupo"><p class="titulo">${esc(a.modulo)} <span class="n">· ${plural(a.pessoas, 'pessoa', 'pessoas')}</span></p>` +
                          `<div class="linha"><div class="rot">Nota média</div>` +
                          `<div class="trilho" title="Nota média: ${decimal(a.notaMedia)} de 5"><div class="fill c-antes" style="width:${largura(a.notaMedia - 1, 4)}%"></div></div>` +
                          `<div class="val">${decimal(a.notaMedia)} de 5</div></div>` +
                          acimaDoAcaso(a.diagnostico) +
                          `</div>`
                  )
                  .join('') +
              `<p class="nota">As duas barras estão na mesma régua: a nota 1 é a barra vazia e a nota 5, a barra cheia. Na barra do diagnóstico, a vazia é o acaso (25%, chutando uma de quatro) e a cheia, 100%. Entram só as pessoas que deram a nota antes do primeiro diagnóstico e fizeram o diagnóstico de alguma lição da área. Nota alta com acerto baixo é área em que as pessoas se superestimam.</p>`
    );

    // Por perfil
    // O ganho sai do diagnóstico e da verificação: com amostra pequena em um deles, ele também não aparece.
    const ganho = (g: Extract<GrupoDoRelatorio, { oculto: false }>) =>
        g.ganho === null ? 'sem dados' : pequena(g.pre) || pequena(g.pos) ? '<span class="n">amostra pequena</span>' : decimal(g.ganho, 2);
    const minimoDePessoas = ind.porGrupo.flatMap((v) => v.grupos).some((g) => g.oculto) ? MINIMO_DE_PESSOAS_POR_GRUPO : null;
    const porGrupo = bloco(
        'Por perfil',
        'Os resultados mudam com o perfil de quem responde? Cada tabela separa as mesmas pessoas por uma variável do cadastro.',
        ind.porGrupo
            .map(
                (v) =>
                    `<h3>${esc(v.titulo)}</h3><div class="tabela"><table><thead><tr><th>Grupo</th><th>Pessoas</th><th>Diagnóstico</th><th>Verificação</th><th>Ganho</th><th>Retenção</th><th>Ponto cego</th></tr></thead><tbody>` +
                    v.grupos
                        .map(
                            (g) =>
                                `<tr><td>${esc(g.rotulo)}</td><td class="num">${g.pessoas}</td>` +
                                (g.oculto
                                    ? `<td colspan="5"><span class="n">números ocultos</span></td></tr>`
                                    : `<td>${leitura(g.pre)}</td><td>${leitura(g.pos)}</td>` +
                                      `<td class="num">${ganho(g)}</td><td>${leitura(g.retencao)}</td><td>${leitura(g.pontoCego)}</td></tr>`)
                        )
                        .join('') +
                    `</tbody></table></div>`
            )
            .join('') +
            `<p class="nota">Grupo pequeno engana: uma diferença entre poucas pessoas pode ser só acaso. Olhe a contagem antes de comparar.` +
            (minimoDePessoas === null
                ? ''
                : ` Grupo com menos de ${minimoDePessoas} pessoas mostra só a contagem, porque os números dele seriam os de uma ou duas pessoas; quando preciso, outro grupo é ocultado junto, para o pequeno não sair da diferença com o total.`) +
            (simulacao ? ' Na base sintética, nada do cadastro (sexo, faixa etária, experiência, estudo, aluno do site) influencia o desempenho, por construção.' : '') +
            `</p>`
    );

    // 6. Engajamento
    const { licoes, voltaramOutroDia, diasAtivosEmMedia, maiorSequencia, plataformas } = ind.engajamento;
    const maisRespostas = Math.max(0, ...plataformas.map((p) => p.respostas));
    const engajamento = bloco(
        'Engajamento',
        'As pessoas terminam o que começam, e voltam?',
        `<div class="cartoes">` +
            cartao('Voltaram em outro dia', fracao(voltaramOutroDia), 'pessoas com resposta em mais de um dia') +
            cartao('Dias com resposta', diasAtivosEmMedia === null ? 'sem dados' : decimal(diasAtivosEmMedia), 'em média, por pessoa') +
            cartao('Maior sequência', plural(maiorSequencia, 'dia', 'dias'), 'seguidos, de uma mesma pessoa') +
            `</div>` +
            `<h3>Até onde as lições foram</h3>` +
            contagem('Começadas', licoes.comecadas, licoes.comecadas, plural(licoes.comecadas, 'lição', 'lições')) +
            contagem('Com a verificação feita', licoes.verificadas, licoes.comecadas, plural(licoes.verificadas, 'lição', 'lições')) +
            contagem('Com a revisão feita', licoes.revisadas, licoes.comecadas, plural(licoes.revisadas, 'lição', 'lições')) +
            contagem('Concluídas', licoes.concluidas, licoes.comecadas, plural(licoes.concluidas, 'lição', 'lições')) +
            `<p class="nota">Cada lição conta uma vez por pessoa. Concluída é a lição com a revisão feita ou, nas que só têm prática, com a prática feita.</p>` +
            `<h3>Por onde responderam</h3>` +
            (plataformas.length === 0
                ? `<p>sem dados</p>`
                : plataformas.map((p) => contagem(p.rotulo, p.respostas, maisRespostas, plural(p.respostas, 'resposta', 'respostas'))).join('') +
                  (plataformas.some((p) => p.rotulo === SEM_PLATAFORMA)
                      ? `<p class="nota">O app passou a registrar de onde cada resposta vem em 12/10/2026; as anteriores ficam sem essa informação.</p>`
                      : ''))
    );

    // 7. Conteúdo
    const { conteudo } = ind;
    const conteudoBloco = bloco(
        'Conteúdo',
        'Que questões pedem revisão? Acerto baixo pode ser conteúdo mal explicado ou questão mal escrita.',
        conteudo.avaliadas === 0
            ? `<p>Nenhuma questão foi respondida na verificação ainda.</p>`
            : `<p class="nota">${conteudo.avaliadas} de ${conteudo.total} questões de diagnóstico e verificação já foram respondidas na verificação. A questão é julgada só na verificação, depois da lição; o acerto no diagnóstico, antes de estudar, vem à parte e mede só o quanto ela é difícil. Com poucas respostas por questão, esta lista serve para casos gritantes (ninguém acerta na verificação, ou quase todos caem na mesma alternativa errada): não é ranking.</p>` +
              (conteudo.aRever.length === 0
                  ? `<p>Todas as questões foram acertadas por todo mundo na verificação.</p>`
                  : `<div class="tabela"><table><thead><tr><th>Questão</th><th>Verificação</th><th>Pontos cegos</th><th>Alternativa errada mais escolhida</th><th>Diagnóstico</th></tr></thead><tbody>` +
                    conteudo.aRever
                        .map(
                            (q) =>
                                `<tr><td>${esc(q.enunciado)}<br><span class="n">${esc(q.topico)}</span></td>` +
                                `<td class="num">${fracao(q.acerto)}</td><td class="num">${q.pontosCegos}</td>` +
                                `<td>${q.distrator === null ? '—' : esc(q.distrator)}</td><td class="num">${q.diagnostico.total === 0 ? '—' : fracao(q.diagnostico)}</td></tr>`
                        )
                        .join('') +
                    `</tbody></table></div>`)
    );

    // Conferência do classificador: só na página simulada, quando o script passa a matriz.
    const conferencia =
        simulacao?.matriz === undefined
            ? ''
            : bloco(
                  'Conferência do classificador',
                  'O perfil de resposta lido das respostas bate com o tipo que o gerador sorteou para cada aluno virtual?',
                  `<div class="tabela"><table><thead><tr><th>Tipo sorteado</th>${simulacao.matriz.perfis.map((p) => `<th>${esc(p)}</th>`).join('')}</tr></thead><tbody>` +
                      simulacao.matriz.tipos
                          .map((t) => `<tr><td>${esc(t.rotulo)}</td>${t.contagens.map((c) => `<td class="num">${c === 0 ? '·' : c}</td>`).join('')}</tr>`)
                          .join('') +
                      `</tbody></table></div>` +
                      `<p class="nota">Os tipos do gerador foram desenhados junto com os perfis, então acertar a diagonal não prova que o classificador funciona com gente de verdade. O que esta tabela mostra são as confusões: que tipo é lido como qual perfil.</p>`
              );

    // 8. Quem respondeu
    const perfil = bloco(
        'Quem respondeu',
        simulacao ? 'O perfil sorteado para a turma virtual, em contagem de pessoas.' : 'O perfil de quem aceitou o termo, em contagem de pessoas.',
        `<div class="colunas">` +
            ind.perfil
                .map(
                    (grupo) =>
                        `<div><h3>${esc(grupo.titulo)}</h3>` +
                        grupo.itens
                            .map((item) => contagem(item.rotulo, item.pessoas, n, plural(item.pessoas, 'pessoa', 'pessoas')))
                            .join('') +
                        `</div>`
                )
                .join('') +
            `</div>`
    );

    // 9. Como ler
    const comoLer = bloco(
        'Como ler estes números',
        '',
        `<ul class="ler">` +
            (simulacao
                ? `<li>Esta página foi gerada com alunos virtuais de perfis sorteados: quem domina, quem tem dificuldade, quem chuta, quem se acha mais sabido do que é, quem duvida do que sabe e quem desiste. As proporções também são sorteadas. Serve para testar a ferramenta: não é resultado de pesquisa.</li>` +
                  `<li>No gerador, nada do cadastro (sexo, faixa etária, experiência, estudo, aluno do site) influencia o desempenho: qualquer diferença entre esses grupos é acaso da amostra.</li>`
                : `<li>Com ${plural(n, 'participante', 'participantes')} e sem grupo de controle, estes números descrevem e não provam causa.</li>`) +
            `<li>Cada lição mede três vezes: 3 questões antes de estudar (diagnóstico), 3 questões equivalentes depois (verificação) e as mesmas da verificação 7 dias depois (revisão).</li>` +
            `<li>O ganho é o de Hake: do que faltava acertar no diagnóstico, a parte que passou a ser acertada na verificação, calculado sobre o acerto de todo o grupo. Vai até um e fica negativo se a verificação foi pior. A média do ganho de cada pessoa aparece ao lado, no resumo: com poucas questões por pessoa ela oscila mais.</li>` +
            `<li>Onde há menos de ${minima} respostas, a página mostra só a contagem, e a barra aparece apagada e riscada: um percentual sobre tão pouco enganaria.</li>` +
            `<li>Nenhum dado de pessoa aparece aqui: nem nome, nem contato, nem resposta individual.</li>` +
            (simulacao ? '' : `<li>A página é um retrato do dia ${dia(opcoes.geradoEm)}. Para atualizar, o grupo gera de novo.</li>`) +
            `</ul>`
    );

    return pagina(
        [resumo, aprendizagem, consciencia, retencaoBloco, perfisDeResposta, autoavaliacao, porGrupo, engajamento, conteudoBloco, perfil, conferencia, comoLer]
            .filter((b) => b !== '')
            .join('\n')
    );
}
