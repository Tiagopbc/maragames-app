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
// partir do conteúdo de content/, e passa pelas mesmas contas. Sai uma página, em
// relatorio/simulado/index.html, com o aviso de que os dados são sintéticos. Cada rodada sorteia
// uma semente nova, mostrada na página e no terminal; --semente N repete uma turma.

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { meiaNoiteDe } from '../src/lib/calendario';
import { exportarDados } from '../src/lib/exportacao';
import { indicadoresDoRelatorio, relatorioHtml } from '../src/lib/relatorio';
import { PERFIS_DE_RESPOSTA, perfilDeResposta } from '../src/lib/perfis-de-resposta';
import { TIPOS_DE_ALUNO, conteudoDoRepositorio, sementeAleatoria, simularTurma, type TipoDeAluno } from '../src/lib/simulacao';
import { RAIZ, argumento, filtroDesde, hoje, lerDadosDoBanco } from './dados-do-banco';

const DIAS_DA_TURMA_SIMULADA = 60;

// O perfil de resposta que cada tipo sorteado deveria ter: é como se confere o classificador.
const PERFIL_ESPERADO: Record<TipoDeAluno, keyof typeof PERFIS_DE_RESPOSTA> = {
    domina: 'domina',
    aluno_do_curso: 'em_progresso',
    com_dificuldade: 'com_dificuldade',
    chutador: 'chuta',
    confiante_demais: 'confiante_demais',
    inseguro: 'inseguro',
    desiste_cedo: 'poucas_respostas',
};

/** A turma de alunos virtuais e a página dela, sem ler nem tocar o banco. */
function simular(alunosTexto: string) {
    const alunos = Number(alunosTexto);
    if (!Number.isInteger(alunos) || alunos < 1 || alunos > 999) throw new Error(`Número de alunos inválido em --simulado: ${alunosTexto} (use de 1 a 999).`);
    const sementeTexto = argumento('semente');
    const semente = sementeTexto === undefined ? sementeAleatoria() : Number(sementeTexto);
    if (!Number.isInteger(semente) || semente < 1) throw new Error(`Semente inválida em --semente: ${sementeTexto} (use um número inteiro positivo).`);

    const ler = (nome: string) => JSON.parse(readFileSync(join(RAIZ, 'content', nome), 'utf8'));
    const conteudo = conteudoDoRepositorio(ler('topicos.json'), ler('questoes.json'));
    // A turma termina hoje: os primeiros alunos chegaram há dois meses.
    const inicio = meiaNoiteDe(hoje())! - DIAS_DA_TURMA_SIMULADA * 24 * 60 * 60 * 1000;
    const turma = simularTurma(conteudo, { alunos, semente, inicio });
    const indicadores = indicadoresDoRelatorio(exportarDados(turma.dados, { agora: turma.agora }), conteudo);

    const pasta = argumento('saida') ?? join(RAIZ, 'relatorio', 'simulado');
    mkdirSync(pasta, { recursive: true });
    const arquivo = join(pasta, 'index.html');
    writeFileSync(arquivo, relatorioHtml(indicadores, { geradoEm: hoje(), simulacao: { alunos, semente } }));

    const porcento = (parte: number, todo: number) => (todo === 0 ? '—' : `${Math.round((parte / todo) * 100)}%`);
    const reconhecidos = turma.dados.perfis.filter((p) => {
        const delas = turma.dados.respostas.filter((r) => r.uid === p.uid && r.fase !== 'reteste');
        return perfilDeResposta(delas) === PERFIL_ESPERADO[turma.tipos[p.uid]];
    }).length;

    console.log(`Turma sintética: ${alunos} alunos virtuais, semente ${semente}. O banco não foi lido.`);
    console.log(`  ${arquivo}`);
    console.log('  Tipos sorteados nesta turma:');
    for (const tipo of Object.keys(TIPOS_DE_ALUNO) as TipoDeAluno[]) {
        const quantos = Object.values(turma.tipos).filter((t) => t === tipo).length;
        console.log(`    ${TIPOS_DE_ALUNO[tipo].rotulo.padEnd(18)} ${String(quantos).padStart(3)}`);
    }
    console.log(`  O perfil de resposta reconheceu ${reconhecidos} de ${alunos} no tipo sorteado (${porcento(reconhecidos, alunos)}).`);
    console.log(`  Lições verificadas: ${indicadores.verificadas} · revisadas: ${indicadores.revisadas}`);
    console.log(
        `  Firmes mantidos: ${porcento(indicadores.firmes.acertos, indicadores.firmes.total)} (${indicadores.firmes.acertos} de ${indicadores.firmes.total}) · ` +
            `Frágeis mantidos: ${porcento(indicadores.frageis.acertos, indicadores.frageis.total)} (${indicadores.frageis.acertos} de ${indicadores.frageis.total})`
    );
    console.log(`  Para repetir esta turma: npm run relatorio -- --simulado ${alunos} --semente ${semente}`);
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
