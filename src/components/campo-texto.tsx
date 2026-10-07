import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Erro } from '@/lib/validacao';

type CampoTextoProps = TextInputProps & {
    rotulo: string;
    erro?: Erro;
};

export function CampoTexto({ rotulo, erro, style, ...rest }: CampoTextoProps) {
    const theme = useTheme();

    return (
        // Sem fundo próprio: o campo pode estar sobre a tela ou dentro de um cartão.
        <View style={styles.container}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.rotulo}>
                {rotulo}
            </ThemedText>

            <TextInput
                accessibilityLabel={rotulo}
                style={[
                    styles.input,
                    {
                        color: theme.text,
                        backgroundColor: theme.background,
                        borderColor: erro ? theme.erro : theme.borda,
                        fontFamily: Fonts.regular,
                    },
                    style,
                ]}
                placeholderTextColor={theme.textSecondary}
                {...rest}
            />

            {erro && (
                <ThemedText type="small" themeColor="erro">
                    {erro}
                </ThemedText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: Spacing.one },
    rotulo: { fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase' },
    input: {
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: Spacing.three,
        paddingVertical: 12,
        fontSize: 16,
    },
});
