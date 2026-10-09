// Regras do consentimento (item 22), testadas no emulador do Firestore.
// Roda com `npm run test:regras`, que sobe o emulador, executa este arquivo e o derruba.
// O projeto é `demo-maragames`: com o prefixo `demo-`, nada aqui chega ao Firebase de verdade.

import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    Timestamp,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch,
    type Firestore,
} from 'firebase/firestore';

import { FirebaseProgressRepository } from '../src/data/FirebaseProgressRepository';

// `require` e não `import`: o projeto não tem os tipos do Node (o app roda em React Native), e
// este é o único arquivo que lê do disco.
const { readFileSync } = require('fs') as { readFileSync: (caminho: string, codificacao: 'utf8') => string };

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
    ambiente = await initializeTestEnvironment({
        projectId: 'demo-maragames',
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

function perfilDe(uid: string) {
    return {
        uid,
        nome: 'Paulo Souza',
        apelido: 'paulo',
        email: `${uid}@exemplo.com`,
        telefone: '98987654321',
        instituicao: 'UNDB',
        curso: 'Engenharia de Software',
        experiencia: 'iniciante',
        criadoEm: 1_759_000_000_000,
        atualizadoEm: 1_759_000_000_000,
    };
}

/** Cria o perfil como o app cria: pelo próprio aluno, antes do consentimento. */
async function comPerfil(uid: string): Promise<Firestore> {
    const db = bancoDe(uid);
    await setDoc(doc(db, 'users', uid), perfilDe(uid));
    return db;
}

/** Aceita o termo pelo caminho de verdade: a transação do repositório. */
async function aceitar(uid: string) {
    return new FirebaseProgressRepository(bancoDe(uid)).registrarConsentimento(uid);
}

async function totalDoContador(): Promise<number | undefined> {
    return (await getDoc(doc(bancoDe('leitor'), 'piloto', 'contador'))).data()?.total;
}

/** Tenta, numa escrita só, pôr o contador em `total` e gravar o aceite com a forma dada. */
function aceiteNaMao(db: Firestore, uid: string, total: number, formaPre: string, consentiuEm: unknown = serverTimestamp()) {
    const lote = writeBatch(db);
    lote.set(doc(db, 'piloto', 'contador'), { total });
    lote.update(doc(db, 'users', uid), { formaPre, consentiuEm });
    return lote.commit();
}

describe('o aceite pelo repositório', () => {
    it('o primeiro participante recebe a forma A, e o contador vai a 1', async () => {
        const db = await comPerfil('u1');
        const antes = Date.now();

        const consentimento = await aceitar('u1');

        expect(consentimento.formaPre).toBe('A');
        expect(Math.abs(consentimento.consentiuEm - antes)).toBeLessThan(60_000);
        expect(await totalDoContador()).toBe(1);

        const gravado = (await getDoc(doc(db, 'users', 'u1'))).data()!;
        expect(gravado.formaPre).toBe('A');
        expect(gravado.consentiuEm.toMillis()).toBe(consentimento.consentiuEm);
        expect(gravado.apelido).toBe('paulo'); // o resto do perfil fica como estava
    });

    it('as formas se alternam: A, B, A', async () => {
        await comPerfil('u1');
        await comPerfil('u2');
        await comPerfil('u3');

        const formas = [
            (await aceitar('u1')).formaPre,
            (await aceitar('u2')).formaPre,
            (await aceitar('u3')).formaPre,
        ];

        expect(formas).toEqual(['A', 'B', 'A']);
        expect(await totalDoContador()).toBe(3);
    });

    it('dois aceites ao mesmo tempo recebem formas diferentes', async () => {
        await comPerfil('u1');
        await comPerfil('u2');

        const consentimentos = await Promise.all([aceitar('u1'), aceitar('u2')]);

        expect(consentimentos.map((c) => c.formaPre).sort()).toEqual(['A', 'B']);
        expect(await totalDoContador()).toBe(2);
    });

    it('seis aceites ao mesmo tempo ainda dão metades iguais', async () => {
        const uids = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
        for (const uid of uids) await comPerfil(uid);

        const consentimentos = await Promise.all(uids.map(aceitar));

        expect(consentimentos.map((c) => c.formaPre).sort()).toEqual(['A', 'A', 'A', 'B', 'B', 'B']);
        expect(await totalDoContador()).toBe(6);
    });

    it('aceitar de novo devolve o mesmo consentimento e não mexe no contador', async () => {
        await comPerfil('u1');
        const primeiro = await aceitar('u1');

        const segundo = await aceitar('u1');

        expect(segundo).toEqual(primeiro);
        expect(await totalDoContador()).toBe(1);
    });

    it('sem perfil não há aceite, e o contador não anda', async () => {
        await expect(aceitar('sem_perfil')).rejects.toThrow();

        expect(await totalDoContador()).toBeUndefined();
    });
});

describe('a forma não é escolha do participante', () => {
    it('recusa a forma que não é a da vez (o primeiro pedindo B)', async () => {
        const db = await comPerfil('u1');

        await assertFails(aceiteNaMao(db, 'u1', 1, 'B'));
    });

    it('aceita a forma da vez escrita na mão, que é o que a transação faz', async () => {
        const db = await comPerfil('u1');

        await assertSucceeds(aceiteNaMao(db, 'u1', 1, 'A'));
    });

    it('recusa gravar a forma sem passar pelo contador', async () => {
        const db = await comPerfil('u1');

        await assertFails(updateDoc(doc(db, 'users', 'u1'), { formaPre: 'A', consentiuEm: serverTimestamp() }));
    });

    it('recusa pegar a forma do último que aceitou, sem somar ao contador', async () => {
        await comPerfil('u1');
        await aceitar('u1'); // contador em 1, que dá A
        const db = await comPerfil('u2');

        await assertFails(updateDoc(doc(db, 'users', 'u2'), { formaPre: 'A', consentiuEm: serverTimestamp() }));
    });

    it('recusa pular uma posição do contador para cair na outra forma', async () => {
        await comPerfil('u1');
        await aceitar('u1');
        const db = await comPerfil('u2');

        await assertFails(aceiteNaMao(db, 'u2', 3, 'A'));
    });

    it('recusa criar o perfil já com forma ou com data de aceite', async () => {
        const db = bancoDe('u1');

        await assertFails(setDoc(doc(db, 'users', 'u1'), { ...perfilDe('u1'), formaPre: 'A' }));
        await assertFails(setDoc(doc(db, 'users', 'u1'), { ...perfilDe('u1'), consentiuEm: serverTimestamp() }));
    });
});

describe('a data do aceite é a do servidor', () => {
    it('recusa data escolhida pelo aparelho', async () => {
        const db = await comPerfil('u1');

        await assertFails(aceiteNaMao(db, 'u1', 1, 'A', Timestamp.fromMillis(1_700_000_000_000)));
    });

    it('recusa a forma sem a data', async () => {
        const db = await comPerfil('u1');
        const lote = writeBatch(db);
        lote.set(doc(db, 'piloto', 'contador'), { total: 1 });
        lote.update(doc(db, 'users', 'u1'), { formaPre: 'A' });

        await assertFails(lote.commit());
    });
});

describe('depois do aceite, nada dele muda', () => {
    it('recusa trocar a forma', async () => {
        const db = await comPerfil('u1');
        await aceitar('u1');

        await assertFails(updateDoc(doc(db, 'users', 'u1'), { formaPre: 'B' }));
    });

    it('recusa apagar a forma ou a data', async () => {
        const db = await comPerfil('u1');
        await aceitar('u1');

        await assertFails(updateDoc(doc(db, 'users', 'u1'), { formaPre: deleteField() }));
        await assertFails(updateDoc(doc(db, 'users', 'u1'), { consentiuEm: deleteField() }));
    });

    it('recusa trocar a data', async () => {
        const db = await comPerfil('u1');
        await aceitar('u1');

        await assertFails(updateDoc(doc(db, 'users', 'u1'), { consentiuEm: serverTimestamp() }));
    });

    it('recusa aceitar de novo na mão para tentar outra forma', async () => {
        const db = await comPerfil('u1');
        await aceitar('u1');

        await assertFails(aceiteNaMao(db, 'u1', 2, 'B'));
    });

    it('editar o resto do perfil continua permitido', async () => {
        const db = await comPerfil('u1');
        await aceitar('u1');

        await assertSucceeds(
            setDoc(doc(db, 'users', 'u1'), { ...perfilDe('u1'), apelido: 'paulinho' }, { merge: true })
        );
    });
});

describe('o contador só anda junto com um aceite', () => {
    it('recusa criar o contador sem aceitar o termo', async () => {
        const db = await comPerfil('u1');

        await assertFails(setDoc(doc(db, 'piloto', 'contador'), { total: 1 }));
    });

    it('recusa somar ao contador sem aceitar o termo', async () => {
        await comPerfil('u1');
        await aceitar('u1');
        const db = await comPerfil('u2');

        await assertFails(setDoc(doc(db, 'piloto', 'contador'), { total: 2 }));
    });

    it('recusa quem já aceitou somar de novo', async () => {
        const db = await comPerfil('u1');
        await aceitar('u1');

        await assertFails(setDoc(doc(db, 'piloto', 'contador'), { total: 2 }));
    });

    it('recusa campo a mais no contador', async () => {
        const db = await comPerfil('u1');
        const lote = writeBatch(db);
        lote.set(doc(db, 'piloto', 'contador'), { total: 1, extra: true });
        lote.update(doc(db, 'users', 'u1'), { formaPre: 'A', consentiuEm: serverTimestamp() });

        await assertFails(lote.commit());
    });

    it('recusa apagar o contador', async () => {
        const db = await comPerfil('u1');
        await aceitar('u1');

        await assertFails(deleteDoc(doc(db, 'piloto', 'contador')));
    });

    it('quem não está logado não lê o contador', async () => {
        const anonimo = ambiente.unauthenticatedContext().firestore() as unknown as Firestore;

        await assertFails(getDoc(doc(anonimo, 'piloto', 'contador')));
    });
});
