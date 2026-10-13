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
//
// Sem --saida, grava em exportacao/AAAA-MM-DD, ou em exportacao/AAAA-MM-DD-desde-AAAA-MM-DD
// quando há filtro. Se ninguém entra no filtro, avisa e não grava nada.
//
// Gera eventos.csv, participantes.csv, licoes.csv, questoes.csv, autoavaliacao.csv e resumo.md,
// com um código no lugar do nome, e chave.csv, que liga cada código ao nome e NÃO sai do grupo.

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { arquivosDaExportacao, exportarDados, pastaDaExportacao } from '../src/lib/exportacao';
import { RAIZ, argumento, filtroDesde, hoje, lerDadosDoBanco } from './dados-do-banco';

async function main() {
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
