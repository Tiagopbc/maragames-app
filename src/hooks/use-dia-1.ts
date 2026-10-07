// Resultado do dia 1, para a espera do reteste (M5): o resultado do pós-teste e os tópicos que
// ficam travados até o reteste. Nada é gravado: tudo sai de `answers`, pelo repositório.

import { useEffect, useState } from 'react';

import { repositorio } from '@/data/repositorio';
import { questoesDoBlocoMedido, topicosMedidos } from '@/lib/bloco';
import { resultadoDoBloco, type RespostaDoResultado } from '@/lib/resultado';
import type { FormaPre } from '@/types/domain';

import type { Relatorio } from './use-bloco';

export interface TopicoTravado {
    id: string;
    titulo: string;
}

export type EstadoDoDia1 =
    | { tipo: 'carregando' }
    | { tipo: 'erro' }
    | { tipo: 'pronto'; relatorio: Relatorio; travados: TopicoTravado[] };

export function useDia1({ uid, formaPre }: { uid: string; formaPre: FormaPre }) {
    const [estado, setEstado] = useState<EstadoDoDia1>({ tipo: 'carregando' });
    const [carga, setCarga] = useState(0);

    useEffect(() => {
        let ativa = true; // a tela pode fechar antes de a leitura voltar

        Promise.all([repositorio.getTopicos(), repositorio.getQuestoes(), repositorio.getRespostas(uid)])
            .then(([topicos, questoes, respostas]) => {
                if (!ativa) return;
                // Os mesmos tópicos e as mesmas questões que o roteiro e a tela do bloco usam.
                const medidos = topicosMedidos(
                    questoes,
                    topicos.map((t) => t.id)
                );
                const doPos = questoesDoBlocoMedido(questoes, 'pos', medidos, formaPre);
                const respostasDoPos = respostas.filter((r) => r.fase === 'pos') as RespostaDoResultado[];

                setEstado({
                    tipo: 'pronto',
                    relatorio: {
                        resultado: resultadoDoBloco(respostasDoPos, doPos),
                        // Sem enunciados: essas questões voltam no reteste, e a tela não tem como
                        // mostrar o que não recebe (item 27).
                        enunciados: {},
                        nomesDosTopicos: Object.fromEntries(topicos.map((t) => [t.id, t.titulo])),
                    },
                    travados: topicos.filter((t) => medidos.includes(t.id)).map((t) => ({ id: t.id, titulo: t.titulo })),
                });
            })
            .catch((e) => {
                console.warn('Não foi possível ler o resultado do dia 1.', e);
                if (ativa) setEstado({ tipo: 'erro' });
            });

        return () => {
            ativa = false;
        };
    }, [uid, formaPre, carga]); // `carga` muda só para refazer a leitura depois de um erro

    function tentarDeNovo() {
        setEstado({ tipo: 'carregando' });
        setCarga((n) => n + 1);
    }

    return { estado, tentarDeNovo };
}
