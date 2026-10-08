// Retenção do pós-teste para o reteste (M5): o quanto do que a pessoa acertou no fim do dia 1
// ainda está lá uma semana depois. Função pura: sem React, sem Firebase, sem estado. Nada aqui
// é gravado; serve à exportação e à análise (item 23).

import type { Answer, Question } from '../types/domain';
import { quadranteDe } from './quadrante';
import type { Taxa } from './resultado';

export type RespostaDaRetencao = Pick<Answer, 'questionId' | 'fase' | 'correta' | 'confianca'>;
export type QuestaoDaRetencao = Pick<Question, 'id' | 'topicId'>;

export interface Retencao {
    pares: number; // questões respondidas no pós e no reteste; só elas entram na conta
    acertosNoPos: number;
    acertosNoReteste: number;
    // acertosNoReteste / acertosNoPos. Passa de 1 se a pessoa melhorou. É null quando o pós
    // não teve acerto entre os pares: não havia o que reter, e zero diria outra coisa.
    razao: number | null;
}

export interface RetencaoDoTopico extends Retencao {
    topicId: string;
}

export interface RetencaoDoParticipante extends Retencao {
    porTopico: RetencaoDoTopico[]; // na ordem do bloco; só tópicos com algum par
    // Dos acertos do pós, quantos continuam certos no reteste, pelo quadrante que tinham no pós.
    // É o indicador central do piloto: se o Firme é mais lembrado que o Frágil, a confiança
    // declarada prevê o esquecimento.
    mantidas: { firme: Taxa; fragil: Taxa };
}

const vazia = (): Retencao => ({ pares: 0, acertosNoPos: 0, acertosNoReteste: 0, razao: null });

/**
 * Compara o pós com o reteste, questão a questão. `questoes` é o bloco do pós (o reteste repete
 * as mesmas), na ordem de exibição; `respostas` vem da mais antiga para a mais recente, de
 * qualquer fase. Cada questão conta uma vez por fase, pela resposta mais recente. Quem parou
 * o reteste no meio é comparado só nas questões que respondeu das duas vezes.
 */
export function retencao(
    respostas: readonly RespostaDaRetencao[],
    questoes: readonly QuestaoDaRetencao[]
): RetencaoDoParticipante {
    const noPos = new Map<string, RespostaDaRetencao>();
    const noReteste = new Map<string, RespostaDaRetencao>();
    for (const r of respostas) {
        if (r.fase === 'pos') noPos.set(r.questionId, r);
        else if (r.fase === 'reteste') noReteste.set(r.questionId, r);
    }

    const geral = vazia();
    const topicos = new Map<string, RetencaoDoTopico>();
    const porTopico: RetencaoDoTopico[] = [];
    const mantidas = { firme: { acertos: 0, total: 0 }, fragil: { acertos: 0, total: 0 } };

    // Percorrer as questões, e não as respostas, é o que põe os tópicos na ordem do bloco e
    // deixa de fora resposta de questão que não é dele.
    for (const questao of questoes) {
        const pos = noPos.get(questao.id);
        const reteste = noReteste.get(questao.id);
        if (!pos || !reteste) continue;

        let topico = topicos.get(questao.topicId);
        if (!topico) {
            topico = { topicId: questao.topicId, ...vazia() };
            topicos.set(questao.topicId, topico);
            porTopico.push(topico);
        }

        for (const conta of [geral, topico]) {
            conta.pares += 1;
            if (pos.correta) conta.acertosNoPos += 1;
            if (reteste.correta) conta.acertosNoReteste += 1;
        }

        if (pos.correta) {
            // O quadrante é o do pós: a confiança declarada no reteste não entra aqui.
            const quadrante = quadranteDe(true, pos.confianca) === 'firme' ? 'firme' : 'fragil';
            mantidas[quadrante].total += 1;
            if (reteste.correta) mantidas[quadrante].acertos += 1;
        }
    }

    for (const conta of [geral, ...porTopico]) {
        conta.razao = conta.acertosNoPos === 0 ? null : conta.acertosNoReteste / conta.acertosNoPos;
    }

    return { ...geral, porTopico, mantidas };
}
