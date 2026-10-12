// Regras do perfil (itens 8, 9 e 34) e da autoavaliação, testadas no emulador do Firestore.
// Roda com `npm run test:regras`. O projeto tem o prefixo `demo-`, então nada aqui chega ao
// Firebase de verdade, e um nome próprio, para não dividir o banco com os outros arquivos.

import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc, type Firestore } from 'firebase/firestore';

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
    faixaEtaria: '18_24',
    cidade: 'São Luís',
    uf: 'MA',
    situacaoDeEstudo: 'graduacao',
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
        ['faixa etária fora da lista', { faixaEtaria: 'ate_17' }],
        ['cidade vazia', { cidade: '' }],
        ['estado que não existe', { uf: 'XX' }],
        ['estado em minúsculas', { uf: 'ma' }],
        ['situação de estudo fora da lista', { situacaoDeEstudo: 'doutorado' }],
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

describe('o núcleo obrigatório do perfil (item 34)', () => {
    let db: Firestore;

    beforeEach(() => {
        db = bancoDe('u1');
    });

    const criar = (dados: Record<string, unknown>) => setDoc(doc(db, 'users', 'u1'), dados);
    const sem = (...campos: string[]) =>
        Object.fromEntries(Object.entries(PERFIL).filter(([campo]) => !campos.includes(campo)));

    it('o perfil com o núcleo inteiro é criado', async () => {
        await assertSucceeds(criar(PERFIL));
    });

    it.each(['faixaEtaria', 'cidade', 'uf', 'situacaoDeEstudo'])('sem %s, o perfil é recusado', async (campo) => {
        await assertFails(criar(sem(campo)));
    });

    // O perfil de antes de 12/10/2026: só os campos antigos.
    it('o perfil antigo, sem os campos novos, é recusado', async () => {
        await assertFails(criar(sem('faixaEtaria', 'cidade', 'uf', 'situacaoDeEstudo')));
    });

    it('na graduação e na pós, instituição e curso são obrigatórios', async () => {
        await assertFails(criar(sem('instituicao')));
        await assertFails(criar(sem('curso')));
        await assertFails(criar({ ...sem('instituicao', 'curso'), situacaoDeEstudo: 'pos' }));
    });

    it.each(['ensino_medio', 'formado', 'nao_estudo'])('quem marca %s não precisa de instituição nem de curso', async (situacaoDeEstudo) => {
        await assertSucceeds(criar({ ...sem('instituicao', 'curso'), situacaoDeEstudo }));
    });

    // Como o app faz quando a pessoa deixa de estudar: tira os dois campos na mesma gravação.
    it('quem deixa a graduação tira instituição e curso do perfil', async () => {
        await criar(PERFIL);

        await assertSucceeds(
            setDoc(
                doc(db, 'users', 'u1'),
                { situacaoDeEstudo: 'formado', instituicao: deleteField(), curso: deleteField(), atualizadoEm: Date.now() },
                { merge: true }
            )
        );
    });
});

describe('as perguntas opcionais do perfil (item 34)', () => {
    let db: Firestore;

    beforeEach(async () => {
        db = bancoDe('u1');
        await setDoc(doc(db, 'users', 'u1'), PERFIL);
    });

    /** Como o app faz: só os campos respondidos, com `merge`. */
    const responder = (extras: Record<string, unknown>) =>
        setDoc(doc(db, 'users', 'u1'), { ...extras, atualizadoEm: Date.now() }, { merge: true });

    it('aceita todas respondidas, dentro das listas', async () => {
        await assertSucceeds(
            responder({
                ocupacao: 'tecnologia',
                engines: ['godot', 'unity'],
                linguagens: ['python', 'gdscript'],
                estudoDeGameDesign: 'sozinho',
                interesses: ['programacao', 'game_design'],
                objetivo: 'publicar',
                tempoPorSemana: '1_a_3h',
                comoConheceu: 'instagram',
                alunoDoSite: false,
                aceitaContato: true,
            })
        );
    });

    it('aceita uma só, e as outras ficam sem resposta', async () => {
        await assertSucceeds(responder({ objetivo: 'hobby' }));
    });

    it('aceita desfazer uma resposta', async () => {
        await responder({ objetivo: 'hobby', engines: ['godot'] });

        await assertSucceeds(responder({ objetivo: deleteField(), engines: deleteField() }));
    });

    it.each([
        ['ocupação fora da lista', { ocupacao: 'aposentado' }],
        ['engine que não está na lista', { engines: ['godot', 'cryengine'] }],
        ['engines como texto, e não lista', { engines: 'godot' }],
        ['lista vazia', { linguagens: [] }],
        ['interesse fora da lista', { interesses: ['marketing'] }],
        ['objetivo fora da lista', { objetivo: 'ficar rico' }],
        ['tempo por semana fora da lista', { tempoPorSemana: '10h' }],
        ['como conheceu fora da lista', { comoConheceu: 'tv' }],
        ['aluno do site que não é sim ou não', { alunoDoSite: 'sim' }],
        ['aceite de contato que não é sim ou não', { aceitaContato: 1 }],
    ])('%s é recusado', async (_caso, extras) => {
        await assertFails(responder(extras));
    });

    it('ninguém responde no perfil de outro aluno', async () => {
        await assertFails(setDoc(doc(bancoDe('u2'), 'users', 'u1'), { objetivo: 'hobby' }, { merge: true }));
    });
});

describe('a autoavaliação por módulo (item 34)', () => {
    let db: Firestore;

    beforeEach(() => {
        db = bancoDe('u1');
    });

    const NOTAS = { fundamentos_de_game_design: 2, arte_pixel_art: 1, game_engines: 4 };
    const gravar = (banco: Firestore, uid: string, dados: Record<string, unknown>) =>
        setDoc(doc(banco, 'selfAssessments', uid), dados);
    const valida = () => ({ uid: 'u1', notas: NOTAS, respondidaEm: serverTimestamp() });

    it('a pessoa grava a própria autoavaliação, com o horário do servidor', async () => {
        await assertSucceeds(gravar(db, 'u1', valida()));
    });

    it('e lê de volta o que gravou', async () => {
        await gravar(db, 'u1', valida());

        await assertSucceeds(getDoc(doc(db, 'selfAssessments', 'u1')));
    });

    it('gravada uma vez, não muda nem some', async () => {
        await gravar(db, 'u1', valida());

        await assertFails(gravar(db, 'u1', { ...valida(), notas: { ...NOTAS, game_engines: 5 } }));
        await assertFails(updateDoc(doc(db, 'selfAssessments', 'u1'), { 'notas.game_engines': 5 }));
    });

    it.each([
        ['nota acima de 5', { notas: { game_engines: 6 } }],
        ['nota zero', { notas: { game_engines: 0 } }],
        ['nota que não é número', { notas: { game_engines: 'muito' } }],
        ['sem nota nenhuma', { notas: {} }],
        ['horário do aparelho, e não do servidor', { respondidaEm: 1_759_000_000_000 }],
        ['campo a mais', { comentario: 'sei tudo' }],
        ['uid de outra pessoa', { uid: 'u2' }],
    ])('%s é recusada', async (_caso, mudancas) => {
        await assertFails(gravar(db, 'u1', { ...valida(), ...mudancas }));
    });

    it('ninguém grava nem lê a autoavaliação de outra pessoa', async () => {
        await gravar(db, 'u1', valida());

        await assertFails(gravar(bancoDe('u2'), 'u1', { ...valida(), uid: 'u2' }));
        await assertFails(getDoc(doc(bancoDe('u2'), 'selfAssessments', 'u1')));
    });
});
