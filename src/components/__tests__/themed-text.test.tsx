import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Fonts } from '@/constants/theme';

// Os nomes vão por extenso: comparar com `Fonts.regular` passaria mesmo se o tema não tivesse fonte.
const REGULAR = 'Lexend_400Regular';
const MEDIA = 'Lexend_500Medium';
const SEMINEGRITO = 'Lexend_600SemiBold';
const NEGRITO = 'Lexend_700Bold';

import { ThemedText, type ThemedTextProps } from '../themed-text';

async function estiloDe(props: ThemedTextProps) {
    await render(<ThemedText {...props}>texto</ThemedText>);
    return StyleSheet.flatten(screen.getByText('texto').props.style);
}

describe('a fonte do texto', () => {
    it.each([
        ['default', REGULAR],
        ['small', REGULAR],
        ['smallBold', SEMINEGRITO],
        ['subtitle', NEGRITO],
        ['title', NEGRITO],
        ['link', REGULAR],
        ['linkPrimary', SEMINEGRITO],
    ] as const)('o tipo %s usa %s', async (type, familia) => {
        expect((await estiloDe({ type })).fontFamily).toBe(familia);
    });

    it('o código continua em fonte monoespaçada', async () => {
        const familia = (await estiloDe({ type: 'code' })).fontFamily;

        expect(familia).toBe(Fonts.mono);
        expect(familia).not.toMatch(/Lexend/);
    });

    // Com fonte própria, cada peso é um arquivo: no Android, `fontWeight` sozinho não troca de
    // arquivo. Quem pede um peso pelo estilo recebe a família daquele peso.
    it.each([
        [400, REGULAR],
        [500, MEDIA],
        [600, SEMINEGRITO],
        [700, NEGRITO],
        ['bold', NEGRITO],
    ] as const)('peso %s pedido no estilo vira a família %s', async (fontWeight, familia) => {
        const estilo = await estiloDe({ style: { fontWeight } });

        expect(estilo.fontFamily).toBe(familia);
        expect(estilo.fontWeight).toBeUndefined();
    });

    it('quem escolhe a família no estilo fica com ela', async () => {
        expect((await estiloDe({ style: { fontFamily: Fonts.mono } })).fontFamily).toBe(Fonts.mono);
    });
});
