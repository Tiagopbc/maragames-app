// Texto do termo de consentimento do piloto (item 19) e os textos da tela que o mostra.
// RASCUNHO: o conteúdo ainda precisa da revisão do grupo antes da sessão 1.
// Fica separado de textos.ts porque é um documento, não rótulo de interface: mudar uma frase
// aqui muda o que o participante aceitou.

export interface SecaoDoTermo {
    titulo: string;
    texto: string;
}

export const TERMO: readonly SecaoDoTermo[] = [
    {
        titulo: 'O que é este estudo',
        texto:
            'Este app é um piloto feito por Tiago Cavalcanti, Francisco André Santos e Jadson Câmara, ' +
            'alunos da UNDB, na disciplina de Programação Mobile, em parceria com a Beast Maragames. ' +
            'Queremos saber se dizer o quanto você confia em cada resposta ajuda a medir o que foi aprendido.',
    },
    {
        titulo: 'O que você vai fazer',
        texto:
            'Hoje, em cerca de 30 minutos: um teste inicial, o estudo de quatro tópicos com prática e um ' +
            'teste final. Daqui a 7 dias, em cerca de 10 minutos: um novo teste e um questionário curto ' +
            'sobre o app. Nos testes, o resultado só aparece no fim. Entre os dois encontros há um ' +
            'tópico novo por dia, que é opcional.',
    },
    {
        titulo: 'O que fica gravado',
        texto:
            'De cada resposta: a alternativa escolhida, se estava certa, a confiança que você declarou, ' +
            'o tempo que levou e o horário. Do seu perfil: nome, apelido, e-mail, telefone, instituição, ' +
            'curso e experiência com games.',
    },
    {
        titulo: 'Como os dados são usados',
        texto:
            'Na análise do artigo e da apresentação da disciplina e num relatório para a Beast Maragames. ' +
            'Os resultados aparecem em conjunto. Nos arquivos que saem do grupo, seu nome e seu contato ' +
            'são trocados por um código.',
    },
    {
        titulo: 'A participação é voluntária',
        texto:
            'Não vale nota e não há resposta que prejudique você. Você pode parar quando quiser. ' +
            'Para tirar dúvidas ou sair do estudo, fale com qualquer integrante do grupo.',
    },
];

export const TEXTOS_DO_TERMO = {
    titulo: 'Termo de consentimento',
    concordo: 'Li e concordo em participar',
    aceitar: 'Aceitar e começar',
    agoraNao: 'Agora não',
    erroAoAceitar: 'Não foi possível registrar o seu aceite. Confira a conexão e tente de novo.',
} as const;
