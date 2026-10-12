// As regras do perfil (item 34): o que é obrigatório, as listas de opções e a contagem das
// perguntas opcionais. Funções puras: sem React, sem Firebase, sem estado.
// As mesmas listas estão em `perfilValido()`, no firestore.rules. Mudou uma, muda a outra:
// `src/__tests__/regras-do-perfil.test.js` confere.

import type {
    ComoConheceu,
    Engine,
    EstudoDeGameDesign,
    Experiencia,
    ExtrasDoPerfil,
    FaixaEtaria,
    Interesse,
    Linguagem,
    Objetivo,
    Ocupacao,
    Perfil,
    SituacaoDeEstudo,
    TempoPorSemana,
    Topico,
} from '../types/domain';

export const FAIXAS_ETARIAS: readonly FaixaEtaria[] = ['18_24', '25_34', '35_44', '45_mais'];
export const SITUACOES_DE_ESTUDO: readonly SituacaoDeEstudo[] = ['ensino_medio', 'graduacao', 'pos', 'formado', 'nao_estudo'];
export const EXPERIENCIAS: readonly Experiencia[] = ['iniciante', 'intermediario', 'avancado'];

// prettier-ignore
export const UFS: readonly string[] = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const OCUPACOES: readonly Ocupacao[] = ['estudo', 'tecnologia', 'outra_area'];
export const ENGINES: readonly Engine[] = ['nenhuma', 'godot', 'unity', 'unreal', 'gamemaker', 'outra'];
export const LINGUAGENS: readonly Linguagem[] = ['nenhuma', 'python', 'csharp', 'javascript', 'gdscript', 'cpp', 'outra'];
export const ESTUDOS_DE_GAME_DESIGN: readonly EstudoDeGameDesign[] = ['nunca', 'sozinho', 'curso', 'faculdade'];
export const INTERESSES: readonly Interesse[] = ['programacao', 'arte', 'game_design', 'audio', 'publicacao'];
export const OBJETIVOS: readonly Objetivo[] = ['hobby', 'carreira', 'publicar', 'faculdade'];
export const TEMPOS_POR_SEMANA: readonly TempoPorSemana[] = ['ate_1h', '1_a_3h', 'mais_de_3h'];
export const COMO_CONHECEU: readonly ComoConheceu[] = ['instagram', 'amigo', 'faculdade', 'evento', 'outro'];

// A escala da autoavaliação por módulo.
export const NOTAS_DA_AUTOAVALIACAO: readonly number[] = [1, 2, 3, 4, 5];

/** Instituição e curso só fazem sentido para quem está na graduação ou na pós. */
export function pedeInstituicaoECurso(situacao: SituacaoDeEstudo | null | undefined): boolean {
    return situacao === 'graduacao' || situacao === 'pos';
}

/**
 * O perfil vale como completo quando o núcleo obrigatório existe. As perguntas opcionais e o
 * aceite de contato ficam de fora: ninguém é barrado por não respondê-las.
 */
export function perfilCompleto(p: Partial<Perfil> | null): boolean {
    if (!p) return false;
    const nucleo =
        !!p.nome && !!p.apelido && !!p.telefone && !!p.faixaEtaria && !!p.cidade && !!p.uf && !!p.situacaoDeEstudo && !!p.experiencia;
    if (!nucleo) return false;
    return !pedeInstituicaoECurso(p.situacaoDeEstudo) || (!!p.instituicao && !!p.curso);
}

const CAMPOS_EXTRAS: readonly (keyof ExtrasDoPerfil)[] = [
    'ocupacao',
    'engines',
    'linguagens',
    'estudoDeGameDesign',
    'interesses',
    'objetivo',
    'tempoPorSemana',
    'comoConheceu',
    'alunoDoSite',
];

export const TOTAL_DE_EXTRAS = CAMPOS_EXTRAS.length;

/** Quantas das perguntas opcionais têm resposta. Lista vazia não é resposta. */
export function extrasRespondidos(p: ExtrasDoPerfil): number {
    return CAMPOS_EXTRAS.filter((campo) => {
        const valor = p[campo];
        return Array.isArray(valor) ? valor.length > 0 : valor !== undefined;
    }).length;
}

/** Só as perguntas opcionais de um perfil, sem o resto. */
export function extrasDe(p: ExtrasDoPerfil): ExtrasDoPerfil {
    const extras: Record<string, unknown> = {};
    for (const campo of CAMPOS_EXTRAS) if (p[campo] !== undefined) extras[campo] = p[campo];
    return extras as ExtrasDoPerfil;
}

export interface Modulo {
    id: string;
    nome: string;
}

/**
 * Chave do módulo nas notas da autoavaliação: o nome sem acento, em minúsculas, com `_` no
 * lugar de espaço e de símbolo. O conteúdo só tem o nome do módulo; esta é a forma estável dele.
 */
export function idDoModulo(nome: string): string {
    return nome
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/** Os módulos do conteúdo, uma vez cada, na ordem em que aparecem nos tópicos. */
export function modulosDosTopicos(topicos: readonly Pick<Topico, 'modulo'>[]): Modulo[] {
    const vistos = new Map<string, string>();
    for (const { modulo } of topicos) {
        if (modulo && !vistos.has(idDoModulo(modulo))) vistos.set(idDoModulo(modulo), modulo);
    }
    return [...vistos].map(([id, nome]) => ({ id, nome }));
}
