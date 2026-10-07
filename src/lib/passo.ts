// Para onde o botão "Continuar estudos" leva em cada etapa do roteiro (item 6), e o que cada
// etapa deixa abrir (item 23).
// Função pura: sem React, sem Firebase, sem estado. A etapa chega pronta de `etapaDoRoteiro`.

import type { Fase } from '../types/domain';
import type { Etapa } from './roteiro';

export type Destino =
    | { tipo: 'consentimento' }
    | { tipo: 'cartao'; topicId: string }
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
        // A espera não tem bloco: o reteste ainda não abriu.
        case 'espera':
        // O SUS ainda não tem tela (item 24). Quando tiver, o destino entra aqui.
        case 'sus':
        case 'concluido':
            return null;
    }
}

// O que uma rota de estudo pode pedir: um cartão ou um bloco. O termo tem a sua própria tela.
export type DestinoDeEstudo = Exclude<Destino, { tipo: 'consentimento' }>;

/**
 * A trava do roteiro: a tela pedida só abre se for a da etapa em que a pessoa está.
 * A home já leva sempre à etapa certa; isto vale para quem chega por outro caminho, como a URL
 * digitada na web. Protege a medida: rever um tópico medido antes do reteste, ou abrir o reteste
 * antes dos sete dias, mudaria o que o reteste mede.
 */
export function podeAbrir(etapa: Etapa, destino: DestinoDeEstudo): boolean {
    if (destino.tipo === 'cartao') {
        return etapa.tipo === 'estudo' && etapa.topicId === destino.topicId;
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
