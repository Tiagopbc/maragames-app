import { Answer, Attempt, Consentimento, Fase, Lesson, NovaResposta, Question, Topico } from '../types/domain';

export interface ProgressRepository {
    // Conteúdo. As listas já vêm na ordem de exibição.
    getLicoes(): Promise<Lesson[]>; // pela ordem da lição
    getTopicos(): Promise<Topico[]>; // um por lição, na ordem das lições
    getQuestoes(): Promise<Question[]>; // agrupadas por tópico e, dentro dele, pela ordem
    getQuestoesDoTopico(topicId: string): Promise<Question[]>;

    // Todas as respostas do aluno, de todas as fases, da mais antiga para a mais recente.
    // É a entrada das funções puras de src/lib (domínio, quadrante, XP, roteiro).
    getRespostas(uid: string): Promise<Answer[]>;

    // lessonId é null nos blocos pré, pós e reteste, que não pertencem a uma lição só.
    getAttemptEmAndamento(uid: string, fase: Fase, lessonId: string | null): Promise<Attempt | null>;
    criarAttempt(uid: string, fase: Fase, lessonId: string | null): Promise<Attempt>;
    registrarResposta(resposta: NovaResposta): Promise<void>;
    concluirAttempt(attemptId: string): Promise<void>;

    // Aceite do termo (item 22): grava em `users/{uid}` a data e a forma do pré-teste, alternada
    // entre os participantes pela ordem de aceite. Quem já aceitou recebe de volta o que está gravado.
    registrarConsentimento(uid: string): Promise<Consentimento>;
}
