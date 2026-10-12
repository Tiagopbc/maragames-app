import {
    ENGINES,
    TOTAL_DE_EXTRAS,
    alternarOpcao,
    UFS,
    extrasRespondidos,
    idDoModulo,
    modulosDosTopicos,
    pedeInstituicaoECurso,
    perfilCompleto,
} from '../perfil';

const NUCLEO = {
    nome: 'Ana Souza',
    apelido: 'Ana',
    telefone: '98987654321',
    faixaEtaria: '18_24',
    cidade: 'São Luís',
    uf: 'MA',
    situacaoDeEstudo: 'nao_estudo',
    experiencia: 'iniciante',
} as const;

describe('perfilCompleto', () => {
    it('sem perfil, não está completo', () => {
        expect(perfilCompleto(null)).toBe(false);
    });

    it('com o núcleo inteiro, está completo', () => {
        expect(perfilCompleto(NUCLEO)).toBe(true);
    });

    it.each(['nome', 'apelido', 'telefone', 'faixaEtaria', 'cidade', 'uf', 'situacaoDeEstudo', 'experiencia'] as const)(
        'sem %s, não está completo',
        (campo) => {
            expect(perfilCompleto({ ...NUCLEO, [campo]: undefined })).toBe(false);
        }
    );

    // As contas criadas antes de 12/10/2026 têm só os campos antigos: voltam à tela de completar.
    it('o perfil antigo, sem faixa etária, cidade, estado e situação, não está completo', () => {
        expect(
            perfilCompleto({
                nome: 'Ana Souza',
                apelido: 'Ana',
                telefone: '98987654321',
                instituicao: 'UNDB',
                curso: 'Engenharia de Software',
                experiencia: 'iniciante',
            })
        ).toBe(false);
    });

    it('quem faz graduação ou pós precisa de instituição e curso', () => {
        expect(perfilCompleto({ ...NUCLEO, situacaoDeEstudo: 'graduacao' })).toBe(false);
        expect(perfilCompleto({ ...NUCLEO, situacaoDeEstudo: 'pos', instituicao: 'UNDB' })).toBe(false);
        expect(perfilCompleto({ ...NUCLEO, situacaoDeEstudo: 'graduacao', instituicao: 'UNDB', curso: 'Jogos Digitais' })).toBe(true);
    });

    it('quem não estuda, já se formou ou está no ensino médio não precisa dos dois', () => {
        for (const situacaoDeEstudo of ['nao_estudo', 'formado', 'ensino_medio'] as const) {
            expect(perfilCompleto({ ...NUCLEO, situacaoDeEstudo })).toBe(true);
        }
    });

    it('as perguntas opcionais e o aceite de contato não entram na conta', () => {
        expect(perfilCompleto({ ...NUCLEO, aceitaContato: false })).toBe(true);
    });
});

describe('pedeInstituicaoECurso', () => {
    it('só na graduação e na pós', () => {
        expect(pedeInstituicaoECurso('graduacao')).toBe(true);
        expect(pedeInstituicaoECurso('pos')).toBe(true);
        expect(pedeInstituicaoECurso('ensino_medio')).toBe(false);
        expect(pedeInstituicaoECurso('formado')).toBe(false);
        expect(pedeInstituicaoECurso('nao_estudo')).toBe(false);
        expect(pedeInstituicaoECurso(null)).toBe(false);
    });
});

describe('as siglas dos estados', () => {
    it('são as 27 unidades da federação, sem repetição', () => {
        expect(UFS).toHaveLength(27);
        expect(new Set(UFS).size).toBe(27);
        expect(UFS).toContain('MA');
        expect(UFS).toContain('DF');
    });
});

describe('extrasRespondidos', () => {
    it('sem resposta nenhuma, zero de nove', () => {
        expect(TOTAL_DE_EXTRAS).toBe(9);
        expect(extrasRespondidos({})).toBe(0);
    });

    it('conta cada pergunta respondida uma vez', () => {
        expect(extrasRespondidos({ ocupacao: 'estudo', interesses: ['arte', 'audio'], alunoDoSite: false })).toBe(3);
    });

    it('lista vazia não é resposta', () => {
        expect(extrasRespondidos({ engines: [], linguagens: [] })).toBe(0);
    });

    it('com tudo respondido, nove de nove', () => {
        expect(
            extrasRespondidos({
                ocupacao: 'tecnologia',
                engines: ['godot'],
                linguagens: ['python'],
                estudoDeGameDesign: 'sozinho',
                interesses: ['programacao'],
                objetivo: 'carreira',
                tempoPorSemana: '1_a_3h',
                comoConheceu: 'instagram',
                alunoDoSite: true,
            })
        ).toBe(9);
    });

    it('o aceite de contato e os dados do núcleo não contam', () => {
        const perfil: Record<string, unknown> = { ...NUCLEO, aceitaContato: true };

        expect(extrasRespondidos(perfil)).toBe(0);
    });
});

describe('os módulos da autoavaliação', () => {
    it('o id do módulo não tem acento, espaço nem símbolo', () => {
        expect(idDoModulo('Arte & Pixel Art')).toBe('arte_pixel_art');
        expect(idDoModulo('Áudio & Música')).toBe('audio_musica');
        expect(idDoModulo('Publicação & Monetização')).toBe('publicacao_monetizacao');
        expect(idDoModulo('Fundamentos de Game Design')).toBe('fundamentos_de_game_design');
    });

    it('saem dos tópicos, uma vez cada, na ordem em que aparecem', () => {
        const topicos = [
            { id: 't1', titulo: 'MDA', modulo: 'Fundamentos de Game Design', ordem: 1 },
            { id: 't2', titulo: 'Pixel', modulo: 'Arte & Pixel Art', ordem: 2 },
            { id: 't3', titulo: 'GDD', modulo: 'Fundamentos de Game Design', ordem: 3 },
            { id: 't4', titulo: 'Solto', modulo: null, ordem: 4 },
        ];

        expect(modulosDosTopicos(topicos)).toEqual([
            { id: 'fundamentos_de_game_design', nome: 'Fundamentos de Game Design' },
            { id: 'arte_pixel_art', nome: 'Arte & Pixel Art' },
        ]);
    });
});

// Engines e linguagens têm a opção "nenhuma", que não combina com as outras.
describe('alternarOpcao', () => {
    it('marca a opção tocada e mantém as outras, na ordem da lista', () => {
        expect(alternarOpcao(ENGINES, ['unity'], 'godot')).toEqual(['godot', 'unity']);
    });

    it('tocar na que está marcada desmarca', () => {
        expect(alternarOpcao(ENGINES, ['godot', 'unity'], 'godot')).toEqual(['unity']);
    });

    it('marcar "nenhuma" desmarca todas as outras', () => {
        expect(alternarOpcao(ENGINES, ['godot', 'unity'], 'nenhuma')).toEqual(['nenhuma']);
    });

    it('marcar qualquer outra desmarca "nenhuma"', () => {
        expect(alternarOpcao(ENGINES, ['nenhuma'], 'unreal')).toEqual(['unreal']);
    });

    it('tocar em "nenhuma" marcada deixa a pergunta sem resposta', () => {
        expect(alternarOpcao(ENGINES, ['nenhuma'], 'nenhuma')).toEqual([]);
    });

    it('numa lista sem "nenhuma", todas combinam', () => {
        expect(alternarOpcao(['arte', 'audio', 'programacao'], ['arte'], 'programacao')).toEqual(['arte', 'programacao']);
    });
});
