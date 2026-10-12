// Texto do termo de participação (itens 19 e 30) e os textos da tela que o mostra.
// Revisto em 11/10/2026 para o ciclo da lição: saiu a descrição do roteiro do piloto.
// Revisto em 12/10/2026 (item 34): os dados novos do perfil, as notas por área e a idade mínima.
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
            'Este app foi feito por Tiago Cavalcanti, Francisco André Santos e Jadson Câmara, ' +
            'alunos da UNDB, na disciplina de Programação Mobile, em parceria com a Beast Maragames. ' +
            'Além de ensinar, ele serve a um estudo: queremos saber se dizer o quanto você confia em ' +
            'cada resposta ajuda a medir o que foi aprendido. O app é para quem tem 18 anos ou mais.',
    },
    {
        titulo: 'O que você vai fazer',
        texto:
            'Antes da primeira lição, você dá uma nota de 1 a 5 para o quanto acha que já sabe de ' +
            'cada área. Depois, você escolhe as lições e a ordem. Cada lição começa com um diagnóstico de 3 questões, ' +
            'segue com um cartão de conceito e questões de prática e termina com uma verificação de ' +
            '3 questões. Depois de 7 dias, a lição abre uma revisão, também de 3 questões. Em cada ' +
            'questão você escolhe uma alternativa e diz quanto confia nela. Na prática, a resposta ' +
            'certa aparece na hora. No diagnóstico, na verificação e na revisão, o resultado só ' +
            'aparece no fim, e o do diagnóstico, só no fim da lição.',
    },
    {
        titulo: 'O que fica gravado',
        texto:
            'De cada resposta: a alternativa escolhida, se estava certa, a confiança que você declarou, ' +
            'o tempo que levou, o horário e se você estava no navegador ou no celular. Do seu perfil: ' +
            'nome, apelido, e-mail, telefone, faixa etária, cidade e estado, situação de estudo, ' +
            'instituição e curso (se você estuda) e experiência em criar jogos. Se você responder, ' +
            'também as perguntas opcionais de "Sobre você e os jogos". Ficam gravadas ainda a nota que ' +
            'você se dá em cada área e a data em que você aceitou este termo.',
    },
    {
        titulo: 'Como os dados são usados',
        texto:
            'Na análise do artigo e da apresentação da disciplina e num relatório para a Beast Maragames. ' +
            'Os resultados aparecem em conjunto. Nos arquivos que saem do grupo, seu nome, seu contato e ' +
            'sua cidade são trocados por um código. A Beast Maragames só manda mensagens para você se ' +
            'você aceitar, numa caixa à parte, e você pode desmarcá-la no Perfil.',
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
    fechar: 'Fechar',
    erroAoAceitar: 'Não foi possível registrar o seu aceite. Confira a conexão e tente de novo.',
} as const;
