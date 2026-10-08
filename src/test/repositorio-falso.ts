// Repositório em memória, só para testes de tela e de hook. Implementa a mesma interface que
// a tela enxerga, então o teste exercita o código de verdade sem emulador do Firestore.

import { ordenarLicoes, ordenarQuestoes, ordenarRespostas, topicosDasLicoes } from '../data/mapeadores';
import type { ProgressRepository } from '../data/ProgressRepository';
import { formaDoParticipante } from '../lib/participante';
import type {
    Answer,
    Attempt,
    Consentimento,
    Fase,
    Lesson,
    NovaResposta,
    Question,
    Topico,
} from '../types/domain';

export class RepositorioFalso implements ProgressRepository {
    licoes: Lesson[] = [];
    questoes: Question[] = [];
    respostas: Answer[] = [];
    attempts: Attempt[] = [];
    consentimentos = new Map<string, Consentimento>();

    /** Quantas das próximas gravações falham antes de gravar qualquer coisa (aparelho sem rede). */
    falhasAoGravar = 0;
    /** A próxima gravação cria o evento e falha em seguida, ao atualizar a tentativa. */
    falhaDepoisDeGravar = false;
    /** As leituras de conteúdo falham enquanto for verdadeiro. */
    falhaAoCarregar = false;

    private relogio = 1_000;

    /** Põe o "horário do servidor" das próximas gravações onde o teste precisa (em ms). */
    acertarRelogio(ms: number): void {
        this.relogio = ms;
    }

    reiniciar(): void {
        this.licoes = [];
        this.questoes = [];
        this.respostas = [];
        this.attempts = [];
        this.consentimentos = new Map();
        this.falhasAoGravar = 0;
        this.falhaDepoisDeGravar = false;
        this.falhaAoCarregar = false;
        this.relogio = 1_000;
    }

    async getLicoes(): Promise<Lesson[]> {
        if (this.falhaAoCarregar) throw new Error('sem rede');
        return ordenarLicoes(this.licoes);
    }

    async getTopicos(): Promise<Topico[]> {
        return topicosDasLicoes(await this.getLicoes());
    }

    async getQuestoes(): Promise<Question[]> {
        if (this.falhaAoCarregar) throw new Error('sem rede');
        return ordenarQuestoes(this.questoes);
    }

    async getQuestoesDoTopico(topicId: string): Promise<Question[]> {
        return (await this.getQuestoes()).filter((q) => q.topicId === topicId);
    }

    async getRespostas(uid: string): Promise<Answer[]> {
        if (this.falhaAoCarregar) throw new Error('sem rede');
        return ordenarRespostas(this.respostas.filter((r) => r.uid === uid));
    }

    async getAttemptEmAndamento(uid: string, fase: Fase, lessonId: string | null): Promise<Attempt | null> {
        return (
            this.attempts.find((a) => a.uid === uid && a.fase === fase && a.lessonId === lessonId && !a.concluida) ??
            null
        );
    }

    async criarAttempt(uid: string, fase: Fase, lessonId: string | null): Promise<Attempt> {
        const attempt: Attempt = {
            id: `t${this.attempts.length + 1}`,
            uid,
            fase,
            lessonId,
            respostas: [],
            concluida: false,
            createdAt: this.relogio++,
        };
        this.attempts.push(attempt);
        return attempt;
    }

    async registrarResposta(resposta: NovaResposta): Promise<void> {
        if (this.falhasAoGravar > 0) {
            this.falhasAoGravar -= 1;
            throw new Error('sem rede');
        }
        this.respostas.push({ ...resposta, id: `r${this.respostas.length + 1}`, respondidaEm: this.relogio++ });
        if (this.falhaDepoisDeGravar) {
            this.falhaDepoisDeGravar = false;
            throw new Error('sem rede');
        }
        this.attempts.find((a) => a.id === resposta.attemptId)?.respostas.push(resposta.questionId);
    }

    async concluirAttempt(attemptId: string): Promise<void> {
        const attempt = this.attempts.find((a) => a.id === attemptId);
        if (attempt) attempt.concluida = true;
    }

    async registrarConsentimento(uid: string): Promise<Consentimento> {
        const jaGravado = this.consentimentos.get(uid);
        if (jaGravado) return jaGravado;
        const consentimento: Consentimento = {
            formaPre: formaDoParticipante(this.consentimentos.size + 1),
            consentiuEm: this.relogio++,
        };
        this.consentimentos.set(uid, consentimento);
        return consentimento;
    }
}
