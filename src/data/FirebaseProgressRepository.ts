import {
    collection,
    query,
    where,
    limit,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProgressRepository } from './ProgressRepository';
import { Attempt, Answer } from '../types/domain';

export class FirebaseProgressRepository implements ProgressRepository {
    async getAttemptEmAndamento(userId: string, lessonId: string): Promise<Attempt | null> {
        const q = query(
            collection(db, 'attempts'),
            where('userId', '==', userId),
            where('lessonId', '==', lessonId),
            where('concluida', '==', false),
            limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...(d.data() as Omit<Attempt, 'id'>) };
    }

    async criarAttempt(userId: string, lessonId: string): Promise<Attempt> {
        const data: Omit<Attempt, 'id'> = {
            userId,
            lessonId,
            respostas: [],
            concluida: false,
            createdAt: Date.now(),
        };
        const ref = await addDoc(collection(db, 'attempts'), data);
        return { id: ref.id, ...data };
    }

    async registrarResposta(resposta: Omit<Answer, 'id'>): Promise<void> {
        await addDoc(collection(db, 'answers'), resposta);
        await updateDoc(doc(db, 'attempts', resposta.attemptId), {
            respostas: arrayUnion(resposta.questionId),
        });
    }

    async concluirAttempt(attemptId: string): Promise<void> {
        await updateDoc(doc(db, 'attempts', attemptId), { concluida: true });
    }
}
