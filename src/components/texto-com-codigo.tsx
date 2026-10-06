import { StyleSheet } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// O conteúdo (questões e cartões) marca trechos de código com crases (`vidas = 3`). Aqui eles
// saem em fonte monoespaçada, sem as crases, dentro do mesmo parágrafo.
export function TextoComCodigo({ children, ...rest }: Omit<ThemedTextProps, 'children'> & { children: string }) {
    const theme = useTheme();
    // Dividindo pelas crases, os pedaços de índice ímpar são os que estavam entre elas.
    const pedacos = children.split('`');

    return (
        <ThemedText {...rest}>
            {pedacos.map((pedaco, i) =>
                i % 2 === 1 ? (
                    <ThemedText key={i} style={[styles.codigo, { backgroundColor: theme.backgroundSelected }]}>
                        {pedaco}
                    </ThemedText>
                ) : (
                    pedaco
                )
            )}
        </ThemedText>
    );
}

const styles = StyleSheet.create({
    codigo: { fontFamily: Fonts.mono, fontSize: 14 },
});
