// Regras da edição do perfil (itens 8 e 9), testadas no emulador do Firestore.
// Roda com `npm run test:regras`. O projeto tem o prefixo `demo-`, então nada aqui chega ao
// Firebase de verdade, e um nome próprio, para não dividir o banco com os outros arquivos.

import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';

// `require` e não `import`: o projeto não tem os tipos do Node (o app roda em React Native).
const { readFileSync } = require('fs') as { readFileSync: (caminho: string, codificacao: 'utf8') => string };

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
    ambiente = await initializeTestEnvironment({
        projectId: 'demo-maragames-perfil',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

afterAll(async () => {
    await ambiente.cleanup();
});

beforeEach(async () => {
    await ambiente.clearFirestore();
});

const PERFIL = {
    uid: 'u1',
    nome: 'Paulo Souza',
    apelido: 'paulo',
    email: 'u1@exemplo.com',
    telefone: '98987654321',
    instituicao: 'UNDB',
    curso: 'Engenharia de Software',
    experiencia: 'iniciante',
    criadoEm: 1_759_000_000_000,
    atualizadoEm: 1_759_000_000_000,
};

function bancoDe(uid: string): Firestore {
    return ambiente.authenticatedContext(uid).firestore() as unknown as Firestore;
}

/** A edição como o app faz: o perfil inteiro de novo, com `merge` (o `salvarPerfil` da sessão). */
const editar = (db: Firestore, mudancas: Record<string, unknown>) =>
    setDoc(doc(db, 'users', 'u1'), { ...PERFIL, ...mudancas, atualizadoEm: Date.now() }, { merge: true });

describe('a edição do perfil', () => {
    let db: Firestore;

    beforeEach(async () => {
        db = bancoDe('u1');
        await setDoc(doc(db, 'users', 'u1'), PERFIL);
    });

    it('o aluno edita os próprios dados', async () => {
        await assertSucceeds(editar(db, { apelido: 'paulão', curso: 'Jogos Digitais', experiencia: 'avancado' }));
    });

    // A prova da Fase 6: o campo vazio é recusado na tela e, aqui, na regra.
    it.each([
        ['apelido vazio', { apelido: '' }],
        ['apelido de uma letra', { apelido: 'p' }],
        ['nome vazio', { nome: '' }],
        ['telefone curto', { telefone: '98987' }],
        ['instituição vazia', { instituicao: '' }],
        ['curso vazio', { curso: '' }],
        ['experiência fora da lista', { experiencia: 'mestre' }],
    ])('%s é recusado', async (_caso, mudancas) => {
        await assertFails(editar(db, mudancas));
    });

    it('ninguém edita o perfil de outro aluno', async () => {
        await assertFails(editar(bancoDe('u2'), { apelido: 'intruso' }));
    });

    it('a edição não cria forma nem data de aceite por fora do termo', async () => {
        await assertFails(editar(db, { formaPre: 'A' }));
        await assertFails(editar(db, { consentiuEm: 1_759_000_000_000 }));
    });
});
