// Regras de `attempts` e `answers` (itens 2, 22 e 30), testadas no emulador do Firestore.
// Roda com `npm run test:regras`, que sobe o emulador, executa este arquivo e o derruba.
// O projeto tem o prefixo `demo-`, então nada aqui chega ao Firebase de verdade. O nome é
// diferente do de `consentimento.test.ts` de propósito: os dois arquivos rodam ao mesmo tempo no
// mesmo emulador, e o `clearFirestore` de um apagaria a tentativa do outro no meio do teste.

import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
    type Firestore,
} from 'firebase/firestore';

import { FirebaseProgressRepository } from '../src/data/FirebaseProgressRepository';
import type { Fase, NovaResposta } from '../src/types/domain';

// `require` e não `import`: o projeto não tem os tipos do Node (o app roda em React Native).
const { readFileSync } = require('fs') as { readFileSync: (caminho: string, codificacao: 'utf8') => string };

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
    ambiente = await initializeTestEnvironment({
        projectId: 'demo-maragames-respostas',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

afterAll(async () => {
    await ambiente.cleanup();
});

beforeEach(async () => {
    await ambiente.clearFirestore();
});

/** O Firestore visto por um aluno logado: toda leitura e escrita passa pelas regras. */
function bancoDe(uid: string): Firestore {
    return ambiente.authenticatedContext(uid).firestore() as unknown as Firestore;
}

const repositorioDe = (uid: string) => new FirebaseProgressRepository(bancoDe(uid));

function respostaDe(uid: string, attemptId: string, fase: Fase = 'pre'): NovaResposta {
    return {
        uid,
        questionId: 'mda_a1',
        topicId: 'mda_framework',
        attemptId,
        fase,
        escolha: 'b',
        ordemExibida: ['c', 'b', 'a', 'd'],
        correta: false,
        confianca: 3,
        tempoMs: 4200,
    };
}

/** O documento como o app grava, para os testes que mexem num campo de cada vez. */
function eventoDe(uid: string, attemptId: string, fase: Fase = 'pre'): Record<string, unknown> {
    return { ...respostaDe(uid, attemptId, fase), respondidaEm: serverTimestamp() };
}

const gravar = (db: Firestore, evento: Record<string, unknown>) => addDoc(collection(db, 'answers'), evento);

describe('tentativas (attempts)', () => {
    it('o aluno cria a própria tentativa, em qualquer das quatro fases', async () => {
        const repo = repositorioDe('u1');

        for (const fase of ['pre', 'pratica', 'pos', 'reteste'] as const) {
            await assertSucceeds(repo.criarAttempt('u1', fase, null));
        }
    });

    // O ciclo da lição (item 30): diagnóstico, verificação e revisão passam a ser de uma lição.
    it('bloco sem feedback pode ficar ligado a uma lição, e o app o reencontra para retomar', async () => {
        const repo = repositorioDe('u1');

        const criada = await repo.criarAttempt('u1', 'pre', 'licao_mda');
        const emAndamento = await repo.getAttemptEmAndamento('u1', 'pre', 'licao_mda');

        expect(emAndamento?.id).toBe(criada.id);
        // A tentativa de uma lição não é a do bloco geral, nem a de outra lição.
        expect(await repo.getAttemptEmAndamento('u1', 'pre', null)).toBeNull();
        expect(await repo.getAttemptEmAndamento('u1', 'pre', 'licao_pixel')).toBeNull();
    });

    it('ninguém cria tentativa em nome de outro aluno', async () => {
        await assertFails(repositorioDe('u1').criarAttempt('u2', 'pre', null));
    });

    it('fase que não existe é recusada', async () => {
        await assertFails(repositorioDe('u1').criarAttempt('u1', 'diagnostico' as Fase, null));
    });

    it('quem não está logado não cria tentativa', async () => {
        const anonimo = ambiente.unauthenticatedContext().firestore() as unknown as Firestore;

        await assertFails(new FirebaseProgressRepository(anonimo).criarAttempt('u1', 'pre', null));
    });

    it('o aluno lê as suas tentativas, e não as de outro', async () => {
        const { id } = await repositorioDe('u1').criarAttempt('u1', 'pre', null);

        await assertSucceeds(getDoc(doc(bancoDe('u1'), 'attempts', id)));
        await assertFails(getDoc(doc(bancoDe('u2'), 'attempts', id)));
    });

    it('concluir a tentativa passa; mudar a fase ou o dono dela, não', async () => {
        const db = bancoDe('u1');
        const repo = repositorioDe('u1');
        const { id } = await repo.criarAttempt('u1', 'pre', null);

        await assertSucceeds(repo.concluirAttempt(id));
        // A regra de `answers` confia na fase e no dono gravados na tentativa.
        await assertFails(updateDoc(doc(db, 'attempts', id), { fase: 'pratica' }));
        await assertFails(updateDoc(doc(db, 'attempts', id), { uid: 'u2' }));
        await assertFails(updateDoc(doc(db, 'attempts', id), { lessonId: 'licao_pixel' }));
    });

    it('outro aluno não conclui a tentativa alheia', async () => {
        const { id } = await repositorioDe('u1').criarAttempt('u1', 'pre', null);

        await assertFails(repositorioDe('u2').concluirAttempt(id));
    });

    it('tentativa não se apaga', async () => {
        const { id } = await repositorioDe('u1').criarAttempt('u1', 'pre', null);

        await assertFails(deleteDoc(doc(bancoDe('u1'), 'attempts', id)));
    });
});

describe('respostas (answers), pelo caminho do app', () => {
    it('a resposta entra com o horário do servidor, e a tentativa anota a questão', async () => {
        const db = bancoDe('u1');
        const repo = repositorioDe('u1');
        const { id } = await repo.criarAttempt('u1', 'pre', 'licao_mda');
        const antes = Date.now();

        await assertSucceeds(repo.registrarResposta(respostaDe('u1', id)));

        const [gravada] = await repo.getRespostas('u1');
        expect(gravada).toMatchObject({ questionId: 'mda_a1', fase: 'pre', correta: false, confianca: 3, escolha: 'b' });
        expect(Math.abs(gravada.respondidaEm - antes)).toBeLessThan(60_000);
        expect((await getDoc(doc(db, 'attempts', id))).data()?.respostas).toEqual(['mda_a1']);
    });

    it('o aluno lê as suas respostas, e não as de outro', async () => {
        const repo = repositorioDe('u1');
        const { id } = await repo.criarAttempt('u1', 'pre', null);
        await repo.registrarResposta(respostaDe('u1', id));

        expect(await repositorioDe('u2').getRespostas('u2')).toEqual([]);
        // Pedir as respostas de outro aluno é recusado, e não devolvido vazio.
        await assertFails(getDocs(query(collection(bancoDe('u2'), 'answers'), where('uid', '==', 'u1'))));
    });
});

describe('respostas (answers), campo a campo', () => {
    let db: Firestore;
    let attemptId: string;

    beforeEach(async () => {
        db = bancoDe('u1');
        attemptId = (await repositorioDe('u1').criarAttempt('u1', 'pre', null)).id;
    });

    it('o evento completo passa', async () => {
        await assertSucceeds(gravar(db, eventoDe('u1', attemptId)));
    });

    it('campo a mais é recusado: nada derivado entra no evento', async () => {
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), xp: 3 }));
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), quadrante: 'ponto_cego' }));
    });

    it.each(['uid', 'questionId', 'topicId', 'attemptId', 'fase', 'escolha', 'ordemExibida', 'correta', 'confianca', 'tempoMs', 'respondidaEm'])(
        'sem o campo %s, é recusado',
        async (campo) => {
            const evento = eventoDe('u1', attemptId);
            delete evento[campo];

            await assertFails(gravar(db, evento));
        }
    );

    it('confiança fora de 1, 2 ou 3 é recusada', async () => {
        for (const confianca of [0, 4, 2.5, '3']) {
            await assertFails(gravar(db, { ...eventoDe('u1', attemptId), confianca }));
        }
    });

    it('sem confiança não há resposta: não existe pular a declaração', async () => {
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), confianca: null }));
    });

    it('a alternativa escolhida tem de estar entre as quatro exibidas', async () => {
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), escolha: 'e' }));
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), ordemExibida: ['a', 'b', 'c'] }));
    });

    it('o horário do aparelho é recusado: só vale o do servidor', async () => {
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), respondidaEm: Timestamp.fromMillis(1_759_000_000_000) }));
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), respondidaEm: Date.now() }));
    });

    it('fase que não existe e tempo negativo são recusados', async () => {
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), fase: 'diagnostico' }));
        await assertFails(gravar(db, { ...eventoDe('u1', attemptId), tempoMs: -1 }));
    });

    it('ninguém grava resposta em nome de outro aluno', async () => {
        await assertFails(gravar(db, eventoDe('u2', attemptId)));
    });
});

describe('respostas (answers), a tentativa citada', () => {
    it('tem de existir', async () => {
        await assertFails(gravar(bancoDe('u1'), eventoDe('u1', 'nao_existe')));
    });

    it('tem de ser do próprio aluno', async () => {
        const { id } = await repositorioDe('u2').criarAttempt('u2', 'pre', null);

        await assertFails(gravar(bancoDe('u1'), eventoDe('u1', id)));
    });

    it('tem de ser da mesma fase: a resposta de prática não entra numa tentativa de pré', async () => {
        const { id } = await repositorioDe('u1').criarAttempt('u1', 'pre', null);

        await assertFails(gravar(bancoDe('u1'), eventoDe('u1', id, 'pratica')));
    });
});

describe('respostas (answers), imutáveis', () => {
    it('nem o dono edita ou apaga uma resposta gravada', async () => {
        const db = bancoDe('u1');
        const { id } = await repositorioDe('u1').criarAttempt('u1', 'pre', null);
        const gravada = await gravar(db, eventoDe('u1', id));

        await assertFails(updateDoc(gravada, { correta: true }));
        await assertFails(updateDoc(gravada, { confianca: 1 }));
        await assertFails(deleteDoc(gravada));
    });
});
