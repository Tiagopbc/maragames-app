// Gera o relatório que vai para a Beast Maragames (item 23): uma página só, com os números em
// conjunto, sem nada de pessoa nenhuma. É o que o grupo publica e envia; os CSVs de
// `npm run exportar` ficam com o grupo.
//
// Só LÊ o Firestore. As contas são as de src/lib/exportacao.ts, as mesmas que o app faz, e a
// página é montada por src/lib/relatorio.ts.
//
// Uso:
//   npm run relatorio                         todo mundo que aceitou o termo
//   npm run relatorio -- --desde 2026-10-30   só quem aceitou a partir desse dia (sem as contas de teste)
//   npm run relatorio -- --saida pasta        escolhe a pasta
//   npm run relatorio -- --simulado 100       turma de 100 alunos virtuais, sem ler o banco
//
// Opções da turma simulada (item 36):
//   --semente N            repete uma turma (sem ela, cada rodada sorteia uma semente nova)
//   --cenario X            só um cenário: base, nulo, confianca_cega ou forma_b_dificil (sem ela, os quatro)
//   --limite-diario        no máximo uma lição nova por dia, por aluno
//   --dias-de-estudo N     lições novas só nos N primeiros dias de cada aluno; as revisões seguem
//   --replicas R           roda R turmas (sementes N, N+1, ...) sem gravar página e mostra a mediana e
//                          os percentis 5 e 95 de cada indicador; o tamanho vem de --simulado (padrão 15)
//
// Sem --saida, grava relatorio/index.html, por cima do anterior: a página diz de que dia é.
// A pasta fica fora do git. Se ninguém entra no filtro, avisa e não grava nada.
//
// Com --simulado, o banco não é lido nem tocado: a turma é sorteada por src/lib/simulacao.ts a
// partir do conteúdo de content/, e passa pelas mesmas contas. Sai uma página por cenário, com o
// aviso de que os dados são sintéticos: o cenário base em relatorio/simulado/index.html e os outros
// em relatorio/simulado/<cenario>/index.html. A semente, a versão do conteúdo (o mesmo hash que o
// seed grava) e o cenário aparecem no terminal e no rodapé de cada página.

import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { meiaNoiteDe } from '../src/lib/calendario';
import { incluiZero, percentil, type Intervalo } from '../src/lib/estatistica';
import { exportarDados } from '../src/lib/exportacao';
import { PERFIS_DE_RESPOSTA, type PerfilDeResposta } from '../src/lib/perfis-de-resposta';
import { indicadoresDoRelatorio, relatorioHtml, type Indicadores } from '../src/lib/relatorio';
import {
    CENARIOS,
    DIAS_DA_SIMULACAO,
    TIPOS_DE_ALUNO,
    conteudoDoRepositorio,
    matrizDeConfusao,
    sementeAleatoria,
    simularTurma,
    type Cenario,
    type OpcoesDaSimulacao,
    type TipoDeAluno,
} from '../src/lib/simulacao';
import { RAIZ, argumento, filtroDesde, hoje, lerDadosDoBanco } from './dados-do-banco';

const marcado = (nome: string) => process.argv.includes(`--${nome}`);

function inteiro(nome: string, minimo: number, maximo: number): number | undefined {
    const texto = argumento(nome);
    if (texto === undefined) return undefined;
    const valor = Number(texto);
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) throw new Error(`Valor inválido em --${nome}: ${texto} (use de ${minimo} a ${maximo}).`);
    return valor;
}

/** O conteúdo de content/ e a versão dele, o mesmo hash que o seed grava em cada questão. */
function conteudoComVersao() {
    const bruto = (nome: string) => readFileSync(join(RAIZ, 'content', nome), 'utf8');
    const topicos = bruto('topicos.json');
    const questoes = bruto('questoes.json');
    const versao = createHash('sha256').update(topicos).update(questoes).digest('hex').slice(0, 12);
    return { versao, conteudo: conteudoDoRepositorio(JSON.parse(topicos), JSON.parse(questoes), versao) };
}

