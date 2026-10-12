import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    signOut,
    updateProfile,
    type User,
} from 'firebase/auth';
import { deleteField, doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from './firebase';
import { paraPerfil } from '../data/mapeadores';
import { repositorio } from '../data/repositorio';
import { perfilCompleto } from './perfil';
import type { DadosPerfil, ExtrasParaSalvar, Perfil } from '../types/domain';

type SessionValue = {
    user: User | null;
    perfil: Perfil | null;
    perfilCompleto: boolean;
    isLoading: boolean;
    entrarComEmail: (email: string, senha: string) => Promise<void>;
    cadastrarComEmail: (email: string, senha: string) => Promise<void>;
    entrarComGoogle: () => Promise<void>;
    // Só quem tem senha pode redefini-la: quem entra pelo Google não tem senha neste app.
    entraComSenha: boolean;
    redefinirSenha: (email: string) => Promise<void>;
    // O núcleo do perfil. No primeiro preenchimento, o aceite de contato vai junto, em `extras`.
    salvarPerfil: (dados: DadosPerfil, extras?: ExtrasParaSalvar) => Promise<void>;
    // As perguntas opcionais e o aceite de contato. Chave presente sem valor apaga a resposta.
    salvarExtras: (extras: ExtrasParaSalvar) => Promise<void>;
    // Verdadeiro quando a pessoa ainda não se deu as notas por módulo (item 34). Enquanto a
    // leitura não termina, ou se ela falha, fica falso: na dúvida, ninguém é barrado.
    precisaDaAutoavaliacao: boolean;
    registrarAutoavaliacao: (notas: Record<string, number>) => Promise<void>;
    aceitarConsentimento: () => Promise<void>;
    sair: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>');
    return ctx;
}

// O que `salvarExtras` aceita gravar: as perguntas opcionais e o aceite de contato.
const CAMPOS_EXTRAS: readonly (keyof ExtrasParaSalvar)[] = [
    'ocupacao',
    'engines',
    'linguagens',
    'estudoDeGameDesign',
    'interesses',
    'objetivo',
    'tempoPorSemana',
    'comoConheceu',
    'alunoDoSite',
    'aceitaContato',
];

// Sem resposta: campo sem valor ou lista vazia. No banco isso é campo ausente, e não vazio.
const semResposta = (valor: unknown) => valor === undefined || (Array.isArray(valor) && valor.length === 0);

// O que vai para o Firestore: a resposta, ou a ordem de apagar o campo quando ela foi desfeita.
// Só as chaves que vieram: o que a tela não mandou fica como está no banco.
function paraOBanco(extras: ExtrasParaSalvar): Record<string, unknown> {
    const escrita: Record<string, unknown> = {};
    for (const campo of CAMPOS_EXTRAS) {
        if (!(campo in extras)) continue;
        escrita[campo] = semResposta(extras[campo]) ? deleteField() : extras[campo];
    }
    return escrita;
}

// O mesmo, no perfil em memória: a resposta desfeita some do objeto.
function comExtras(perfil: Perfil, extras: ExtrasParaSalvar): Perfil {
    const novo: Record<string, unknown> = { ...perfil };
    for (const campo of CAMPOS_EXTRAS) {
        if (!(campo in extras)) continue;
        if (semResposta(extras[campo])) delete novo[campo];
        else novo[campo] = extras[campo];
    }
    return novo as unknown as Perfil;
}

function semChaves<T extends object>(objeto: T | null, chaves: readonly string[]): Partial<T> {
    return Object.fromEntries(Object.entries(objeto ?? {}).filter(([chave]) => !chaves.includes(chave))) as Partial<T>;
}

function semIndefinidos<T extends object>(objeto: T): Partial<T> {
    return Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined)) as Partial<T>;
}

