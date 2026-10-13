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
// Sem --saida, grava relatorio/index.html, por cima do anterior: a página diz de que dia é.
// A pasta fica fora do git. Se ninguém entra no filtro, avisa e não grava nada.
//
// Com --simulado, o banco não é lido nem tocado: a turma é sorteada por src/lib/simulacao.ts a
// partir do conteúdo de content/, e passa pelas mesmas contas. Saem duas páginas, uma por
// cenário, em relatorio/simulado/, cada uma com o aviso de que os dados são simulados e o link
// para a outra. --semente N troca a turma sorteada; a mesma semente dá sempre a mesma turma.

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { meiaNoiteDe } from '../src/lib/calendario';
import { exportarDados } from '../src/lib/exportacao';
import { indicadoresDoRelatorio, relatorioHtml } from '../src/lib/relatorio';
import { CENARIOS, conteudoDoRepositorio, simularTurma, type Cenario } from '../src/lib/simulacao';
import { RAIZ, argumento, filtroDesde, hoje, lerDadosDoBanco } from './dados-do-banco';

const DIAS_DA_TURMA_SIMULADA = 60;

/** A turma de alunos virtuais: uma página por cenário, sem ler nem tocar o banco. */
function simular(alunosTexto: string) {
    const alunos = Number(alunosTexto);
    if (!Number.isInteger(alunos) || alunos < 1 || alunos > 999) throw new Error(`Número de alunos inválido em --simulado: ${alunosTexto} (use de 1 a 999).`);
    const semente = Number(argumento('semente') ?? 2026);
    if (!Number.isInteger(semente)) throw new Error(`Semente inválida em --semente: ${argumento('semente')} (use um número inteiro).`);

    const ler = (nome: string) => JSON.parse(readFileSync(join(RAIZ, 'content', nome), 'utf8'));
    const conteudo = conteudoDoRepositorio(ler('topicos.json'), ler('questoes.json'));
    // A turma termina hoje: os primeiros alunos chegaram há dois meses.
    const inicio = meiaNoiteDe(hoje())! - DIAS_DA_TURMA_SIMULADA * 24 * 60 * 60 * 1000;
    const pasta = argumento('saida') ?? join(RAIZ, 'relatorio', 'simulado');
    mkdirSync(pasta, { recursive: true });

    console.log(`Turma simulada: ${alunos} alunos virtuais, semente ${semente}. O banco não foi lido.`);
    for (const cenario of Object.keys(CENARIOS) as Cenario[]) {
        const turma = simularTurma(conteudo, { alunos, cenario, semente, inicio });
        const indicadores = indicadoresDoRelatorio(exportarDados(turma.dados, { agora: turma.agora }), conteudo);
        const arquivo = join(pasta, CENARIOS[cenario].arquivo);
        writeFileSync(arquivo, relatorioHtml(indicadores, { geradoEm: hoje(), simulacao: { alunos, cenario } }));

        const mantidos = (taxa: { acertos: number; total: number }) => `${taxa.acertos} de ${taxa.total}`;
        console.log(`  ${CENARIOS[cenario].titulo}`);
        console.log(`    ${arquivo}`);
        console.log(`    lições verificadas: ${indicadores.verificadas} · revisadas: ${indicadores.revisadas}`);
        console.log(`    Firmes mantidos: ${mantidos(indicadores.firmes)} · Frágeis mantidos: ${mantidos(indicadores.frageis)}`);
    }
    console.log('  As duas páginas dizem no topo que os dados são simulados.');
}

async function main() {
    const simulado = argumento('simulado');
    if (simulado !== undefined) return simular(simulado);

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
