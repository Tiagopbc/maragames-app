// Estado de um bloco de questões: carrega o conteúdo e o que já foi respondido, acha ou cria a
// tentativa, mede o tempo de resposta, grava cada confirmação e avança.
// É a única parte da tela da pergunta que fala com o repositório; as regras ficam em src/lib.

import { useEffect, useRef, useState } from 'react';

import { TEXTOS, TITULO_DA_FASE } from '@/constants/textos';
import { repositorio } from '@/data/repositorio';
import {
    pendentes,
    proximoTopicoDaPratica,
    questoesDaPratica,
    questoesDoBlocoMedido,
    topicosDaTrilha,
} from '@/lib/bloco';
import { ordemDasAlternativas } from '@/lib/embaralhar';
import {
    faseTemFeedback,
    feedbackDaResposta,
    montarResposta,
    type Feedback,
    type SelecaoCompleta,
} from '@/lib/pergunta';
import { resultadoDoBloco, type RespostaDoResultado, type ResultadoDoBloco } from '@/lib/resultado';
import type { Alternativa, Fase, FormaPre, Question } from '@/types/domain';

export interface EntradaDoBloco {
    uid: string;
    fase: Fase;
    topicId: string | null; // só na prática; null abre o primeiro tópico com questão pendente
    formaPre: FormaPre | null; // só nos blocos medidos; null enquanto não há consentimento
    relogio?: () => number; // ms; trocável em teste. Precisa ser sempre a mesma função.
}

export interface PerguntaAtual {
    questao: Question;
    alternativas: Alternativa[]; // na ordem em que aparecem na tela
    posicao: number; // 1 = primeira questão do bloco, contando as já respondidas antes
    total: number;
    ultima: boolean;
}

// O que a tela de resultado precisa: os números e os textos para dar nome ao que eles citam.
export interface Relatorio {
    resultado: ResultadoDoBloco;
    enunciados: Record<string, string>; // por id de questão
    nomesDosTopicos: Record<string, string>; // por id de tópico
    // O tópico, quando o bloco é a prática de um tópico da trilha diária: o fim dele é a tela
    // da sequência, e não o resultado detalhado (item 23).
    topicoDaTrilha: string | null;
}

export type EstadoDoBloco =
    | { tipo: 'carregando' }
    | { tipo: 'erro'; mensagem: string; podeTentarDeNovo: boolean }
    | { tipo: 'pergunta'; pergunta: PerguntaAtual; gravando: boolean; erroAoGravar: boolean }
    | { tipo: 'feedback'; pergunta: PerguntaAtual; resposta: SelecaoCompleta; feedback: Feedback }
    // `relatorio` é null quando não houve bloco (prática sem tópico pendente): só a mensagem aparece.
    | { tipo: 'concluido'; mensagem: string; relatorio: Relatorio | null };

// O que não muda a tela fica em ref: a fila de questões e a tentativa em que elas são gravadas.
interface Sessao {
    attemptId: string;
    fila: Question[]; // questões ainda sem resposta quando o bloco abriu
    indice: number;
    total: number; // todas as questões do bloco, respondidas ou não
    bloco: Question[]; // o bloco inteiro, para o resultado do fim
    respostas: RespostaDoResultado[]; // as desta fase: as já gravadas antes mais as desta sessão
    nomesDosTopicos: Record<string, string>;
    topicoDaTrilha: string | null;
}

interface Controle {
    inicio: number; // quando a questão atual apareceu
    tempoMs: number | null; // medido na primeira confirmação; repetir depois de uma falha não o altera
    falhou: boolean; // a gravação desta questão já falhou alguma vez
    ocupado: boolean; // barra o toque duplo antes de a tela redesenhar
}

function perguntaDe(s: Sessao, uid: string, fase: Fase): PerguntaAtual {
    const questao = s.fila[s.indice];
    const ordem = ordemDasAlternativas(
        uid,
        questao.id,
        fase,
        questao.alternativas.map((a) => a.id)
    );
    return {
        questao,
        alternativas: ordem.map((id) => questao.alternativas.find((a) => a.id === id)!),
        posicao: s.total - s.fila.length + s.indice + 1,
        total: s.total,
        ultima: s.indice === s.fila.length - 1,
    };
}

