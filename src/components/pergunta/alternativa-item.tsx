import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextoComCodigo } from '@/components/texto-com-codigo';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Antes de confirmar só existem 'normal' e 'selecionada'. 'certa', 'errada' e 'apagada'
// aparecem no feedback da prática, nunca nos blocos medidos.
export type EstadoDaAlternativa = 'normal' | 'selecionada' | 'certa' | 'errada' | 'apagada';

type Aparencia = { icone: keyof typeof Ionicons.glyphMap; cor: ThemeColor };

// O estado é dito por ícone e por cor: quem não distingue verde de vermelho lê o ícone.
const APARENCIA: Record<EstadoDaAlternativa, Aparencia> = {
    normal: { icone: 'radio-button-off', cor: 'textSecondary' },
    selecionada: { icone: 'radio-button-on', cor: 'primaria' },
    certa: { icone: 'checkmark-circle', cor: 'sucesso' },
    errada: { icone: 'close-circle', cor: 'erro' },
    apagada: { icone: 'radio-button-off', cor: 'textSecondary' },
};

type AlternativaItemProps = {
    letra: string; // posição na tela (A, B, C, D), não o id da alternativa
    texto: string;
    estado: EstadoDaAlternativa;
    marcada: boolean; // é a escolha do aluno, antes ou depois de confirmar
    desabilitada: boolean;
    onPress: () => void;
};

export function AlternativaItem({ letra, texto, estado, marcada, desabilitada, onPress }: AlternativaItemProps) {
    const theme = useTheme();
    const { icone, cor } = APARENCIA[estado];
    const destacada = estado !== 'normal' && estado !== 'apagada';

    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${letra}. ${texto.replaceAll('`', '')}`}
            accessibilityState={{ checked: marcada }}
            disabled={desabilitada}
            onPress={onPress}
            style={({ pressed }) => [
                styles.item,
                {
                    backgroundColor: destacada ? theme.backgroundSelected : theme.backgroundElement,
                    // Selecionada usa a borda de seleção; certa e errada, a cor do próprio estado.
                    borderColor: !destacada
                        ? theme.borda
                        : estado === 'selecionada'
                          ? theme.bordaSelecionada
                          : theme[cor],
                    opacity: estado === 'apagada' ? 0.5 : pressed ? 0.7 : 1,
                },
            ]}>
            <Ionicons name={icone} size={22} color={theme[cor]} />
            <ThemedText type="smallBold" themeColor="textSecondary">
                {letra}
            </ThemedText>
            <View style={styles.texto}>
                <TextoComCodigo>{texto}</TextoComCodigo>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        minHeight: 52,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Spacing.three,
        borderWidth: 2,
    },
    texto: { flex: 1 },
});
