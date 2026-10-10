// Único arquivo de strings da home, da questão, do feedback e dos blocos (item 12).
// O dado guarda só o valor (confiança 1, 2, 3; quadrante 'firme', 'fragil'...). O texto que o
// aluno lê mora aqui, ligado a esse valor, então trocar um rótulo não altera dado nem análise.

import type { Confianca, Fase } from '../types/domain';
import type { EstadoDaLicao, EtapaDaLicao, SituacaoDaEtapa } from '../lib/licao';
import type { Falta } from '../lib/pergunta';
import type { Taxa } from '../lib/resultado';
import type { PreferenciaDeTema } from '../lib/tema';
import type { Quadrante } from '../lib/quadrante';
import { ORDEM_DE_REVISAO } from '../lib/resultado';
import { dataEmSaoLuis } from '../lib/roteiro';

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

// Dentro de uma lição, os mesmos blocos têm o nome do que fazem por ela (item 30). A fase
// gravada no dado não muda.
export const TITULO_DA_FASE_NA_LICAO: Record<Exclude<Fase, 'pratica'>, string> = {
    pre: 'Diagnóstico',
    pos: 'Verificação',
    reteste: 'Revisão',
};

export const TITULO_DA_ETAPA: Record<EtapaDaLicao, string> = {
    diagnostico: 'Diagnóstico',
    estudo: 'Cartão e prática',
    verificacao: 'Verificação',
    revisao: 'Revisão',
};

