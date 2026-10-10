// A escolha de tema do aluno: do sistema, claro ou escuro. Fica guardada no aparelho, e não no
// perfil: é preferência do aparelho, vale também na tela de login e não passa pelas regras do
// Firestore. Em outro aparelho, a pessoa escolhe de novo.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type PreferenciaDeTema = 'sistema' | 'claro' | 'escuro';
export type EsquemaDeCores = 'light' | 'dark';

// Ordem em que as opções aparecem no Perfil.
export const PREFERENCIAS_DE_TEMA: readonly PreferenciaDeTema[] = ['sistema', 'claro', 'escuro'];

const CHAVE = 'maragames:tema';

/** O esquema que o app usa: a escolha da pessoa por cima do aparelho; em "do sistema", o do aparelho. */
export function esquemaDaPreferencia(preferencia: PreferenciaDeTema, doAparelho: EsquemaDeCores): EsquemaDeCores {
    if (preferencia === 'claro') return 'light';
    if (preferencia === 'escuro') return 'dark';
    return doAparelho;
}

// Um valor só para o app inteiro, fora do React: todo componente que lê o tema assina este
// valor (com `useSyncExternalStore`, no hook) e redesenha junto quando ele muda.
let atual: PreferenciaDeTema = 'sistema';
const ouvintes = new Set<() => void>();

export function preferenciaDeTema(): PreferenciaDeTema {
    return atual;
}

export function assinarPreferenciaDeTema(aoMudar: () => void): () => void {
    ouvintes.add(aoMudar);
    return () => {
        ouvintes.delete(aoMudar);
    };
}

function definir(preferencia: PreferenciaDeTema) {
    if (preferencia === atual) return;
    atual = preferencia;
    ouvintes.forEach((aoMudar) => aoMudar());
}

/** Lê do aparelho a escolha guardada. Roda uma vez, na abertura do app, antes da primeira tela. */
export async function carregarPreferenciaDeTema(): Promise<void> {
    try {
        const guardada = await AsyncStorage.getItem(CHAVE);
        definir(PREFERENCIAS_DE_TEMA.find((p) => p === guardada) ?? 'sistema');
    } catch (e) {
        // Sem conseguir ler, o app abre no tema do aparelho.
        console.warn('Não foi possível ler a preferência de tema.', e);
    }
}

/** Muda o tema na hora e guarda a escolha. Se o aparelho não deixar guardar, ela vale até fechar o app. */
export async function escolherTema(preferencia: PreferenciaDeTema): Promise<void> {
    definir(preferencia);
    try {
        await AsyncStorage.setItem(CHAVE, preferencia);
    } catch (e) {
        console.warn('Não foi possível guardar a preferência de tema.', e);
    }
}