// O resultado sai das respostas que a tela já tem em mãos, sem ler o banco de novo.
function relatorioDe(s: Pick<Sessao, 'bloco' | 'respostas' | 'nomesDosTopicos' | 'topicoDaTrilha'>): Relatorio {
    return {
        resultado: resultadoDoBloco(s.respostas, s.bloco),
        enunciados: Object.fromEntries(s.bloco.map((q) => [q.id, q.enunciado])),
        nomesDosTopicos: s.nomesDosTopicos,
        topicoDaTrilha: s.topicoDaTrilha,
    };
}

export function useBloco({ uid, fase, topicId, formaPre, relogio = Date.now }: EntradaDoBloco) {
    const [estado, setEstado] = useState<EstadoDoBloco>({ tipo: 'carregando' });
    const [titulo, setTitulo] = useState('');
    const [carga, setCarga] = useState(0);
    const sessao = useRef<Sessao | null>(null);
    const controle = useRef<Controle>({ inicio: 0, tempoMs: null, falhou: false, ocupado: false });

    useEffect(() => {
        let ativa = true; // a tela pode fechar antes de a leitura voltar

        async function carregar() {
            const [topicos, questoes, respostas] = await Promise.all([
                repositorio.getTopicos(),
                repositorio.getQuestoes(),
                repositorio.getRespostas(uid),
            ]);

            let doBloco: Question[];
            let nome: string;
            let topicoDaTrilha: string | null = null;
            if (fase === 'pratica') {
                const alvo =
                    topicId ??
                    proximoTopicoDaPratica(
                        questoes,
                        respostas,
                        topicos.map((t) => t.id)
                    );
                if (alvo === null) {
                    return { tipo: 'concluido', mensagem: TEXTOS.praticaConcluida, relatorio: null } as const;
                }
                doBloco = questoesDaPratica(questoes, alvo);
                nome = topicos.find((t) => t.id === alvo)?.titulo ?? '';
                const daTrilha = topicosDaTrilha(
                    questoes,
                    topicos.map((t) => t.id)
                );
                if (daTrilha.includes(alvo)) topicoDaTrilha = alvo;
            } else {
                if (formaPre === null) {
                    return { tipo: 'erro', mensagem: TEXTOS.semConsentimento, podeTentarDeNovo: false } as const;
                }
                doBloco = questoesDoBlocoMedido(
                    questoes,
                    fase,
                    topicos.map((t) => t.id),
                    formaPre
                );
                nome = TITULO_DA_FASE[fase];
            }
            // Bloco vazio não é bloco concluído: seria pular a medição sem ninguém perceber.
            if (doBloco.length === 0) {
                return { tipo: 'erro', mensagem: TEXTOS.blocoSemQuestoes, podeTentarDeNovo: false } as const;
            }

            const base = {
                bloco: doBloco,
                respostas: respostas.filter((r) => r.fase === fase) as RespostaDoResultado[],
                nomesDosTopicos: Object.fromEntries(topicos.map((t) => [t.id, t.titulo])),
                topicoDaTrilha,
            };

            // Bloco já concluído: reabrir mostra o resultado, recalculado das respostas.
            const fila = pendentes(doBloco, respostas, fase);
            if (fila.length === 0) {
                return {
                    tipo: 'concluido',
                    mensagem: TEXTOS.blocoConcluidoDetalhe,
                    relatorio: relatorioDe(base),
                } as const;
            }

            // A prática pertence à lição do tópico; os blocos medidos atravessam os tópicos.
            const lessonId = fase === 'pratica' ? doBloco[0].lessonId : null;
            const tentativa =
                (await repositorio.getAttemptEmAndamento(uid, fase, lessonId)) ??
                (await repositorio.criarAttempt(uid, fase, lessonId));

            const sessao: Sessao = { attemptId: tentativa.id, fila, indice: 0, total: doBloco.length, ...base };
            return { tipo: 'aberto', nome, sessao } as const;
        }

        carregar()
            .then((resultado) => {
                if (!ativa) return;
                if (resultado.tipo !== 'aberto') {
                    setEstado(resultado);
                    return;
                }
                sessao.current = resultado.sessao;
                setTitulo(resultado.nome);
                setEstado({
                    tipo: 'pergunta',
                    pergunta: perguntaDe(resultado.sessao, uid, fase),
                    gravando: false,
                    erroAoGravar: false,
                });
            })
            .catch((e) => {
                console.warn('Não foi possível abrir o bloco.', e);
                if (ativa) setEstado({ tipo: 'erro', mensagem: TEXTOS.erroAoCarregar, podeTentarDeNovo: true });
            });

        return () => {
            ativa = false;
        };
    }, [uid, fase, topicId, formaPre, carga]); // `carga` muda só para refazer a leitura depois de um erro

    // O cronômetro começa quando a questão aparece na tela, e não quando os dados chegam.
    // Relógio corrido: se a pessoa sair do app com a questão aberta, esse tempo entra na conta.
    const questaoNaTela = estado.tipo === 'pergunta' ? estado.pergunta.questao.id : null;
    useEffect(() => {
        if (questaoNaTela === null) return;
        controle.current = { inicio: relogio(), tempoMs: null, falhou: false, ocupado: false };
    }, [questaoNaTela, relogio]);

    async function seguir(s: Sessao) {
        if (s.indice + 1 < s.fila.length) {
            s.indice += 1;
            setEstado({ tipo: 'pergunta', pergunta: perguntaDe(s, uid, fase), gravando: false, erroAoGravar: false });
            return;
        }
        try {
            await repositorio.concluirAttempt(s.attemptId);
        } catch (e) {
            // As respostas já estão gravadas e é delas que o progresso sai; a tentativa
            // aberta não segura o aluno.
            console.warn('Não foi possível fechar a tentativa.', e);
        }
        setEstado({ tipo: 'concluido', mensagem: TEXTOS.blocoConcluidoDetalhe, relatorio: relatorioDe(s) });
    }

    /** Grava a resposta. Só é chamada com as duas seleções feitas; não existe confirmar em branco. */
    async function confirmar(selecao: SelecaoCompleta) {
        const s = sessao.current;
        const c = controle.current;
        if (estado.tipo !== 'pergunta' || !s || c.ocupado) return;
        c.ocupado = true;

        const { pergunta } = estado;
        const { questao } = pergunta;
        c.tempoMs ??= relogio() - c.inicio;
        setEstado({ tipo: 'pergunta', pergunta, gravando: true, erroAoGravar: false });

        try {
            // Depois de uma falha, o evento pode ter sido gravado mesmo assim (a resposta entrou e a
            // atualização da tentativa caiu). Como `answers` é imutável, vale o que já está lá.
            const jaGravada = c.falhou
                ? (await repositorio.getRespostas(uid)).find((r) => r.questionId === questao.id && r.fase === fase)
                : undefined;
            const resposta: SelecaoCompleta = jaGravada
                ? { escolha: jaGravada.escolha, confianca: jaGravada.confianca }
                : selecao;

            if (!jaGravada) {
                await repositorio.registrarResposta(
                    montarResposta({
                        uid,
                        attemptId: s.attemptId,
                        fase,
                        questao,
                        ordemExibida: pergunta.alternativas.map((a) => a.id),
                        tempoMs: c.tempoMs,
                        ...selecao,
                    })
                );
            }

            const feedback = feedbackDaResposta(questao, resposta);
            // Entra na conta do resultado do fim do bloco.
            s.respostas.push({
                questionId: questao.id,
                topicId: questao.topicId,
                correta: feedback.correta,
                confianca: resposta.confianca,
            });

            // O feedback só aparece com o evento gravado: ver o gabarito antes permitiria responder de novo.
            if (faseTemFeedback(fase)) {
                setEstado({ tipo: 'feedback', pergunta, resposta, feedback });
            } else {
                await seguir(s);
            }
        } catch (e) {
            console.warn('Não foi possível gravar a resposta.', e);
            c.falhou = true;
            setEstado({ tipo: 'pergunta', pergunta, gravando: false, erroAoGravar: true });
        } finally {
            c.ocupado = false;
        }
    }

    /** Sai do feedback para a próxima questão, ou encerra o bloco se era a última. */
    async function avancar() {
        const s = sessao.current;
        const c = controle.current;
        if (estado.tipo !== 'feedback' || !s || c.ocupado) return;
        c.ocupado = true;
        try {
            await seguir(s);
        } finally {
            c.ocupado = false;
        }
    }

    function tentarDeNovo() {
        setEstado({ tipo: 'carregando' });
        setCarga((n) => n + 1);
    }

    return { estado, titulo, confirmar, avancar, tentarDeNovo };
}
