// Texto do termo de participação (itens 19 e 30) e os textos da tela que o mostra.
// Revisto em 11/10/2026 para o ciclo da lição: saiu a descrição do roteiro do piloto.
// Revisto em 12/10/2026 (item 34): os dados novos do perfil, as notas por área e a idade mínima.
// Revisto em 15/10/2026 (passo 4 do plano até o piloto, item 24): para que serve cada dado, onde
// fica, até quando, o que a pessoa pode pedir, riscos e benefícios, e a data da versão.
// Fica separado de textos.ts porque é um documento, não rótulo de interface: mudar uma frase
// aqui muda o que o participante aceitou.

/** A data desta versão do texto, mostrada no topo: diz que termo cada pessoa aceitou. */
export const VERSAO_DO_TERMO = '15/10/2026';

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
            'nome, apelido, e-mail, telefone, faixa etária, sexo, cidade e estado, situação de estudo, ' +
            'instituição e curso (se você estuda) e experiência em criar jogos. Se você responder, ' +
            'também as perguntas opcionais de "Sobre você e os jogos". Ficam gravadas ainda a nota que ' +
            'você se dá em cada área e a data em que você aceitou este termo. No sexo, há a opção ' +
            '"Prefiro não informar".',
    },
    {
        titulo: 'Por que pedimos esses dados',
        texto:
            'A faixa etária e o sexo servem para ver se o resultado muda entre grupos de pessoas, ' +
            'sempre em conjunto: de um grupo com menos de 5 pessoas, os relatórios mostram só quantas ' +
            'pessoas ele tem, e nenhum resultado. A faixa etária também confirma que você tem 18 anos ' +
            'ou mais. Cidade, estado, situação de estudo, instituição, curso e experiência servem para ' +
            'descrever quem participou. O e-mail é ' +
            'o da sua conta, para entrar e recuperar a senha. O telefone é para o grupo falar com você ' +
            'sobre o estudo, por exemplo para lembrar de uma revisão.',
    },
    {
        titulo: 'Como os dados são usados',
        texto:
            'Na análise do artigo e da apresentação da disciplina e num relatório para a Beast Maragames. ' +
            'Os resultados aparecem em conjunto. Nos arquivos que saem do grupo, seu nome, seu contato e ' +
            'sua cidade são trocados por um código. O relatório da Beast Maragames mostra só números da ' +
            'turma, sem nenhum dado seu. A Beast Maragames só manda mensagens para você se você aceitar, ' +
            'numa caixa à parte, e você pode desmarcá-la no Perfil.',
    },
    {
        titulo: 'Onde ficam e até quando',
        texto:
            'Os dados ficam no Firebase, um serviço do Google, que pode guardá-los em servidores fora do ' +
            'Brasil. Só o grupo tem acesso a eles. Nome, e-mail e telefone ficam até o fim do segundo ' +
            'semestre de 2026, para a análise e o artigo; depois, o grupo os apaga, e fica só o que tem ' +
            'código. Você pode pedir para ver o que foi gravado sobre você ou para apagar tudo.',
    },
    {
        titulo: 'Riscos e benefícios',
        texto:
            'O risco é pequeno: o tempo que você dedica e algum desconforto ao errar. Nenhuma resposta ' +
            'vale nota. Em troca, você estuda o conteúdo e acompanha o próprio progresso.',
    },
    {
        titulo: 'A participação é voluntária',
        texto:
            'Não vale nota e não há resposta que prejudique você. Você pode parar quando quiser. ' +
            'Para tirar dúvidas, sair do estudo ou pedir que seus dados sejam apagados, use o contato ' +
            'do grupo, que está no Perfil, na seção Sobre.',
    },
];

export const TEXTOS_DO_TERMO = {
    titulo: 'Termo de consentimento',
    versao: `Versão de ${VERSAO_DO_TERMO}`,
    concordo: 'Li e concordo em participar',
    aceitar: 'Aceitar e começar',
    agoraNao: 'Agora não',
    fechar: 'Fechar',
    erroAoAceitar: 'Não foi possível registrar o seu aceite. Confira a conexão e tente de novo.',
} as const;
