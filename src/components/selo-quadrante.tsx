import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { ROTULO_QUADRANTE } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import type { Quadrante } from '@/lib/quadrante';

type Aparencia = { icone: keyof typeof Ionicons.glyphMap; cor: ThemeColor };

const APARENCIA: Record<Quadrante, Aparencia> = {
    firme: { icone: 'shield-checkmark', cor: 'sucesso' },
    fragil: { icone: 'leaf', cor: 'aviso' },
    lacuna: { icone: 'help-circle', cor: 'textSecondary' },
    ponto_cego: { icone: 'eye-off', cor: 'erro' },
};

// O quadrante chega calculado (src/lib/quadrante.ts); aqui ele só ganha rótulo, ícone e cor.
export function SeloQuadrante({ quadrante }: { quadrante: Quadrante }) {
    const theme = useTheme();
    const { icone, cor } = APARENCIA[quadrante];

    return (
        <View style={[styles.selo, { borderColor: theme[cor] }]}>
            <Ionicons name={icone} size={16} color={theme[cor]} />
            <ThemedText type="smallBold" themeColor={cor}>
                {ROTULO_QUADRANTE[quadrante]}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    selo: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.one,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two,
        borderRadius: Spacing.three,
        borderWidth: 1.5,
    },
});
