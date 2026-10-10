// Todas as lições do aluno, para a lista de lições, a home e o Progresso (item 30): lê conteúdo
// e respostas pelo repositório e entrega tudo às funções puras de `src/lib`. Nada é guardado:
// cada recarga recalcula a partir de `answers`.

import { useCallback, useRef, useState } from 'react';

import { repositorio } from '@/data/repositorio';
import { dominioPorTopico, type Dominio } from '@/lib/dominio';
import { licoesDoAluno, respostasAVista, resultadoDaLicao, type Licao, type ResultadoDaLicao } from '@/lib/licao';
import { sugestaoDoDia, type Sugestao } from '@/lib/sugestao';
import { sequenciaDeDias } from '@/lib/sequencia';
import { xpDasLicoes } from '@/lib/xp';
import type { Answer, FormaPre, Question } from '@/types/domain';

export interface EntradaDasLicoesDoAluno {
    uid: string;
    formaPre: FormaPre | null; // users/{uid}.formaPre; null enquanto o termo não foi aceito
    relogio?: () => number; // ms; trocável em teste. Precisa ser sempre a mesma função.
}

export interface LicaoDoAluno extends Licao {
    titulo: string;
    modulo: string | null;
    dominio: Dominio | null; // só do que já pode aparecer; null enquanto não há resposta à vista
    resultado: ResultadoDaLicao | null;
}

export type EstadoDasLicoes =
    | { tipo: 'carregando' }
    | { tipo: 'erro' }
    | {
          tipo: 'pronto';
          licoes: LicaoDoAluno[]; // na ordem sugerida do conteúdo
          sugestao: Sugestao; // o passo único do "Para hoje"
          xp: number | null; // total à vista; null enquanto nada conta (item 14)
          sequencia: number; // dias seguidos com resposta
          aVista: Answer[]; // as respostas que já podem virar número na tela
          respostas: Answer[]; // todas, para o que não é número: o histórico de passos feitos
          questoes: Question[]; // para dar enunciado ao que a prática deixa citar
      };

export function useLicoes({ uid, formaPre, relogio = Date.now }: EntradaDasLicoesDoAluno) {
    const [estado, setEstado] = useState<EstadoDasLicoes>({ tipo: 'carregando' });
    const ultimaCarga = useRef(0);

    /**
     * Lê de novo e recalcula as lições. O hook não carrega sozinho: quem chama é a tela, toda
     * vez que ganha foco, para tudo já estar atualizado quando o aluno volta de uma lição.
     */
    const recarregar = useCallback(async () => {
        const carga = ++ultimaCarga.current;
        // Depois de um erro volta o indicador; fora isso, o estado anterior fica na tela até o novo chegar.
        setEstado((atual) => (atual.tipo === 'erro' ? { tipo: 'carregando' } : atual));

        let novo: EstadoDasLicoes;
        try {
            const [topicos, questoes, respostas] = await Promise.all([
                repositorio.getTopicos(),
                repositorio.getQuestoes(),
                repositorio.getRespostas(uid),
            ]);
            const agora = relogio();
            // A ordem sugerida é a dos tópicos, que o repositório já entrega pronta.
            const licoes = licoesDoAluno({ topicos: topicos.map((t) => t.id), respostas, questoes, formaPre, agora });
            const aVista = respostasAVista(respostas, licoes);
            const dominios = dominioPorTopico(aVista);

            novo = {
                tipo: 'pronto',
                licoes: licoes.map((licao) => {
                    const topico = topicos.find((t) => t.id === licao.topicId)!;
                    return {
                        ...licao,
                        titulo: topico.titulo,
                        modulo: topico.modulo,
                        dominio: dominios[licao.topicId] ?? null,
                        resultado: resultadoDaLicao({ licao, respostas, questoes, formaPre }),
                    };
                }),
                sugestao: sugestaoDoDia(licoes),
                xp: xpDasLicoes(respostas, licoes),
                sequencia: sequenciaDeDias(respostas, agora),
                aVista,
                respostas,
                questoes,
            };
        } catch (e) {
            console.warn('Não foi possível ler as lições.', e);
            novo = { tipo: 'erro' };
        }

        // Se outra recarga começou depois desta, é o resultado dela que vale.
        if (carga === ultimaCarga.current) setEstado(novo);
    }, [uid, formaPre, relogio]);

    return { estado, recarregar };
}
