import { useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent, type ViewProps } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

// O ladrilho de 300 pt, com a opacidade já embutida; o @2x e o @3x vêm junto pelo nome do arquivo.
// O desenho de origem é o fundo-escuro.svg, na mesma pasta.
const PADRAO = require('@/assets/images/fundo-escuro.png');
const LADO = 300;

/**
 * O fundo de toda tela. No tema escuro, o padrão da Beast Maragames (ícones de jogo, a logo e o
 * mascote) repetido atrás do conteúdo; no claro, só a cor de fundo, como o `ThemedView`.
 */
export function FundoDaMarca({ style, children, onLayout, ...props }: ViewProps) {
    const theme = useTheme();
    const escuro = useColorScheme() === 'dark';
    const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });

    function aoMedir(evento: LayoutChangeEvent) {
        const { width, height } = evento.nativeEvent.layout;
        setTamanho({ largura: width, altura: height });
        onLayout?.(evento);
    }

    // Os ladrilhos vão em grade, quantos couberem: o `resizeMode="repeat"` do iOS desenha um só.
    const colunas = Math.ceil(tamanho.largura / LADO);
    const linhas = Math.ceil(tamanho.altura / LADO);

    return (
        <View style={[{ backgroundColor: theme.background }, style]} onLayout={aoMedir} {...props}>
            {escuro && (
                <View testID="padrao-da-marca" pointerEvents="none" style={styles.recorte}>
                    <View style={[styles.grade, { width: colunas * LADO }]}>
                        {Array.from({ length: colunas * linhas }, (_, i) => (
                            <Image
                                key={i}
                                testID="ladrilho"
                                source={PADRAO}
                                accessibilityIgnoresInvertColors
                                style={styles.ladrilho}
                            />
                        ))}
                    </View>
                </View>
            )}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    recorte: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
    grade: { flexDirection: 'row', flexWrap: 'wrap' },
    ladrilho: { width: LADO, height: LADO },
});
