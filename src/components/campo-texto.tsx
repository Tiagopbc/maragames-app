import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Erro } from '@/lib/validacao';

type CampoTextoProps = TextInputProps & {
    rotulo: string;
    erro?: Erro;
    // Um botão dentro do campo, à direita (o de mostrar a senha, por exemplo).
    aDireita?: ReactNode;
};

export function CampoTexto({ rotulo, erro, aDireita, style, ...rest }: CampoTextoProps) {
    const theme = useTheme();

    return (
        // Sem fundo próprio: o campo pode estar sobre a tela ou dentro de um cartão.
        <View style={styles.container}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.rotulo}>
                {rotulo}
            </ThemedText>

            <View>
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
                        aDireita ? styles.comBotao : null,
                        style,
                    ]}
                    placeholderTextColor={theme.textSecondary}
                    {...rest}
                />
                {aDireita && <View style={styles.aDireita}>{aDireita}</View>}
            </View>

            {erro && (
                <ThemedText type="small" themeColor="erro">
                    {erro}
                </ThemedText>
            )}
        </View>
    );
}

// A área de toque mínima de um botão.
const LARGURA_DO_BOTAO = 48;

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
    // O texto para antes do botão, para não passar por baixo dele.
    comBotao: { paddingRight: LARGURA_DO_BOTAO },
    aDireita: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: LARGURA_DO_BOTAO,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
