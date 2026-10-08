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

// A ação principal da tela: uma por tela, no roxo da marca.
export function BotaoPrincipal({ rotulo, onPress, desabilitado = false, carregando = false }: BotaoPrincipalProps) {
    const theme = useTheme();
    const parado = desabilitado || carregando;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={rotulo}
            aria-busy={carregando}
            disabled={parado}
            onPress={onPress}
            style={({ pressed }) => [
                styles.botao,
                { backgroundColor: theme.botao, opacity: desabilitado ? 0.4 : pressed ? 0.7 : 1 },
            ]}>
            {carregando ? (
                <ActivityIndicator color={theme.textoDoBotao} />
            ) : (
                <ThemedText themeColor="textoDoBotao" style={styles.rotulo}>
                    {rotulo}
                </ThemedText>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    botao: {
        borderRadius: 14,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.four,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotulo: { fontWeight: 600, textAlign: 'center' },
});
