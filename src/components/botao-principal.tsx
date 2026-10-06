import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BotaoPrincipalProps = {
    rotulo: string;
    onPress: () => void;
    desabilitado?: boolean;
    carregando?: boolean; // mostra o indicador e ignora toques
};

// A ação principal da tela: uma por tela, na cor primária do tema.
export function BotaoPrincipal({ rotulo, onPress, desabilitado = false, carregando = false }: BotaoPrincipalProps) {
    const theme = useTheme();
    const parado = desabilitado || carregando;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={rotulo}
            accessibilityState={{ busy: carregando }}
            disabled={parado}
            onPress={onPress}
            style={({ pressed }) => [
                styles.botao,
                { backgroundColor: theme.primaria, opacity: desabilitado ? 0.4 : pressed ? 0.7 : 1 },
            ]}>
            {carregando ? (
                <ActivityIndicator color={theme.background} />
            ) : (
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                    {rotulo}
                </ThemedText>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    botao: {
        borderRadius: Spacing.three,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.four,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