const PERFIS = Object.keys(PERFIS_DE_RESPOSTA) as PerfilDeResposta[];
const TIPOS = Object.keys(TIPOS_DE_ALUNO) as TipoDeAluno[];
const decimal = (v: number | null | undefined, casas = 2) =>
    v === null || v === undefined ? '—' : `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(casas).replace('.', ',')}`;
const pontos = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)} pontos`);
const porcento = (v: number) => `${Math.round(v * 100)}%`;
// O "inclui zero" só faz sentido para diferença e ganho; a retenção é uma taxa.
const comIntervalo = (i: Intervalo | null, formato: (v: number) => string, avisaZero = true) =>
    i === null ? 'sem dados' : `${formato(i.estimativa)} (IC 95%: ${formato(i.inferior)} a ${formato(i.superior)})${avisaZero && incluiZero(i) ? ' · inclui zero' : ''}`;

/** Os números de uma turma que o terminal e as réplicas acompanham. */
function principais(ind: Indicadores) {
    return {
        ganho: ind.incerteza.ganhoDaTurma,
        retencao: ind.incerteza.retencao,
        diferenca: ind.incerteza.firmesMenosFrageis,
        pareado: ind.incerteza.pareado?.intervalo ?? null,
    };
}

/** As turmas virtuais e as páginas delas, sem ler nem tocar o banco. */
function simular(alunosTexto: string | undefined) {
    const replicas = inteiro('replicas', 1, 2000);
    const alunos = alunosTexto === undefined ? 15 : Number(alunosTexto);
    if (!Number.isInteger(alunos) || alunos < 1 || alunos > 999) throw new Error(`Número de alunos inválido em --simulado: ${alunosTexto} (use de 1 a 999).`);
    const sementeTexto = argumento('semente');
    const semente = sementeTexto === undefined ? sementeAleatoria() : Number(sementeTexto);
    if (!Number.isInteger(semente) || semente < 1) throw new Error(`Semente inválida em --semente: ${sementeTexto} (use um número inteiro positivo).`);
    const cenarioPedido = argumento('cenario');
    if (cenarioPedido !== undefined && !(cenarioPedido in CENARIOS))
        throw new Error(`Cenário inválido em --cenario: ${cenarioPedido} (use ${Object.keys(CENARIOS).join(', ')}).`);
    const cenarios = (cenarioPedido === undefined ? Object.keys(CENARIOS) : [cenarioPedido]) as Cenario[];
    const diasDeEstudo = inteiro('dias-de-estudo', 1, DIAS_DA_SIMULACAO - 14);
    const limiteDiario = marcado('limite-diario');

    const { versao, conteudo } = conteudoComVersao();
    // A turma termina hoje: os primeiros alunos chegaram há DIAS_DA_SIMULACAO dias.
    const inicio = meiaNoiteDe(hoje())! - DIAS_DA_SIMULACAO * 24 * 60 * 60 * 1000;
    const opcoesDa = (cenario: Cenario, sementeDaTurma: number): OpcoesDaSimulacao => ({
        alunos,
        semente: sementeDaTurma,
        inicio,
        cenario,
        limiteDiario,
        diasDeEstudo,
    });
    const indicadoresDa = (cenario: Cenario, sementeDaTurma: number) => {
        const turma = simularTurma(conteudo, opcoesDa(cenario, sementeDaTurma));
        return { turma, ind: indicadoresDoRelatorio(exportarDados(turma.dados, { agora: turma.agora }), conteudo) };
    };
    const opcoesNoTexto = [limiteDiario ? 'limite de uma lição nova por dia' : null, diasDeEstudo ? `${diasDeEstudo} dias de estudo` : null]
        .filter(Boolean)
        .join(' · ');
    const repetir = (cenario?: Cenario, extra = '') =>
        `npm run relatorio -- --simulado ${alunos} --semente ${semente}${cenario ? ` --cenario ${cenario}` : ''}` +
        `${limiteDiario ? ' --limite-diario' : ''}${diasDeEstudo ? ` --dias-de-estudo ${diasDeEstudo}` : ''}${extra}`;

    console.log(`Turma sintética · ${alunos} alunos virtuais · semente ${semente} · versão do conteúdo ${versao}${opcoesNoTexto ? ` · ${opcoesNoTexto}` : ''}`);
    console.log('O banco não foi lido.');

    if (replicas !== undefined) return simularReplicas({ replicas, alunos, semente, cenarios, indicadoresDa, repetir });

    const pasta = argumento('saida') ?? join(RAIZ, 'relatorio', 'simulado');
    const resumo: { cenario: Cenario; ganho: Intervalo | null; retencao: Intervalo | null; diferenca: Intervalo | null }[] = [];
    for (const cenario of cenarios) {
        const { turma, ind } = indicadoresDa(cenario, semente);
        const matriz = matrizDeConfusao(turma);
        const destino = cenario === 'base' ? pasta : join(pasta, cenario);
        mkdirSync(destino, { recursive: true });
        const arquivo = join(destino, 'index.html');
        writeFileSync(
            arquivo,
            relatorioHtml(ind, {
                geradoEm: hoje(),
                simulacao: {
                    alunos,
                    semente,
                    versaoConteudo: versao,
                    cenario: CENARIOS[cenario],
                    matriz: {
                        perfis: PERFIS.map((p) => PERFIS_DE_RESPOSTA[p].rotulo),
                        tipos: TIPOS.map((t) => ({ rotulo: TIPOS_DE_ALUNO[t].rotulo, contagens: PERFIS.map((p) => matriz[t][p]) })),
                    },
                },
            })
        );

        const p = principais(ind);
        resumo.push({ cenario, ganho: p.ganho, retencao: p.retencao, diferenca: p.diferenca });
        console.log('');
        console.log(`Cenário ${CENARIOS[cenario].rotulo}: ${CENARIOS[cenario].descricao}`);
        console.log(`  ${arquivo}`);
        console.log(`  Ganho da turma:        ${comIntervalo(p.ganho, (v) => decimal(v))}`);
        console.log(`  Retenção:              ${comIntervalo(p.retencao, porcento, false)}`);
        console.log(`  Firmes menos Frágeis:  ${comIntervalo(p.diferenca, pontos)}`);
        console.log(`  Na mesma pessoa:       ${comIntervalo(p.pareado, pontos)} · ${ind.incerteza.pareado?.pessoas ?? 0} pessoas com Firmes e Frágeis`);
        console.log(`  Lições verificadas: ${ind.verificadas} · revisadas: ${ind.revisadas}`);
        if (cenario === 'base') {
            console.log('  Tipo sorteado × perfil lido (matriz de confusão):');
            console.log(`    ${''.padEnd(18)} ${PERFIS.map((p) => p.slice(0, 8).padStart(8)).join(' ')}`);
            for (const t of TIPOS) console.log(`    ${TIPOS_DE_ALUNO[t].rotulo.padEnd(18)} ${PERFIS.map((p) => String(matriz[t][p]).padStart(8)).join(' ')}`);
            console.log(`  Pessoas por tópico: ${ind.cobertura.map((c) => `${c.titulo} ${c.pessoas}`).join(' · ')}`);
        }
        console.log(`  Para repetir: ${repetir(cenario)}`);
    }

    if (resumo.length > 1) {
        console.log('');
        console.log('Lado a lado:');
        console.log(`  ${'Cenário'.padEnd(16)} ${'Ganho'.padStart(7)} ${'Retenção'.padStart(9)} ${'Firmes − Frágeis'.padStart(17)}`);
        for (const r of resumo) {
            console.log(
                `  ${CENARIOS[r.cenario].rotulo.padEnd(16)} ${decimal(r.ganho?.estimativa).padStart(7)} ${(r.retencao ? porcento(r.retencao.estimativa) : '—').padStart(9)} ${pontos(r.diferenca?.estimativa).padStart(17)}`
            );
        }
    }
}

/** R turmas do mesmo tamanho, com sementes seguidas: o que um piloto desse tamanho consegue ver. */
function simularReplicas(args: {
    replicas: number;
    alunos: number;
    semente: number;
    cenarios: Cenario[];
    indicadoresDa: (cenario: Cenario, semente: number) => { ind: Indicadores };
    repetir: (cenario?: Cenario, extra?: string) => string;
}) {
    const { replicas, alunos, semente, cenarios, indicadoresDa, repetir } = args;
    console.log(`${replicas} réplicas de ${alunos} alunos, sementes ${semente} a ${semente + replicas - 1}. Nenhuma página é gravada.`);
    for (const cenario of cenarios) {
        const linhas = Array.from({ length: replicas }, (_, i) => principais(indicadoresDa(cenario, semente + i).ind));
        const faixa = (nome: string, valores: (Intervalo | null)[], formato: (v: number) => string, contaZero = true) => {
            const presentes = valores.filter((v): v is Intervalo => v !== null);
            if (presentes.length === 0) return `  ${nome.padEnd(22)} sem dados`;
            const estimativas = presentes.map((v) => v.estimativa);
            const excluem = presentes.filter((v) => !incluiZero(v)).length;
            return (
                `  ${nome.padEnd(22)} mediana ${formato(percentil(estimativas, 0.5))} · P5 ${formato(percentil(estimativas, 0.05))} · P95 ${formato(percentil(estimativas, 0.95))}` +
                (contaZero ? ` · IC exclui o zero em ${Math.round((excluem / replicas) * 100)}% das réplicas` : '') +
                (presentes.length < replicas ? ` (sem dados em ${replicas - presentes.length})` : '')
            );
        };
        console.log('');
        console.log(`Cenário ${CENARIOS[cenario].rotulo}: ${CENARIOS[cenario].descricao}`);
        console.log(faixa('Ganho da turma', linhas.map((l) => l.ganho), (v) => decimal(v)));
        console.log(faixa('Retenção', linhas.map((l) => l.retencao), porcento, false));
        console.log(faixa('Firmes − Frágeis', linhas.map((l) => l.diferenca), pontos));
        console.log(faixa('Na mesma pessoa', linhas.map((l) => l.pareado), pontos));
    }
    console.log('');
    console.log(`Para repetir: ${repetir(cenarios.length === 1 ? cenarios[0] : undefined, ` --replicas ${replicas}`)}`);
}

async function main() {
    const simulado = argumento('simulado');
    if (simulado !== undefined || argumento('replicas') !== undefined) return simular(simulado);

    const desde = filtroDesde();
    const dados = await lerDadosDoBanco();
    const indicadores = indicadoresDoRelatorio(exportarDados(dados, { desde: desde.ms }), dados);

    if (indicadores.participantes === 0) {
        console.log(
            desde.texto
                ? `Ninguém aceitou o termo a partir de ${desde.texto}: o relatório não foi gerado.`
                : 'Ninguém aceitou o termo ainda: o relatório não foi gerado.'
        );
        return;
    }

    const pasta = argumento('saida') ?? join(RAIZ, 'relatorio');
    const arquivo = join(pasta, 'index.html');
    mkdirSync(pasta, { recursive: true });
    writeFileSync(arquivo, relatorioHtml(indicadores, { geradoEm: hoje(), desde: desde.texto }));

    console.log(`Relatório gravado em ${arquivo}`);
    console.log(`  participantes:      ${indicadores.participantes}${desde.texto ? ` (aceite a partir de ${desde.texto})` : ''}`);
    console.log(`  lições verificadas: ${indicadores.verificadas}`);
    console.log(`  lições revisadas:   ${indicadores.revisadas}`);
    console.log('  Só números em conjunto: pode ser enviado. Abra o arquivo no navegador para conferir.');
}

main().then(
    () => process.exit(0),
    (e) => {
        console.error(e.message);
        process.exit(1);
    }
);
