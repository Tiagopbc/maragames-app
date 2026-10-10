// Uma lição do aluno, para a página da lição, o portão e o fim de cada passo (item 30): lê
// conteúdo e respostas pelo repositório e entrega tudo às funções puras de `src/lib/licao.ts`.
// Nada é guardado: cada recarga recalcula a partir de `answers`.

import { useCallback, useRef, useState } from 'react';

import { repositorio } from '@/data/repositorio';
import { questoesDaPratica, questoesDoBlocoMedido } from '@/lib/bloco';
import {
    cicloDaLicao,
    licoesDoAluno,
    resultadoDaLicao,
    type EtapaDaLicao,
    type Licao,
    type ResultadoDaLicao,
} from '@/lib/licao';
import { sequenciaDeDias } from '@/lib/sequencia';
import type { FormaPre } from '@/types/domain';

export interface EntradaDaLicaoDoAluno {
    uid: string;
    topicId: string;
    formaPre: FormaPre | null; // users/{uid}.formaPre; null enquanto o termo não foi aceito
    relogio?: () => number; // ms; trocável em teste. Precisa ser sempre a mesma função.
}

export type EstadoDaLicaoDoAluno =
    | { tipo: 'carregando' }
    | { tipo: 'erro' }
    | { tipo: 'inexistente' } // o tópico não existe ou não tem questão que vire lição
    | {
          tipo: 'pronto';
          licao: Licao;
          titulo: string;
          modulo: string | null;
          temCartao: boolean;
          questoesPorEtapa: Record<EtapaDaLicao, number>; // o tamanho de cada etapa
          resultado: ResultadoDaLicao | null; // null enquanto não há o que mostrar
          sequencia: number; // dias seguidos com resposta
      };

export function useLicao({ uid, topicId, formaPre, relogio = Date.now }: EntradaDaLicaoDoAluno) {
    const [estado, setEstado] = useState<EstadoDaLicaoDoAluno>({ tipo: 'carregando' });
    const ultimaCarga = useRef(0);

    /**
     * Lê de novo e recalcula a lição. O hook não carrega sozinho: quem chama é a tela, toda vez
     * que ganha foco, para o passo já estar atualizado quando o aluno volta de um bloco.
     */
    const recarregar = useCallback(async () => {
        const carga = ++ultimaCarga.current;
        // Depois de um erro volta o indicador; fora isso, o estado anterior fica na tela até o novo chegar.
        setEstado((atual) => (atual.tipo === 'erro' ? { tipo: 'carregando' } : atual));

        let novo: EstadoDaLicaoDoAluno;
        try {
            const [licoes, questoes, respostas] = await Promise.all([
                repositorio.getLicoes(),
                repositorio.getQuestoes(),
                repositorio.getRespostas(uid),
            ]);
            const doConteudo = licoes.find((l) => l.topicId === topicId);

            if (!doConteudo || cicloDaLicao(questoes, topicId) === null) {
                novo = { tipo: 'inexistente' };
            } else {
                const agora = relogio();
                const [licao] = licoesDoAluno({ topicos: [topicId], respostas, questoes, formaPre, agora });
                // O tamanho do diagnóstico não depende da forma: as duas têm o mesmo número de questões.
                const daForma = questoesDoBlocoMedido(questoes, 'pre', [topicId], formaPre ?? 'A').length;

                novo = {
                    tipo: 'pronto',
                    licao,
                    titulo: doConteudo.title,
                    modulo: doConteudo.modulo ?? null,
                    temCartao: (doConteudo.cartao ?? []).length > 0,
                    questoesPorEtapa: {
                        diagnostico: daForma,
                        estudo: questoesDaPratica(questoes, topicId).length,
                        verificacao: daForma,
                        revisao: daForma,
                    },
                    resultado: resultadoDaLicao({ licao, respostas, questoes, formaPre }),
                    sequencia: sequenciaDeDias(respostas, agora),
                };
            }
        } catch (e) {
            console.warn('Não foi possível ler a lição.', e);
            novo = { tipo: 'erro' };
        }

        // Se outra recarga começou depois desta, é o resultado dela que vale.
        if (carga === ultimaCarga.current) setEstado(novo);
    }, [uid, topicId, formaPre, relogio]);

    return { estado, recarregar };
}
