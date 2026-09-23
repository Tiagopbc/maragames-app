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
    signOut,
    updateProfile,
    type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from './firebase';
import type { DadosPerfil, Perfil } from '../types/domain';

type SessionValue = {
    user: User | null;
    perfil: Perfil | null;
    perfilCompleto: boolean;
    isLoading: boolean;
    entrarComEmail: (email: string, senha: string) => Promise<void>;
    cadastrarComEmail: (email: string, senha: string) => Promise<void>;
    entrarComGoogle: () => Promise<void>;
    salvarPerfil: (dados: DadosPerfil) => Promise<void>;
    sair: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>');
    return ctx;
}

// Um perfil só vale como completo quando todos os campos obrigatórios existem.
// A mesma lista está nas Firestore Rules — aqui é conveniência, lá é garantia.
function estaCompleto(p: Perfil | null): boolean {
    return (
        !!p &&
        !!p.nome &&
        !!p.apelido &&
        !!p.telefone &&
        !!p.instituicao &&
        !!p.curso &&
        !!p.experiencia
    );
}

export function SessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        return onAuthStateChanged(auth, async (u) => {
            // Volta a carregar a cada troca de sessão: sem isso, entre o login e a
            // leitura do perfil o guard enxergaria "logado sem perfil" e a tela de
            // completar perfil piscaria para quem já tem um.
            setIsLoading(true);
            setUser(u);

            if (!u) {
                setPerfil(null);
                setIsLoading(false);
                return;
            }

            try {
                const snap = await getDoc(doc(db, 'users', u.uid));
                setPerfil(snap.exists() ? (snap.data() as Perfil) : null);
            } catch (e) {
                console.warn('Não foi possível ler o perfil de users/' + u.uid, e);
                setPerfil(null);
            } finally {
                setIsLoading(false);
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

    async function salvarPerfil(dados: DadosPerfil) {
        if (!user) throw new Error('Não há sessão ativa para salvar o perfil.');

        const agora = Date.now();
        const completo: Perfil = {
            ...dados,
            uid: user.uid,
            email: user.email ?? '',
            criadoEm: perfil?.criadoEm ?? agora,
            atualizadoEm: agora,
        };

        await setDoc(doc(db, 'users', user.uid), completo, { merge: true });
        // Atualiza o estado local em vez de reler do Firestore: o guard reage na hora.
        setPerfil(completo);

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

    return (
        <SessionContext.Provider
            value={{
                user,
                perfil,
                perfilCompleto: estaCompleto(perfil),
                isLoading,
                entrarComEmail,
                cadastrarComEmail,
                entrarComGoogle,
                salvarPerfil,
                sair: () => signOut(auth),
            }}>
            {children}
        </SessionContext.Provider>
    );
}
