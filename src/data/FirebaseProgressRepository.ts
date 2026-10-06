import {
    collection,
    query,
    where,
    limit,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    arrayUnion,
    runTransaction,
    serverTimestamp,
    type Firestore,
} from 'firebase/firestore';
import { formaDoParticipante } from '../lib/participante';
import { ProgressRepository } from './ProgressRepository';
import {
    ordenarLicoes,
    ordenarQuestoes,
    ordenarRespostas,
    paraAnswer,
    paraLesson,
    paraPerfil,
    paraQuestion,
    topicosDasLicoes,
} from './mapeadores';
import {
    Answer,
    Attempt,
    Consentimento,
    Fase,
    FormaPre,
    Lesson,
    NovaResposta,
    Question,
    Topico,
} from '../types/domain';

// Quantas vezes o aceite do termo é refeito quando a regra o recusa por disputa do contador.
const TENTATIVAS_DE_ACEITE = 6;

function esperar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// As leituras ordenam no aparelho, e não com orderBy: filtro e ordenação em campos
// diferentes pediriam índice composto no Firestore, e as listas são pequenas.
export class FirebaseProgressRepository implements ProgressRepository {
    // O Firestore chega de fora: o app passa o dele (src/data/repositorio.ts) e o teste das
    // regras passa o do emulador, então o mesmo código roda nos dois.
    constructor(private readonly db: Firestore) {}

    async getLicoes(): Promise<Lesson[]> {
        const snap = await getDocs(collection(this.db, 'lessons'));
        return ordenarLicoes(snap.docs.map((d) => paraLesson(d.id, d.data())));
    }

    async getTopicos(): Promise<Topico[]> {
        return topicosDasLicoes(await this.getLicoes());
    }

    async getQuestoes(): Promise<Question[]> {
        const snap = await getDocs(collection(this.db, 'questions'));
        return ordenarQuestoes(snap.docs.map((d) => paraQuestion(d.id, d.data())));
    }

    async getQuestoesDoTopico(topicId: string): Promise<Question[]> {
        const snap = await getDocs(query(collection(this.db, 'questions'), where('topicId', '==', topicId)));
        return ordenarQuestoes(snap.docs.map((d) => paraQuestion(d.id, d.data())));
    }

    async getRespostas(uid: string): Promise<Answer[]> {
        // O filtro por uid é exigido pela regra de `answers`: sem ele a consulta inteira é recusada.
        const snap = await getDocs(query(collection(this.db, 'answers'), where('uid', '==', uid)));
        // 'estimate': uma resposta ainda não confirmada pelo servidor viria com respondidaEm null.
        return ordenarRespostas(snap.docs.map((d) => paraAnswer(d.id, d.data({ serverTimestamps: 'estimate' }))));
    }

    async getAttemptEmAndamento(uid: string, fase: Fase, lessonId: string | null): Promise<Attempt | null> {
        const q = query(
            collection(this.db, 'attempts'),
            where('uid', '==', uid),
            where('fase', '==', fase),
            where('lessonId', '==', lessonId),
            where('concluida', '==', false),
            limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...(d.data() as Omit<Attempt, 'id'>) };
    }

    async criarAttempt(uid: string, fase: Fase, lessonId: string | null): Promise<Attempt> {
        const data: Omit<Attempt, 'id'> = {
            uid,
            fase,
            lessonId,
            respostas: [],
            concluida: false,
            createdAt: Date.now(),
        };
        const ref = await addDoc(collection(this.db, 'attempts'), data);
        return { id: ref.id, ...data };
    }

    async registrarResposta(resposta: NovaResposta): Promise<void> {
        // Campo a campo, e não `...resposta`: a regra do Firestore recusa qualquer chave fora da lista.
        await addDoc(collection(this.db, 'answers'), {
            uid: resposta.uid,
            questionId: resposta.questionId,
            topicId: resposta.topicId,
            attemptId: resposta.attemptId,
            fase: resposta.fase,
            escolha: resposta.escolha,
            ordemExibida: resposta.ordemExibida,
            correta: resposta.correta,
            confianca: resposta.confianca,
            tempoMs: Math.round(resposta.tempoMs),
            respondidaEm: serverTimestamp(),
        });
        await updateDoc(doc(this.db, 'attempts', resposta.attemptId), {
            respostas: arrayUnion(resposta.questionId),
        });
    }

    async concluirAttempt(attemptId: string): Promise<void> {
        await updateDoc(doc(this.db, 'attempts', attemptId), { concluida: true });
    }

    async registrarConsentimento(uid: string): Promise<Consentimento> {
        const perfilRef = doc(this.db, 'users', uid);
        const formaPre = await this.aceitarComNovasTentativas(uid);

        // O horário é carimbado pelo servidor, então só dá para conhecê-lo lendo de volta.
        const gravado = paraPerfil((await getDoc(perfilRef)).data({ serverTimestamps: 'estimate' }) ?? {});
        if (gravado.consentiuEm === undefined) throw new Error('O consentimento não foi gravado.');
        return { formaPre, consentiuEm: gravado.consentiuEm };
    }

    // Quando duas pessoas aceitam ao mesmo tempo, a que chega depois escreve com o total antigo
    // do contador, e a regra recusa ("o contador não subiu 1") em vez de o Firestore refazer a
    // transação sozinho. Na sessão 1 do piloto a turma aceita junta, então essa recusa é esperada:
    // o aceite é refeito, relendo o contador, com uma espera que cresce e varia para os aparelhos
    // não baterem de novo. Uma recusa de verdade (regras não publicadas) falha depois das tentativas.
    private async aceitarComNovasTentativas(uid: string): Promise<FormaPre> {
        for (let tentativa = 1; ; tentativa++) {
            try {
                return await this.aceitarEmTransacao(uid);
            } catch (e: any) {
                if (e?.code !== 'permission-denied' || tentativa === TENTATIVAS_DE_ACEITE) throw e;
                await esperar(tentativa * 100 + Math.random() * 200);
            }
        }
    }

    private aceitarEmTransacao(uid: string): Promise<FormaPre> {
        const contadorRef = doc(this.db, 'piloto', 'contador');
        const perfilRef = doc(this.db, 'users', uid);

        // Contador e perfil mudam juntos ou não mudam. A regra de `users` confere, no servidor,
        // que a forma gravada é a que o contador dá; a de `piloto/contador`, que ele só anda com um aceite.
        return runTransaction(this.db, async (transacao): Promise<FormaPre> => {
            const contador = await transacao.get(contadorRef);
            const perfil = await transacao.get(perfilRef);
            if (!perfil.exists()) throw new Error('Não há perfil para registrar o consentimento.');

            // Já aceitou: devolve a forma gravada e não gasta uma posição do contador.
            const jaGravada: FormaPre | undefined = perfil.data().formaPre;
            if (jaGravada) return jaGravada;

            // O primeiro aceite cria o contador; ninguém precisa prepará-lo antes.
            const ordem = (contador.exists() ? contador.data().total : 0) + 1;
            const forma = formaDoParticipante(ordem);
            transacao.set(contadorRef, { total: ordem });
            transacao.update(perfilRef, { formaPre: forma, consentiuEm: serverTimestamp() });
            return forma;
        });
    }
}
