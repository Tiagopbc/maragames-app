// Etapa do roteiro do aluno, para a home (item 6): lê conteúdo e respostas pelo repositório e
// entrega tudo a `etapaDoRoteiro`. Nada é guardado: cada recarga recalcula a partir de `answers`.

import { useCallback, useRef, useState } from 'react';

import { repositorio } from '@/data/repositorio';
import { topicosDaTrilha, topicosMedidos } from '@/lib/bloco';
import type { Participante } from '@/lib/participante';
import { etapaDoRoteiro, terminoDoPos, type Etapa } from '@/lib/roteiro';
import { estadoDaTrilha, semanaDoPiloto, sequenciaDeDias, type DiaDaSemana, type Trilha } from '@/lib/trilha';

export interface EntradaDoRoteiroDoAluno {
    uid: string;
    participante: Participante;
    relogio?: () => number; // ms; trocável em teste. Precisa ser sempre a mesma função.
}

export type EstadoDoRoteiro =
    | { tipo: 'carregando' }
    | { tipo: 'erro' }
    | {
          tipo: 'pronto';
          etapa: Etapa;
          nomeDoTopico: string | null; // nome só na etapa de estudo
          trilha: Trilha; // a trilha diária corre ao lado do roteiro, do fim do pós em diante
          sequencia: number; // dias seguidos com resposta
          semana: DiaDaSemana[]; // os sete dias da tela da sequência; vazia antes do fim do pós
          nomes: Record<string, string>; // título de cada tópico, por id
      };

export function useRoteiro({ uid, participante, relogio = Date.now }: EntradaDoRoteiroDoAluno) {
    const [estado, setEstado] = useState<EstadoDoRoteiro>({ tipo: 'carregando' });
    const ultimaCarga = useRef(0);
    const { formaPre, consentiuEm, susRespondidoEm } = participante;

    /**
     * Lê de novo e recalcula a etapa. O hook não carrega sozinho: quem chama é a tela, toda vez
     * que ganha foco, para a etapa já estar atualizada quando o aluno volta de um bloco.
     */
    const recarregar = useCallback(async () => {
        const carga = ++ultimaCarga.current;
        // Depois de um erro volta o indicador; fora isso, a etapa anterior fica na tela até a nova chegar.
        setEstado((atual) => (atual.tipo === 'erro' ? { tipo: 'carregando' } : atual));

        let novo: EstadoDoRoteiro;
        try {
            const [topicos, questoes, respostas] = await Promise.all([
                repositorio.getTopicos(),
                repositorio.getQuestoes(),
                repositorio.getRespostas(uid),
            ]);
            const agora = relogio();
            const ids = topicos.map((t) => t.id);
            // A ordem do roteiro é a das lições; só entram os tópicos medidos.
            const medidos = topicosMedidos(questoes, ids);
            const etapa = etapaDoRoteiro({
                respostas,
                questoes,
                topicos: medidos,
                formaPre,
                consentiuEm,
                susRespondidoEm,
                agora,
            });
            const fimDoPos = terminoDoPos({ respostas, questoes, topicos: medidos, formaPre });
            const trilha = estadoDaTrilha({
                respostas,
                questoes,
                topicos: topicosDaTrilha(questoes, ids),
                fimDoPos,
                agora,
            });
            const nomeDoTopico =
                etapa.tipo === 'estudo' ? (topicos.find((t) => t.id === etapa.topicId)?.titulo ?? null) : null;
            novo = {
                tipo: 'pronto',
                etapa,
                nomeDoTopico,
                trilha,
                sequencia: sequenciaDeDias(respostas, agora),
                semana: fimDoPos === null ? [] : semanaDoPiloto(respostas, fimDoPos, agora),
                nomes: Object.fromEntries(topicos.map((t) => [t.id, t.titulo])),
            };
        } catch (e) {
            console.warn('Não foi possível calcular a etapa do roteiro.', e);
            novo = { tipo: 'erro' };
        }

        // Se outra recarga começou depois desta, é o resultado dela que vale.
        if (carga === ultimaCarga.current) setEstado(novo);
    }, [uid, formaPre, consentiuEm, susRespondidoEm, relogio]);

    return { estado, recarregar };
}
