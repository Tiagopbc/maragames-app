// A sugestão do dia (item 30): o passo único que o cartão "Para hoje" da home aponta.
// Função pura: sem React, sem Firebase, sem estado. Sai dos estados das lições, que saem de `answers`.

import type { Licao } from './licao';

export type Sugestao =
    | { tipo: 'revisao'; topicId: string }
    | { tipo: 'continuar'; topicId: string }
    | { tipo: 'nova'; topicId: string }
    // Nada para fazer hoje: a revisão que abre primeiro, e quando.
    | { tipo: 'em_dia'; topicId: string; liberaEm: number; diasRestantes: number }
    | { tipo: 'tudo_concluido' };

/**
 * O melhor próximo passo entre todas as lições, que chegam na ordem sugerida do conteúdo.
 * A revisão vencida vem primeiro, porque é a única com prazo: cada dia a mais muda o que ela
 * mede. Depois, o que ficou pela metade; por último, uma lição nova. Não há limite por dia:
 * terminado o passo, a conta refeita aponta o seguinte.
 */
export function sugestaoDoDia(licoes: readonly Licao[]): Sugestao {
    // `reduce` com comparação estrita: no empate, fica a que vem antes na ordem das lições.
    const menor = <T>(itens: readonly T[], valor: (item: T) => number): T | undefined =>
        itens.length === 0 ? undefined : itens.reduce((a, b) => (valor(b) < valor(a) ? b : a));

    const revisoes = licoes.flatMap((l) => (l.estado.tipo === 'revisao' ? [{ topicId: l.topicId, ...l.estado }] : []));
    const revisao = menor(revisoes, (l) => l.liberadaEm);
    if (revisao) return { tipo: 'revisao', topicId: revisao.topicId };

    const pelaMetade = licoes.filter((l) => ['diagnostico', 'estudo', 'verificacao'].includes(l.estado.tipo));
    const recente = menor(pelaMetade, (l) => -(l.ultimaRespostaEm ?? 0));
    if (recente) return { tipo: 'continuar', topicId: recente.topicId };

    const nova = licoes.find((l) => l.estado.tipo === 'nova');
    if (nova) return { tipo: 'nova', topicId: nova.topicId };

    const esperas = licoes.flatMap((l) =>
        l.estado.tipo === 'aguardando_revisao' ? [{ topicId: l.topicId, ...l.estado }] : []
    );
    const proxima = menor(esperas, (l) => l.liberaEm);
    if (proxima) {
        return { tipo: 'em_dia', topicId: proxima.topicId, liberaEm: proxima.liberaEm, diasRestantes: proxima.diasRestantes };
    }

    return { tipo: 'tudo_concluido' };
}
