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
//
// Sem --saida, grava relatorio/index.html, por cima do anterior: a página diz de que dia é.
// A pasta fica fora do git. Se ninguém entra no filtro, avisa e não grava nada.

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { exportarDados } from '../src/lib/exportacao';
import { indicadoresDoRelatorio, relatorioHtml } from '../src/lib/relatorio';
import { RAIZ, argumento, filtroDesde, hoje, lerDadosDoBanco } from './dados-do-banco';

async function main() {
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
