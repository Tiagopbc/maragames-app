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

export interface Question {
    id: string;
    lessonId: string;
    topicId: string;
    order: number;
    formato: 'multipla_escolha' | 'completar_codigo' | 'ordenar_etapas';
    enunciado: string;
    alternativas: Alternativa[];
}

export interface Lesson {
    id: string;
    title: string;
    order: number;
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