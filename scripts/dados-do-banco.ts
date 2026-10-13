// Lê do Firestore o que a exportação e o relatório precisam, com a chave de serviço
// (serviceAccountKey.json, fora do git). Só LÊ: nada aqui grava no banco.
//
// Usado por scripts/exportar-piloto.ts e scripts/gerar-relatorio.ts, para os dois partirem dos
// mesmos dados.

import { readFileSync } from 'fs';
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
import { meiaNoiteDe } from '../src/lib/calendario';
import type { DadosDaExportacao, PerfilDoExport } from '../src/lib/exportacao';

export const RAIZ = join(__dirname, '..');

export function argumento(nome: string): string | undefined {
    const i = process.argv.indexOf(`--${nome}`);
    return i === -1 ? undefined : process.argv[i + 1];
}

/** O filtro `--desde AAAA-MM-DD`: o texto e a meia-noite desse dia em São Luís (UTC−3), em ms. */
export function filtroDesde(): { texto?: string; ms?: number } {
    const texto = argumento('desde');
    if (texto === undefined) return {};
    // Dia que não existe é recusado: senão o recorte seria um, e a data escrita na página, outra.
    const ms = meiaNoiteDe(texto);
    if (ms === null) throw new Error(`Data inválida em --desde: ${texto} (use AAAA-MM-DD, com um dia que exista).`);
    return { texto, ms };
}

/** O dia de hoje em São Luís, como AAAA-MM-DD. */
export function hoje(): string {
    return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function lerDadosDoBanco(): Promise<DadosDaExportacao> {
    initializeApp({ credential: cert(JSON.parse(readFileSync(join(RAIZ, 'serviceAccountKey.json'), 'utf8'))) });
    const db = getFirestore();

    const [usuarios, respostas, questoes, licoes, tentativas, autoavaliacoes] = await Promise.all([
        db.collection('users').get(),
        db.collection('answers').get(),
        db.collection('questions').get(),
        db.collection('lessons').get(),
        db.collection('attempts').get(),
        db.collection('selfAssessments').get(),
    ]);

    const perfis: PerfilDoExport[] = usuarios.docs.map((d) => {
        const u = d.data();
        return {
            uid: d.id,
            nome: u.nome,
            apelido: u.apelido,
            email: u.email,
            telefone: u.telefone,
            faixaEtaria: u.faixaEtaria,
            cidade: u.cidade,
            uf: u.uf,
            situacaoDeEstudo: u.situacaoDeEstudo,
            instituicao: u.instituicao,
            curso: u.curso,
            experiencia: u.experiencia,
            aceitaContato: u.aceitaContato,
            ocupacao: u.ocupacao,
            engines: u.engines,
            linguagens: u.linguagens,
            estudoDeGameDesign: u.estudoDeGameDesign,
            interesses: u.interesses,
            objetivo: u.objetivo,
            tempoPorSemana: u.tempoPorSemana,
            comoConheceu: u.comoConheceu,
            alunoDoSite: u.alunoDoSite,
            formaPre: u.formaPre ?? null,
            consentiuEm: u.consentiuEm ? u.consentiuEm.toMillis() : null,
        };
    });

    return {
        perfis,
        respostas: respostas.docs.map((d) => paraAnswer(d.id, d.data())),
        // Questão sem bloco é sobra de um seed antigo: não faz parte do conteúdo.
        questoes: ordenarQuestoes(questoes.docs.map((d) => paraQuestion(d.id, d.data())).filter((q) => q.bloco)),
        topicos: topicosDasLicoes(ordenarLicoes(licoes.docs.map((d) => paraLesson(d.id, d.data())))),
        tentativas: tentativas.docs.map((d) => ({
            id: d.id,
            plataforma: d.data().plataforma,
            versaoDoApp: d.data().versaoDoApp,
        })),
        autoavaliacoes: autoavaliacoes.docs.map((d) => ({
            uid: d.id,
            notas: d.data().notas,
            respondidaEm: d.data().respondidaEm.toMillis(),
        })),
    };
}
