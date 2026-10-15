// A turma de alunos virtuais que o relatório e a exportação usam (itens 35 e 36): as opções da
// linha de comando, o conteúdo de content/ com a versão dele e a turma sorteada. Não lê nem grava
// o Firestore.
//
// Usado por scripts/gerar-relatorio.ts e scripts/exportar-piloto.ts, para os dois sortearem a
// mesma turma com a mesma semente.

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

import { meiaNoiteDe } from '../src/lib/calendario';
import {
    CENARIOS,
    DIAS_DA_SIMULACAO,
    conteudoDoRepositorio,
    sementeAleatoria,
    simularTurma,
    type Cenario,
    type OpcoesDaSimulacao,
} from '../src/lib/simulacao';
import { RAIZ, argumento, hoje } from './dados-do-banco';

export const marcado = (nome: string) => process.argv.includes(`--${nome}`);

export function inteiro(nome: string, minimo: number, maximo: number): number | undefined {
    const texto = argumento(nome);
    if (texto === undefined) return undefined;
    const valor = Number(texto);
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) throw new Error(`Valor inválido em --${nome}: ${texto} (use de ${minimo} a ${maximo}).`);
    return valor;
}

/** O conteúdo de content/ e a versão dele, o mesmo hash que o seed grava em cada questão. */
export function conteudoComVersao() {
    const bruto = (nome: string) => readFileSync(join(RAIZ, 'content', nome), 'utf8');
    const topicos = bruto('topicos.json');
    const questoes = bruto('questoes.json');
    const versao = createHash('sha256').update(topicos).update(questoes).digest('hex').slice(0, 12);
    return { versao, conteudo: conteudoDoRepositorio(JSON.parse(topicos), JSON.parse(questoes), versao) };
}

/** As opções da turma: --simulado N, --semente S, --cenario X, --limite-diario e --dias-de-estudo N. */
export function opcoesDaLinhaDeComando(alunosTexto: string | undefined, alunosPadrao: number) {
    const alunos = alunosTexto === undefined ? alunosPadrao : Number(alunosTexto);
    if (!Number.isInteger(alunos) || alunos < 1 || alunos > 999) throw new Error(`Número de alunos inválido em --simulado: ${alunosTexto} (use de 1 a 999).`);
    const sementeTexto = argumento('semente');
    const semente = sementeTexto === undefined ? sementeAleatoria() : Number(sementeTexto);
    if (!Number.isInteger(semente) || semente < 1) throw new Error(`Semente inválida em --semente: ${sementeTexto} (use um número inteiro positivo).`);
    const cenarioPedido = argumento('cenario');
    if (cenarioPedido !== undefined && !(cenarioPedido in CENARIOS))
        throw new Error(`Cenário inválido em --cenario: ${cenarioPedido} (use ${Object.keys(CENARIOS).join(', ')}).`);
    return {
        alunos,
        semente,
        cenarioPedido: cenarioPedido as Cenario | undefined,
        diasDeEstudo: inteiro('dias-de-estudo', 1, DIAS_DA_SIMULACAO - 14),
        limiteDiario: marcado('limite-diario'),
        defeitos: marcado('defeitos'),
    };
}

/** A turma termina hoje: os primeiros alunos chegaram há DIAS_DA_SIMULACAO dias. */
export function inicioDaTurma(): number {
    return meiaNoiteDe(hoje())! - DIAS_DA_SIMULACAO * 24 * 60 * 60 * 1000;
}

export function turmaSimulada(conteudo: ReturnType<typeof conteudoComVersao>['conteudo'], opcoes: Omit<OpcoesDaSimulacao, 'inicio'>) {
    return simularTurma(conteudo, { ...opcoes, inicio: inicioDaTurma() });
}
