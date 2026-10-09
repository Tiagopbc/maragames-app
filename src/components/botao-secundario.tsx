import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type BotaoSecundarioProps = {
    rotulo: string;
    onPress: () => void;
    desabilitado?: boolean;
};

// A ação alternativa da tela (entrar com o Google, por exemplo): só contorno, para não
// disputar com o botão principal.
export function BotaoSecundario({ rotulo, onPress, desabilitado = false }: BotaoSecundarioProps) {
    const theme = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={rotulo}
            disabled={desabilitado}
            onPress={onPress}
            style={({ pressed }) => [
                styles.botao,
                { borderColor: theme.borda, opacity: desabilitado ? 0.4 : pressed ? 0.7 : 1 },
            ]}>
            <ThemedText themeColor="primaria" style={styles.rotulo}>
                {rotulo}
            </ThemedText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    botao: {
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotulo: { fontWeight: 600, textAlign: 'center' },
});
