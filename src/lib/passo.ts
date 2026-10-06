// Para onde o botão "Continuar estudos" leva em cada etapa do roteiro (item 6).
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