export function SessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [faltaAutoavaliacao, setFaltaAutoavaliacao] = useState(false);

    useEffect(() => {
        return onAuthStateChanged(auth, async (u) => {
            // Volta a carregar a cada troca de sessão: sem isso, entre o login e a
            // leitura do perfil o guard enxergaria "logado sem perfil" e a tela de
            // completar perfil piscaria para quem já tem um.
            setIsLoading(true);
            setUser(u);

            setFaltaAutoavaliacao(false);

            if (!u) {
                setPerfil(null);
                setIsLoading(false);
                return;
            }

            try {
                const snap = await getDoc(doc(db, 'users', u.uid));
                // 'estimate': um carimbo ainda não confirmado pelo servidor viria null.
                setPerfil(snap.exists() ? paraPerfil(snap.data({ serverTimestamps: 'estimate' })) : null);
            } catch (e) {
                console.warn('Não foi possível ler o perfil de users/' + u.uid, e);
                setPerfil(null);
            } finally {
                setIsLoading(false);
            }

            // Fora do carregamento da sessão: a resposta só interessa na hora do primeiro
            // diagnóstico, e uma falha aqui não deve segurar nem derrubar a entrada no app.
            try {
                const autoavaliacao = await repositorio.getAutoavaliacao(u.uid);
                if (auth.currentUser?.uid === u.uid) setFaltaAutoavaliacao(autoavaliacao === null);
            } catch (e) {
                console.warn('Não foi possível ler a autoavaliação de ' + u.uid, e);
            }
        });
    }, []);

    async function entrarComEmail(email: string, senha: string) {
        await signInWithEmailAndPassword(auth, email, senha);
    }

    async function cadastrarComEmail(email: string, senha: string) {
        await createUserWithEmailAndPassword(auth, email, senha);
    }

    async function entrarComGoogle() {
        await signInWithPopup(auth, new GoogleAuthProvider());
    }

    // O Firebase manda um e-mail com o link; a senha nova é escolhida na página dele.
    async function redefinirSenha(email: string) {
        auth.languageCode = 'pt-BR';
        await sendPasswordResetEmail(auth, email);
    }

    async function salvarPerfil(dados: DadosPerfil, extras: ExtrasParaSalvar = {}) {
        if (!user) throw new Error('Não há sessão ativa para salvar o perfil.');

        const agora = Date.now();
        const base = {
            ...dados,
            uid: user.uid,
            email: user.email ?? '',
            criadoEm: perfil?.criadoEm ?? agora,
            atualizadoEm: agora,
        };
        // Instituição e curso só existem para quem faz graduação ou pós. Quem deixa de estudar
        // perde os dois: com `merge`, campo que não vem continua no banco, então é preciso apagar.
        const { instituicao, curso, ...semEstudo } = base;
        const doEstudo = { instituicao: instituicao ?? deleteField(), curso: curso ?? deleteField() };

        await setDoc(doc(db, 'users', user.uid), { ...semEstudo, ...doEstudo, ...paraOBanco(extras) }, { merge: true });
        // Atualiza o estado local em vez de reler do Firestore: o guard reage na hora.
        // O `merge` mantém no banco a forma e o consentimento, que não estão em `base`;
        // o estado local faz o mesmo, ou editar o perfil mandaria a pessoa de volta ao termo.
        setPerfil((atual) => comExtras({ ...semChaves(atual, ['instituicao', 'curso']), ...semIndefinidos(base) } as Perfil, extras));

        // O perfil mora no Firestore; o displayName do Auth é só um espelho, usado
        // pelo console do Firebase e por telas que leiam user.displayName direto.
        // Se o espelho falhar, o perfil continua salvo — por isso não derruba nada.
        if (user.displayName !== dados.nome) {
            try {
                await updateProfile(user, { displayName: dados.nome });
            } catch (e) {
                console.warn('Não foi possível espelhar o nome no Auth.', e);
            }
        }
    }

    async function salvarExtras(extras: ExtrasParaSalvar) {
        if (!user) throw new Error('Não há sessão ativa para salvar as respostas.');

        await setDoc(doc(db, 'users', user.uid), { ...paraOBanco(extras), atualizadoEm: Date.now() }, { merge: true });
        setPerfil((atual) => (atual ? comExtras(atual, extras) : atual));
    }

    // As notas por módulo, gravadas uma vez, antes do primeiro diagnóstico (item 34).
    async function registrarAutoavaliacao(notas: Record<string, number>) {
        if (!user) throw new Error('Não há sessão ativa para gravar a autoavaliação.');

        await repositorio.registrarAutoavaliacao(user.uid, notas);
        setFaltaAutoavaliacao(false);
    }

    // Aceite do termo (item 22). Quem grava é o repositório, numa transação com o contador do
    // piloto; aqui o perfil em memória só recebe o resultado, e a home recalcula a etapa.
    async function aceitarConsentimento() {
        if (!user) throw new Error('Não há sessão ativa para registrar o consentimento.');

        const consentimento = await repositorio.registrarConsentimento(user.uid);
        setPerfil((atual) => (atual ? { ...atual, ...consentimento } : atual));
    }

    return (
        <SessionContext.Provider
            value={{
                user,
                perfil,
                perfilCompleto: perfilCompleto(perfil),
                isLoading,
                entrarComEmail,
                cadastrarComEmail,
                entrarComGoogle,
                entraComSenha: !!user?.providerData.some((p) => p.providerId === 'password'),
                redefinirSenha,
                salvarPerfil,
                salvarExtras,
                precisaDaAutoavaliacao: faltaAutoavaliacao,
                registrarAutoavaliacao,
                aceitarConsentimento,
                sair: () => signOut(auth),
            }}>
            {children}
        </SessionContext.Provider>
    );
}
