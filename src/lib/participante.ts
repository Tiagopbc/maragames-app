// O que o roteiro precisa saber do participante (item 22): a forma do pré-teste e as datas de
// consentimento e do SUS. Funções puras: sem React, sem Firebase, sem estado.

import type { FormaPre, Perfil } from '../types/domain';

export interface Participante {
    formaPre: FormaPre | null;
    consentiuEm: number | null;
    susRespondidoEm: number | null;
}

/**
 * Forma do pré-teste de quem é o `ordem`-ésimo a aceitar o termo: A, B, A, B...
 * Alternar garante metades iguais, o que um sorteio não garante com cerca de 15 pessoas.
 * A mesma conta está no firestore.rules (`formaDoContador`). Mudou uma, muda a outra.
 */
export function formaDoParticipante(ordem: number): FormaPre {
    if (!Number.isInteger(ordem) || ordem < 1) throw new Error(`Ordem de aceite inválida: ${ordem}.`);
    return ordem % 2 === 1 ? 'A' : 'B';
}

export function participanteDoRoteiro(perfil: Pick<Perfil, 'formaPre' | 'consentiuEm'> | null): Participante {
    return {
        formaPre: perfil?.formaPre ?? null,
        consentiuEm: perfil?.consentiuEm ?? null,
        // Ainda não existe em `users/{uid}`: entra no tipo `Perfil` e nas regras com a tela do SUS.
        susRespondidoEm: null,
    };
}
