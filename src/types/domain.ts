export interface Attempt {
    id: string;
    userId: string;
    lessonId: string;
    respostas: string[]; // ids das questões já respondidas nesta tentativa
    concluida: boolean;
    createdAt: number;
}

export interface Answer {
    id: string;
    attemptId: string;
    userId: string;
    questionId: string;
    lessonId: string;
    topicId: string;
    escolha: string; // id da alternativa marcada
    correta: boolean;
    tempoMs: number;
    timestamp: number;
}

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

export type Experiencia = 'iniciante' | 'intermediario' | 'avancado';

export interface Perfil {
    uid: string;
    nome: string;
    apelido: string; // nome curto de exibição (ranking, saudação)
    email: string;
    telefone: string; // só dígitos, ex.: '11987654321'
    instituicao: string;
    curso: string;
    experiencia: Experiencia;
    criadoEm: number;
    atualizadoEm: number;
}

// O que a tela de perfil preenche. O resto (uid, email, datas) o contexto deriva.
export type DadosPerfil = Omit<Perfil, 'uid' | 'email' | 'criadoEm' | 'atualizadoEm'>;