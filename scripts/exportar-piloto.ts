// Exporta os dados para a análise do grupo: o artigo, a apresentação e a conferência dos números
// do app (M7, item 23). Os arquivos ficam com o grupo; o que vai para a Beast Maragames é o
// relatório, de `npm run relatorio`.
//
// Só LÊ o Firestore, com a chave de serviço (serviceAccountKey.json, fora do git). As contas
// são feitas por src/lib/exportacao.ts, com as mesmas funções que o app usa.
//
// Uso:
//   npm run exportar                         todo mundo que aceitou o termo
//   npm run exportar -- --desde 2026-10-30   só quem aceitou a partir desse dia (sem as contas de teste)
//   npm run exportar -- --saida pasta        escolhe a pasta
//   npm run exportar -- --simulado 100 --semente 1250808581
//                                            o banco fictício: a turma de alunos virtuais, sem ler o banco
//
// Com --simulado, o Firestore não é lido nem tocado: a turma é a mesma que `npm run relatorio`
// sorteia com a mesma semente (e as mesmas --cenario, --limite-diario, --dias-de-estudo e
// --defeitos). Grava em exportacao/simulado-<semente>/ os mesmos arquivos da exportação real e
// dados-brutos.json, com as quatro coleções (users, selfAssessments, attempts, answers) no formato
// do app (item 36).
//
// Sem --saida, grava em exportacao/AAAA-MM-DD, ou em exportacao/AAAA-MM-DD-desde-AAAA-MM-DD
// quando há filtro. Se ninguém entra no filtro, avisa e não grava nada.
//
// Gera eventos.csv, participantes.csv, licoes.csv, questoes.csv, autoavaliacao.csv e resumo.md,
// com um código no lugar do nome, e chave.csv, que liga cada código ao nome e NÃO sai do grupo.

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { arquivosDaExportacao, exportarDados, pastaDaExportacao } from '../src/lib/exportacao';
import { bancoFicticio } from '../src/lib/simulacao';
import { RAIZ, argumento, filtroDesde, hoje, lerDadosDoBanco } from './dados-do-banco';
import { conteudoComVersao, opcoesDaLinhaDeComando, turmaSimulada } from './turma-simulada';

/** O banco fictício: a turma virtual em arquivos, para o grupo trabalhar em cima. */
function exportarSimulado(alunosTexto: string) {
    const { alunos, semente, cenarioPedido, diasDeEstudo, limiteDiario, defeitos } = opcoesDaLinhaDeComando(alunosTexto, 100);
    const cenario = cenarioPedido ?? 'base';
    const { versao, conteudo } = conteudoComVersao();
    const turma = turmaSimulada(conteudo, { alunos, semente, cenario, limiteDiario, diasDeEstudo, defeitos });
    const exportado = exportarDados(turma.dados, { agora: turma.agora });
    const banco = bancoFicticio(turma);

    const nome = `simulado-${semente}${cenario === 'base' ? '' : `-${cenario}`}`;
    const pasta = argumento('saida') ?? join(RAIZ, 'exportacao', nome);
    mkdirSync(pasta, { recursive: true });
    for (const arquivo of arquivosDaExportacao(exportado)) writeFileSync(join(pasta, arquivo.nome), arquivo.conteudo);
    writeFileSync(
        join(pasta, 'dados-brutos.json'),
        JSON.stringify({ sintetico: true, alunos, semente, cenario, versaoConteudo: versao, ...banco }, null, 2)
    );

    console.log(`Banco fictício gravado em ${pasta}`);
    console.log(`  ${alunos} alunos virtuais · semente ${semente} · cenário ${cenario} · versão do conteúdo ${versao}. O Firestore não foi lido.`);
    console.log(`  dados-brutos.json: ${Object.keys(banco.users).length} users · ${Object.keys(banco.selfAssessments).length} selfAssessments · ${banco.attempts.length} attempts · ${banco.answers.length} answers`);
    console.log(`  tabelas: ${exportado.participantes.length} participantes · ${exportado.licoes.length} lições · ${exportado.eventos.length} eventos · ${exportado.questoes.length} questões`);
    console.log('  Dados sintéticos: não são de gente e não vão para o Firestore.');
}

async function main() {
    const simulado = argumento('simulado');
    if (simulado !== undefined) return exportarSimulado(simulado);

    const { texto: desdeTexto, ms: desde } = filtroDesde();
    const exportado = exportarDados(await lerDadosDoBanco(), { desde });

    const arquivos = arquivosDaExportacao(exportado);
    if (arquivos.length === 0) {
        console.log(
            desdeTexto
                ? `Ninguém aceitou o termo a partir de ${desdeTexto}: nada foi exportado.`
                : 'Ninguém aceitou o termo ainda: nada foi exportado.'
        );
        return;
    }

    const pasta = argumento('saida') ?? join(RAIZ, 'exportacao', pastaDaExportacao(hoje(), desdeTexto));
    mkdirSync(pasta, { recursive: true });
    for (const arquivo of arquivos) writeFileSync(join(pasta, arquivo.nome), arquivo.conteudo);

    console.log(`Exportado em ${pasta}`);
    console.log(`  participantes: ${exportado.participantes.length}${desdeTexto ? ` (aceite a partir de ${desdeTexto})` : ''}`);
    console.log(`  eventos:       ${exportado.eventos.length}`);
    console.log(`  lições:        ${exportado.licoes.length} (uma linha por pessoa e por lição começada)`);
    console.log(`  questões:      ${exportado.questoes.length}`);
    console.log('  chave.csv liga os códigos aos nomes: fica só com o grupo, não envie.');
}

main().then(
    () => process.exit(0),
    (e) => {
        console.error(e.message);
        process.exit(1);
    }
);
