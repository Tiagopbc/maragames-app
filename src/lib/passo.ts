// Para onde o botão "Continuar estudos" leva em cada etapa do roteiro (item 6), e o que cada
// etapa deixa abrir (item 23).
// Função pura: sem React, sem Firebase, sem estado. A etapa chega pronta de `etapaDoRoteiro`.

import type { Fase } from '../types/domain';
import type { Etapa } from './roteiro';
import type { Trilha } from './trilha';

export type Destino =
    | { tipo: 'consentimento' }
    | { tipo: 'cartao'; topicId: string }
    | { tipo: 'dia1' } // o resultado do pós-teste, com os tópicos travados até o reteste
    | { tipo: 'bloco'; fase: Fase; topicId?: string }; // `topicId` só na prática, que é por tópico

/** A tela da etapa, ou null quando não há o que abrir e o botão fica desabilitado. */
export function destinoDaEtapa(etapa: Etapa): Destino | null {
    switch (etapa.tipo) {
        case 'consentimento':
            return { tipo: 'consentimento' };
        case 'pre':
        case 'pos':
        case 'reteste':
            return { tipo: 'bloco', fase: etapa.tipo };
        case 'estudo':
            // Ver o cartão não gera evento, então não é etapa calculada (item 22): ele abre enquanto
            // o tópico não tem resposta de prática. Com a prática começada, não volta mais.
            return etapa.respondidas === 0
                ? { tipo: 'cartao', topicId: etapa.topicId }
                : { tipo: 'bloco', fase: 'pratica', topicId: etapa.topicId };
        // O reteste ainda não abriu: o que há para ver é o resultado do dia 1.
        case 'espera':
            return { tipo: 'dia1' };
        // O SUS ainda não tem tela (item 24). Quando tiver, o destino entra aqui.
        case 'sus':
        case 'concluido':
            return null;
    }
}

// O que uma rota do roteiro pode pedir: um cartão, um bloco ou o resultado do dia 1. O termo
// tem a sua própria tela.
export type DestinoDeEstudo = Exclude<Destino, { tipo: 'consentimento' }>;

/**
 * A trava do roteiro: a tela pedida só abre se for a da etapa em que a pessoa está.
 * A home já leva sempre à etapa certa; isto vale para quem chega por outro caminho, como a URL
 * digitada na web. Protege a medida: rever um tópico medido antes do reteste, ou abrir o reteste
 * antes dos sete dias, mudaria o que o reteste mede.
 */
export function podeAbrir(etapa: Etapa, destino: DestinoDeEstudo, trilha: Trilha = { tipo: 'fechada' }): boolean {
    // O tópico de hoje da trilha diária abre em qualquer etapa: ele corre ao lado do roteiro
    // medido, e não mexe no que o reteste mede (item 23).
    const topicoPedido =
        destino.tipo === 'cartao' ? destino.topicId : destino.tipo === 'bloco' && destino.fase === 'pratica' ? destino.topicId : undefined;
    if (topicoPedido !== undefined && trilha.tipo === 'hoje' && trilha.topicId === topicoPedido) return true;

    if (destino.tipo === 'cartao') {
        return etapa.tipo === 'estudo' && etapa.topicId === destino.topicId;
    }
    if (destino.tipo === 'dia1') {
        // É o resultado do pós-teste: existe da espera em diante.
        return etapa.tipo === 'espera' || etapa.tipo === 'reteste' || etapa.tipo === 'sus' || etapa.tipo === 'concluido';
    }
    if (destino.fase === 'pratica') {
        // Sem tópico não abre: quem diz qual é o tópico da vez é o roteiro.
        return etapa.tipo === 'estudo' && destino.topicId !== undefined && etapa.topicId === destino.topicId;
    }
    return etapa.tipo === destino.fase;
}

/**
 * Em desenvolvimento, os links da home abrem pré, pós e reteste fora da etapa, para dar para
 * testar o reteste sem esperar sete dias. No app do participante a trava vale sempre.
 * Esta exceção sai junto com os links, na limpeza antes do piloto (item 24).
 */
export function travaVale(destino: DestinoDeEstudo, emDesenvolvimento: boolean): boolean {
    const blocoMedido = destino.tipo === 'bloco' && destino.fase !== 'pratica';
    return !(emDesenvolvimento && blocoMedido);
}

/** O que o botão do cartão "Tópico de hoje" abre, ou null quando não há tópico para hoje. */
export function destinoDaTrilha(trilha: Trilha): Destino | null {
    if (trilha.tipo !== 'hoje') return null;
    // O mesmo corte do estudo no roteiro: sem resposta, começa pelo cartão.
    return trilha.respondidas === 0
        ? { tipo: 'cartao', topicId: trilha.topicId }
        : { tipo: 'bloco', fase: 'pratica', topicId: trilha.topicId };
}
