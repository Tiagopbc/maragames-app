import { Colors, Fonts, type ThemeColor } from '../theme';

// Contraste entre duas cores, pela fórmula da WCAG 2: de 1 (iguais) a 21 (preto no branco).
function luminancia(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
    const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (clara + 0.05) / (escura + 0.05);
}

const TEXTO = 4.5; // mínimo para texto de tamanho normal
const CONTORNO = 3; // mínimo para borda que carrega significado

// Só os pares que as telas usam de verdade: [o que se lê, sobre o quê].
const PARES_DE_TEXTO: [ThemeColor, ThemeColor][] = [
    ['text', 'background'],
    ['text', 'backgroundElement'],
    ['text', 'backgroundSelected'],
    ['textSecondary', 'background'],
    ['textSecondary', 'backgroundElement'],
    ['primaria', 'background'],
    ['primaria', 'backgroundElement'],
    ['textoDoBotao', 'botao'],
    // As cores de estado e de quadrante aparecem como texto e ícone, não só como fundo.
    ['sucesso', 'background'],
    ['sucesso', 'backgroundElement'],
    ['aviso', 'background'],
    ['aviso', 'backgroundElement'],
    ['lacuna', 'background'],
    ['lacuna', 'backgroundElement'],
    ['erro', 'background'],
    ['erro', 'backgroundElement'],
];

const PARES_DE_CONTORNO: [ThemeColor, ThemeColor][] = [
    ['bordaSelecionada', 'background'],
    ['bordaSelecionada', 'backgroundElement'],
    ['bordaSelecionada', 'backgroundSelected'],
];

describe.each(['light', 'dark'] as const)('tema %s', (tema) => {
    const cores = Colors[tema];

    it('toda cor é um hexadecimal de seis dígitos', () => {
        for (const cor of Object.values(cores)) {
            expect(cor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
    });

    it.each(PARES_DE_TEXTO)('%s sobre %s dá para ler', (frente, fundo) => {
        expect(contraste(cores[frente], cores[fundo])).toBeGreaterThanOrEqual(TEXTO);
    });

    it.each(PARES_DE_CONTORNO)('%s se destaca de %s', (frente, fundo) => {
        expect(contraste(cores[frente], cores[fundo])).toBeGreaterThanOrEqual(CONTORNO);
    });
});

describe('a identidade da Beast Maragames', () => {
    it('o botão principal é o roxo da marca', () => {
        expect(Colors.light.botao).toBe('#3B2781');
    });

    it('a fonte é a Lexend, uma família por peso', () => {
        expect(Fonts).toMatchObject({
            regular: 'Lexend_400Regular',
            medium: 'Lexend_500Medium',
            semibold: 'Lexend_600SemiBold',
            bold: 'Lexend_700Bold',
        });
    });

    it('os dois temas têm os mesmos nomes de cor', () => {
        expect(Object.keys(Colors.dark).sort()).toEqual(Object.keys(Colors.light).sort());
    });
});
