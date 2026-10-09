// Só a fase diz o que a resposta mede: a mesma questão é pré-teste para metade dos
// participantes e pós-teste para a outra, e o reteste repete as questões do pós.
export type Fase = 'pre' | 'pratica' | 'pos' | 'reteste';

// Valor gravado no evento. Os rótulos ("Palpite", "Tenho dúvida", "Tenho certeza") ficam só na tela.
export type Confianca = 1 | 2 | 3;

// Forma que o participante faz no pré-teste; a outra fica para o pós e o reteste.
export type FormaPre = 'A' | 'B';

export interface Attempt {
    id: string;
    uid: string;
    fase: Fase; // não muda depois de criada
    lessonId: string | null; // null nos blocos pré, pós e reteste, que atravessam os quatro tópicos
    respostas: string[]; // ids das questões já respondidas nesta tentativa
    concluida: boolean;
    createdAt: number;
}

// Evento imutável: uma resposta confirmada = um documento em `answers`, nunca atualizado.
// Os campos são exatamente os que `respostaValida()` exige no firestore.rules. Mudou um, muda o outro.
export interface Answer {
    id: string;
    uid: string;
    questionId: string;
    topicId: string;
    attemptId: string;
    fase: Fase;
    escolha: string; // id da alternativa marcada
    ordemExibida: string[]; // ids das 4 alternativas, na ordem em que apareceram na tela
    correta: boolean;
    confianca: Confianca;
    tempoMs: number; // inteiro, do momento em que a questão aparece até o Confirmar
    respondidaEm: number; // horário do servidor, em ms
}

// O que a tela entrega ao confirmar. `id` e `respondidaEm` não vêm do aparelho:
// o Firestore gera o id e o servidor carimba o horário.
export type NovaResposta = Omit<Answer, 'id' | 'respondidaEm'>;

export interface Alternativa {
    id: string;
    texto: string;
    correta: boolean;
    explicacao: string;
}

// forma_a e forma_b são os blocos medidos do piloto (pré, pós e reteste); pratica fica fora do ganho.
export type BlocoQuestao = 'forma_a' | 'forma_b' | 'pratica';

// Hipótese do autor da questão, conferida depois pela taxa de acerto. Não confundir com confiança (1 a 3).
export type Dificuldade = 'basico' | 'intermediario' | 'avancado';

export interface Question {
    id: string;
    lessonId: string;
    topicId: string;
    order: number;
    bloco: BlocoQuestao;
    dificuldade: Dificuldade;
    formato: 'multipla_escolha' | 'completar_codigo' | 'ordenar_etapas';
    enunciado: string;
    alternativas: Alternativa[];
    fonte: string | null;
    versaoConteudo: string; // hash do content/ no momento do seed
}

export interface SlideConceito {
    titulo: string;
    texto: string;
}

export interface Lesson {
    id: string;
    title: string;
    order: number;
    topicId?: string;
    ordem?: number; // ordem de apresentação no piloto (1 a 4 no dia 1, 5 em diante na trilha diária)
    trilha?: 'medido' | 'diaria';
    modulo?: string | null;
    cartao?: SlideConceito[]; // cartão de conceito mostrado antes da prática
}

// Não tem coleção própria: sai da lição do tópico (uma lição por tópico no seed de conteúdo).
export interface Topico {
    id: string; // o `topicId` das questões e das respostas
    titulo: string;
    modulo: string | null;
    ordem: number; // a ordem de apresentação da lição; sem ela, o número da lição
}

export type Experiencia ='iniciante' | 'intermediario' | 'avancado';

export interface Perfil {
    uid: string;
    nome: string;
    apelido: string; // nome curto de exibição (ranking, saudação)
    email: string;
    telefone: string; // só dígitos, ex.: '11987654321'
    instituicao: string;
    curso: string;
    experiencia: Experiencia;
    // Os dois abaixo nascem juntos, no aceite do termo, e não mudam mais (item 22).
    formaPre?: FormaPre; // forma do pré-teste, alternada pelo contador do piloto
    consentiuEm?: number; // horário do servidor, em ms
    criadoEm: number;
    atualizadoEm: number;
}

// O que a tela de perfil preenche. O resto (uid, email, datas) o contexto deriva.
export type DadosPerfil = Omit<Perfil, 'uid' | 'email' | 'formaPre' | 'consentiuEm' | 'criadoEm' | 'atualizadoEm'>;

// O que o aceite do termo grava no perfil.
export type Consentimento = Required<Pick<Perfil, 'formaPre' | 'consentiuEm'>>;