export const SITUACAO_DA_ETAPA: Record<SituacaoDaEtapa, string> = {
    feito: 'feito',
    agora: 'agora',
    espera: 'em espera',
    depois: 'depois',
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
    progressoDoBloco: 'Progresso no bloco',
    sair: 'Sair',
    paginaNaoExiste: 'Essa página não existe.',
    paginaNaoExisteDetalhe: 'O endereço pode ter mudado ou ter sido digitado errado.',
    comecar: 'Começar',
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
    semFeedbackNaLicao: 'Sem resultado por questão: tudo aparece no fim da lição.',
    fecharLicao: 'Fechar a lição',
    conferindoLicao: 'Conferindo a lição',
    licaoNaoExiste: 'Essa lição não existe.',
    erroAoCarregarLicao: 'Não foi possível carregar a lição. Confira a conexão e tente de novo.',
    termoAntesDoDiagnostico: 'Antes do diagnóstico, você lê e aceita o termo de participação.',
    reverCartao: 'Rever o cartão',
    verPratica: 'Ver a prática',
    revisaoDepoisDaVerificacao: '7 dias depois da verificação',
    diagnosticoFeito: 'Diagnóstico feito',
    diagnosticoFeitoDetalhe: 'O resultado aparece no fim da lição, ao lado da verificação.',
    irParaOCartao: 'Ir para o cartão',
    fazerVerificacao: 'Fazer a verificação',
    voltarParaALicao: 'Voltar para a lição',
    verificacaoFeita: 'Verificação feita',
    licaoConcluida: 'Lição concluída',
    xpDaLicao: 'XP da lição',
    licoes: 'Lições',
    perfil: 'Perfil',
    progresso: 'Progresso',
    semRespostasAVista: 'Ainda não há respostas para mostrar.',
    quandoOsNumerosAparecem: 'Os números aparecem quando você termina a prática ou a verificação de uma lição.',
    xpTotal: 'XP total',
    sequencia: 'Sequência',
    meuDominio: 'Meu domínio',
    historico: 'Histórico',
    revisarNaPratica: 'O que revisar na prática',
    abrirALicao: 'Abrir a lição',
    progressoDaLicao: 'Domínio da lição',
    emailDaConta: 'E-mail da conta',
    aparencia: 'Aparência',
    salvarAlteracoes: 'Salvar alterações',
    alteracoesSalvas: 'Alterações salvas.',
    termoAindaNaoAceito: 'O termo de participação aparece antes do seu primeiro diagnóstico.',
    paraHoje: 'Para hoje',
    licaoNova: 'Lição nova',
    tudoEmDia: 'Tudo em dia',
    todasAsLicoesConcluidas: 'Você concluiu todas as lições.',
    revisoesAgendadas: 'Revisões agendadas',
    outrasLicoes: 'Outras lições',
    erroAoCarregarLicoes: 'Não foi possível carregar as lições. Confira a conexão e tente de novo.',
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

/** "Sequência: 3 dias", para o selo da home. */
export function formatarSequencia(dias: number): string {
    return `Sequência: ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

/** "dia seguido" ou "dias seguidos", sob o número grande da tela da sequência. */
export function diasSeguidos(dias: number): string {
    return dias === 1 ? 'dia seguido' : 'dias seguidos';
}

/** "3 questões", "1 questão". */
export function contarQuestoes(n: number): string {
    return `${n} ${n === 1 ? 'questão' : 'questões'}`;
}

/** O que o botão principal da lição diz em cada estado. */
export function rotuloDoBotaoDaLicao(estado: EstadoDaLicao): string {
    switch (estado.tipo) {
        case 'diagnostico':
            return 'Continuar o diagnóstico';
        case 'estudo':
            return estado.respondidas === 0 ? 'Abrir o cartão' : 'Continuar a prática';
        case 'verificacao':
            return estado.respondidas === 0 ? TEXTOS.fazerVerificacao : 'Continuar a verificação';
        case 'revisao':
            return estado.respondidas === 0 ? 'Fazer a revisão' : 'Continuar a revisão';
        default:
            return TEXTOS.comecar;
    }
}

/** A situação de uma lição, para a lista: "Nova", "Em andamento", "Revisão em 5 dias"... */
export function situacaoDaLicao(estado: EstadoDaLicao): string {
    switch (estado.tipo) {
        case 'nova':
            return 'Nova';
        case 'aguardando_revisao':
            return estado.diasRestantes === 1 ? 'Revisão amanhã' : `Revisão em ${estado.diasRestantes} dias`;
        case 'revisao':
            return 'Revisão disponível';
        case 'concluida':
            return 'Concluída';
        default:
            return 'Em andamento';
    }
}

/** "em 5 dias", "amanhã": quanto falta para uma revisão abrir. */
export function emQuantosDias(diasRestantes: number): string {
    return diasRestantes === 1 ? 'amanhã' : `em ${diasRestantes} dias`;
}

/** "Próxima revisão: Framework MDA, em 5 dias.": o Para hoje de quem está em dia. */
export function proximaRevisao(titulo: string, diasRestantes: number): string {
    return `Próxima revisão: ${titulo}, ${emQuantosDias(diasRestantes)}.`;
}

/** O título do Para hoje: a revisão leva o nome do que é; nos outros casos, o da lição. */
export function tituloDaSugestao(titulo: string, estado: EstadoDaLicao): string {
    return estado.tipo === 'revisao' ? `Revisão de ${titulo}` : titulo;
}

/** A linha sob o título do Para hoje: "Lição nova", "Cartão e prática · 1 de 2", "3 questões". */
export function detalheDaSugestao(estado: EstadoDaLicao): string {
    switch (estado.tipo) {
        case 'diagnostico':
        case 'estudo':
        case 'verificacao': {
            const etapa = TITULO_DA_ETAPA[estado.tipo];
            return estado.respondidas === 0 ? etapa : `${etapa} · ${formatarTaxa(estado.respondidas, estado.total)}`;
        }
        case 'revisao':
            return estado.respondidas === 0 ? contarQuestoes(estado.total) : formatarTaxa(estado.respondidas, estado.total);
        default:
            return TEXTOS.licaoNova;
    }
}

/** "3 de 9 feitas": o resumo do atalho Lições. Feita é a lição que já passou da verificação. */
export function licoesFeitas(feitas: number, total: number): string {
    return `${feitas} de ${total} ${feitas === 1 ? 'feita' : 'feitas'}`;
}

// As três opções de tema do Perfil. O valor guardado no aparelho é a chave, e não o rótulo.
export const ROTULO_DO_TEMA: Record<PreferenciaDeTema, string> = {
    sistema: 'Do sistema',
    claro: 'Claro',
    escuro: 'Escuro',
};

// O nome de cada fase quando ela aparece como passo feito, no histórico do tópico.
export const TITULO_DO_PASSO_FEITO: Record<Fase, string> = {
    pre: 'Diagnóstico',
    pratica: 'Prática',
    pos: 'Verificação',
    reteste: 'Revisão',
};

/** "Diagnóstico · 08/10": um passo do histórico, com o dia em que terminou (fuso de São Luís). */
export function passoFeitoEm(fase: Fase, em: number): string {
    return `${TITULO_DO_PASSO_FEITO[fase]} · ${diaEMes(dataEmSaoLuis(em))}`;
}

/** "3 dias", "1 dia": a sequência, quando o rótulo ao lado já diz o que é. */
export function contarDias(dias: number): string {
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

/** "domínio 5 de 7": o acerto simples no tópico, em contagem (item 14). */
export function dominioEmContagem(dominio: Taxa): string {
    return `domínio ${formatarTaxa(dominio.acertos, dominio.total)}`;
}

/** "Abre amanhã", "Abre em 5 dias": a revisão em espera, na linha da etapa. */
export function contagemDaRevisao(diasRestantes: number): string {
    return diasRestantes === 1 ? 'Abre amanhã' : `Abre em ${diasRestantes} dias`;
}

/**
 * O detalhe de uma linha da página da lição: o tamanho da etapa ou, na etapa em andamento, onde
 * a pessoa parou. A revisão que ainda não abriu diz quando abre.
 */
export function detalheDaEtapa(etapa: EtapaDaLicao, total: number, estado: EstadoDaLicao): string {
    if (etapa === 'revisao') {
        if (estado.tipo === 'aguardando_revisao') return contagemDaRevisao(estado.diasRestantes);
        if (estado.tipo !== 'revisao' && estado.tipo !== 'concluida') return TEXTOS.revisaoDepoisDaVerificacao;
    }
    const daVez = { diagnostico: 'diagnostico', estudo: 'estudo', verificacao: 'verificacao', revisao: 'revisao' } as const;
    if (estado.tipo === daVez[etapa] && estado.respondidas > 0) return formatarTaxa(estado.respondidas, estado.total);
    return contarQuestoes(total);
}

/** "Antes 1 de 3 → Depois 3 de 3": o diagnóstico ao lado da verificação. */
export function antesEDepois(antes: Taxa, depois: Taxa): string {
    return `Antes ${formatarTaxa(antes.acertos, antes.total)} → Depois ${formatarTaxa(depois.acertos, depois.total)}`;
}

/** "Na verificação 3 de 3 → Hoje 2 de 3": o que ficou, 7 dias depois. */
export function verificacaoEHoje(depois: Taxa, revisao: Taxa): string {
    return `Na verificação ${formatarTaxa(depois.acertos, depois.total)} → Hoje ${formatarTaxa(revisao.acertos, revisao.total)}`;
}

/** "Você acertou 5 de 6 questões de UX/UI em jogos · +13 XP": o fim de um tópico da trilha. */
export function acertosDoTopico(acertos: number, total: number, topico: string, xp: number): string {
    return `Você acertou ${acertos} de ${total} questões de ${topico} · ${formatarXp(xp)}`;
}

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const diaEMes = (d: { dia: number; mes: number }) => `${doisDigitos(d.dia)}/${doisDigitos(d.mes)}`;
// Sábado e domingo são masculinos; os outros dias, femininos (a segunda, a terça...).
const noOuNa = (diaDaSemana: number) => (diaDaSemana === 0 || diaDaSemana === 6 ? 'no' : 'na');

/** "Termo de participação aceito em 06/10/2026." Data no fuso de São Luís. */
export function termoAceitoEm(consentiuEm: number): string {
    const dia = dataEmSaoLuis(consentiuEm);
    return `Termo de participação aceito em ${diaEMes(dia)}/${dia.ano}.`;
}

/** "A revisão abre na sexta, 16/10." Data no fuso de São Luís. */
export function quandoARevisaoAbre(liberaEm: number): string {
    const abre = dataEmSaoLuis(liberaEm);
    return `A revisão abre ${noOuNa(abre.diaDaSemana)} ${DIAS_DA_SEMANA[abre.diaDaSemana]}, ${diaEMes(abre)}.`;
}

/** "+3 XP", "−4 XP", "0 XP". O sinal de menos é o tipográfico (U+2212), que alinha com o de mais. */
export function formatarXp(xp: number): string {
    if (xp > 0) return `+${xp} XP`;
    if (xp < 0) return `−${Math.abs(xp)} XP`;
    return '0 XP';
}

/** "XP: +18", para o selo da home. O total tem piso em 0 (item 14), então nunca sai negativo. */
export function formatarXpTotal(xp: number): string {
    return xp > 0 ? `XP: +${xp}` : 'XP: 0';
}

// Tela de login: a chamada da marca e os campos (item 28).
export const TEXTOS_DO_LOGIN = {
    logo: 'Logo da Beast Maragames',
    marca: 'Beast Maragames',
    chamada: 'Pronto pra soltar a fera?',
    convite: 'Entre para começar o desafio de hoje.',
    email: 'E-mail',
    exemploDeEmail: 'voce@exemplo.com',
    senha: 'Senha',
    dicaDaSenha: 'Mínimo 8 caracteres',
    entrar: 'Entrar',
    entrarComGoogle: 'Continuar com Google',
    semConta: 'Ainda não tem conta?',
    criarConta: 'Criar agora',
    erroAoEntrar: 'Não foi possível entrar. Tente de novo.',
} as const;
