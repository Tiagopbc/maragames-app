// Exporta os dados do piloto para a Mara Games e para o paper (M7, item 23).
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
// Gera eventos.csv, participantes.csv, questoes.csv e resumo.md, que podem ser enviados, e
// chave.csv, que liga cada código ao nome e NÃO sai do grupo.

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import {
    ordenarLicoes,
    ordenarQuestoes,
    paraAnswer,
    paraLesson,
    paraQuestion,
    topicosDasLicoes,
} from '../src/data/mapeadores';
import { arquivosDaExportacao, exportarPiloto, pastaDaExportacao, type PerfilDoExport } from '../src/lib/exportacao';

function argumento(nome: string): string | undefined {
    const i = process.argv.indexOf(`--${nome}`);
    return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
    const desdeTexto = argumento('desde');
    // Meia-noite em São Luís (UTC−3), o mesmo fuso do roteiro.
    const desde = desdeTexto ? Date.parse(`${desdeTexto}T00:00:00-03:00`) : undefined;
    if (desdeTexto && Number.isNaN(desde)) throw new Error(`Data inválida em --desde: ${desdeTexto} (use AAAA-MM-DD).`);

    const raiz = join(__dirname, '..');
    initializeApp({ credential: cert(require(join(raiz, 'serviceAccountKey.json'))) });
    const db = getFirestore();

    const [usuarios, respostas, questoes, licoes] = await Promise.all([
        db.collection('users').get(),
        db.collection('answers').get(),
        db.collection('questions').get(),
        db.collection('lessons').get(),
    ]);

    const perfis: PerfilDoExport[] = usuarios.docs.map((d) => {
        const u = d.data();
        return {
            uid: d.id,
            nome: u.nome,
            apelido: u.apelido,
            email: u.email,
            telefone: u.telefone,
            experiencia: u.experiencia,
            formaPre: u.formaPre ?? null,
            consentiuEm: u.consentiuEm ? u.consentiuEm.toMillis() : null,
        };
    });

    const exportado = exportarPiloto(
        {
            perfis,
            respostas: respostas.docs.map((d) => paraAnswer(d.id, d.data())),
            // Questão sem bloco é sobra de um seed antigo: não faz parte do conteúdo do piloto.
            questoes: ordenarQuestoes(questoes.docs.map((d) => paraQuestion(d.id, d.data())).filter((q) => q.bloco)),
            topicos: topicosDasLicoes(ordenarLicoes(licoes.docs.map((d) => paraLesson(d.id, d.data())))),
        },
        { desde }
    );

    const arquivos = arquivosDaExportacao(exportado);
    if (arquivos.length === 0) {
        console.log(
            desdeTexto
                ? `Ninguém aceitou o termo a partir de ${desdeTexto}: nada foi exportado.`
                : 'Ninguém aceitou o termo ainda: nada foi exportado.'
        );
        return;
    }

    const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const pasta = argumento('saida') ?? join(raiz, 'exportacao', pastaDaExportacao(hoje, desdeTexto));
    mkdirSync(pasta, { recursive: true });
    for (const arquivo of arquivos) writeFileSync(join(pasta, arquivo.nome), arquivo.conteudo);

    console.log(`Exportado em ${pasta}`);
    console.log(`  participantes: ${exportado.participantes.length}${desdeTexto ? ` (aceite a partir de ${desdeTexto})` : ''}`);
    console.log(`  eventos:       ${exportado.eventos.length}`);
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
