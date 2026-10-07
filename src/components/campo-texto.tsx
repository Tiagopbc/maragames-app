import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Erro } from '@/lib/validacao';

type CampoTextoProps = TextInputProps & {
    rotulo: string;
    erro?: Erro;
};

export function CampoTexto({ rotulo, erro, style, ...rest }: CampoTextoProps) {
    const theme = useTheme();

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="small" themeColor="textSecondary">
                {rotulo}
            </ThemedText>

            <TextInput
                style={[
                    styles.input,
                    { color: theme.text, borderColor: erro ? theme.erro : theme.borda },
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
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { gap: Spacing.one },
    input: {
        borderWidth: 1,
        borderRadius: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
});
