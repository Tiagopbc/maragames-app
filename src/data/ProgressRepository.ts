import { Attempt, Answer } from '../types/domain';

export interface ProgressRepository {
    getAttemptEmAndamento(userId: string, lessonId: string): Promise<Attempt | null>;
    criarAttempt(userId: string, lessonId: string): Promise<Attempt>;
    registrarResposta(resposta: Omit<Answer, 'id'>): Promise<void>;
    concluirAttempt(attemptId: string): Promise<void>;
}