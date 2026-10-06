// Único arquivo de strings da home, da questão, do feedback e dos blocos (item 12).
// O dado guarda só o valor (confiança 1, 2, 3; quadrante 'firme', 'fragil'...). O texto que o
// aluno lê mora aqui, ligado a esse valor, então trocar um rótulo não altera dado nem análise.

import type { Confianca, Fase } from '../types/domain';
import type { Falta } from '../lib/pergunta';
import type { Quadrante } from '../lib/quadrante';
import { ORDEM_DE_REVISAO } from '../lib/resultado';
import type { Etapa } from '../lib/roteiro';

// Ordem em que os níveis aparecem na tela, do menor para o maior.
export const NIVEIS_DE_CONFIANCA: readonly Confianca[] = [1, 2, 3];

export const ROTULO_CONFIANCA: Record<Confianca, string> = {
    1: 'Palpite',
    2: 'Tenho dúvida',
    3: 'Tenho certeza',
};

export const ROTULO_QUADRANTE: Record<Quadrante, string> = {
    firme: 'Firme',
    fragil: 'Frágil',
    lacuna: 'Lacuna',
    ponto_cego: 'Ponto cego',
};

// Para contar: "1 ponto cego", "2 pontos cegos".
const QUADRANTE_NA_CONTAGEM: Record<Quadrante, { um: string; varios: string }> = {
    firme: { um: 'firme', varios: 'firmes' },
    fragil: { um: 'frágil', varios: 'frágeis' },
    lacuna: { um: 'lacuna', varios: 'lacunas' },
    ponto_cego: { um: 'ponto cego', varios: 'pontos cegos' },
};

export const DESCRICAO_QUADRANTE: Record<Quadrante, string> = {
    firme: 'Você sabe e sabe que sabe.',
    fragil: 'Acertou sem certeza. Vale revisar.',
    lacuna: 'Você já sabia que não sabia. É o que estudar.',
    ponto_cego: 'Errou achando que sabia. Corrija este primeiro.',
};

// Na prática, o título do bloco é o nome do tópico.
export const TITULO_DA_FASE: Record<Exclude<Fase, 'pratica'>, string> = {
    pre: 'Pré-teste',
    pos: 'Pós-teste',
    reteste: 'Reteste',
};

export const TEXTO_DA_FALTA: Record<Falta, string> = {
    alternativa_e_confianca: 'Escolha uma alternativa e diga quanto você confia.',
    alternativa: 'Falta escolher uma alternativa.',
    confianca: 'Falta dizer quanto você confia.',
};

export const TEXTOS = {
    perguntaDeConfianca: 'Quanto você confia?',
    confirmar: 'Confirmar',
    proxima: 'Próxima',
    concluir: 'Concluir',
    sairDoBloco: 'Sair do bloco',
    semFeedback: 'Sem resultado por questão: tudo aparece no fim do bloco.',
    acertou: 'Você acertou',
    errou: 'Você errou',
    respostaCerta: 'Resposta certa',
    blocoConcluido: 'Bloco concluído',
    blocoConcluidoDetalhe: 'Suas respostas foram gravadas.',
    praticaConcluida: 'Você já praticou todos os tópicos disponíveis.',
    voltarAoInicio: 'Voltar ao início',
    tentarDeNovo: 'Tentar de novo',
    erroAoCarregar: 'Não foi possível carregar as questões. Confira a conexão e tente de novo.',
    erroAoGravar: 'Não foi possível gravar a resposta. Confira a conexão e confirme de novo.',
    semConsentimento: 'Este bloco só abre depois do termo de consentimento.',
    blocoSemQuestoes: 'Este bloco não tem questões. O conteúdo foi carregado no banco?',
    continuarEstudos: 'Continuar estudos',
    proximaEtapa: 'Próxima etapa',
    trilhas: 'Trilhas',
    trilhaTravada: 'travada',
    erroAoCarregarRoteiro: 'Não foi possível carregar o seu roteiro. Confira a conexão e tente de novo.',
    sairDoCartao: 'Sair do cartão',
    voltar: 'Voltar',
    proximo: 'Próximo',
    comecarPratica: 'Começar a prática',
    abrindoPratica: 'Abrindo a prática',
    erroAoCarregarCartao: 'Não foi possível carregar o cartão. Confira a conexão e tente de novo.',
    resultado: 'Resultado',
    xpDoBloco: 'XP do bloco',
    comoVoceRespondeu: 'Como você respondeu',
    acertoPorTopico: 'Acerto por tópico',
    acertoPorConfianca: 'Acerto por confiança',
    revisarPrimeiro: 'O que revisar primeiro',
    nadaARevisar: 'Nada a revisar: tudo o que você respondeu está firme.',
    semRespostas: 'sem respostas',
} as const;

/** "8 de 12". */
export function formatarTaxa(acertos: number, total: number): string {
    return total === 0 ? TEXTOS.semRespostas : `${acertos} de ${total}`;
}

/** "Acertou 8 de 12". */
export function formatarAcertos(acertos: number, total: number): string {
    return `Acertou ${acertos} de ${total}`;
}

/** "2 pontos cegos · 1 lacuna": o que há para revisar, do mais urgente ao menos. Firme não entra. */
export function resumirQuadrantes(quadrantes: Record<Quadrante, number>): string {
    return ORDEM_DE_REVISAO.filter((q) => quadrantes[q] > 0)
        .map((q) => {
            const n = quadrantes[q];
            return `${n} ${n === 1 ? QUADRANTE_NA_CONTAGEM[q].um : QUADRANTE_NA_CONTAGEM[q].varios}`;
        })
        .join(' · ');
}

/** "2 de 6": a posição do slide dentro do cartão. */
export function posicaoNoCartao(indice: number, total: number): string {
    return `${indice + 1} de ${total}`;
}

/** A linha que diz, na home, em que ponto do roteiro o aluno está. */
export function descreverEtapa(etapa: Etapa, nomeDoTopico: string | null): string {
    switch (etapa.tipo) {
        case 'consentimento':
            return 'Falta aceitar o termo de consentimento.';
        case 'pre':
        case 'pos':
        case 'reteste':
            return `${TITULO_DA_FASE[etapa.tipo]} · ${etapa.respondidas} de ${etapa.total}`;
        case 'estudo':
            // Sem resposta de prática, o estudo do tópico começa pelo cartão (o mesmo corte de `destinoDaEtapa`).
            if (etapa.respondidas === 0) return nomeDoTopico ? `Cartão de ${nomeDoTopico}` : 'Cartão de conceito';
            return `${nomeDoTopico ? `Prática de ${nomeDoTopico}` : 'Prática'} · ${etapa.respondidas} de ${etapa.total}`;
        case 'espera':
            return etapa.diasRestantes === 1
                ? 'O reteste abre amanhã.'
                : `O reteste abre em ${etapa.diasRestantes} dias.`;
        case 'sus':
            return 'Falta o questionário final.';
        case 'concluido':
            return 'Você concluiu o roteiro.';
    }
}

/** "+3 XP", "−4 XP", "0 XP". O sinal de menos é o tipográfico (U+2212), que alinha com o de mais. */
export function formatarXp(xp: number): string {
    if (xp > 0) return `+${xp} XP`;
    if (xp < 0) return `−${Math.abs(xp)} XP`;
    return '0 XP';
}
