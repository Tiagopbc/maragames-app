import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextoComCodigo } from '@/components/texto-com-codigo';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Antes de confirmar só existem 'normal' e 'selecionada'. 'certa', 'errada' e 'apagada'
// aparecem no feedback da prática, nunca nos blocos medidos.
export type EstadoDaAlternativa = 'normal' | 'selecionada' | 'certa' | 'errada' | 'apagada';

// Como cada estado aparece: a cor da borda e do quadrado da letra e, no feedback, um ícone.
type Aparencia = { cor: ThemeColor | null; icone: keyof typeof Ionicons.glyphMap | null };

// O estado é dito por forma e por cor: a selecionada ganha borda e quadrado cheios; certa e
// errada ganham também um ícone, para quem não distingue verde de vermelho.
const APARENCIA: Record<EstadoDaAlternativa, Aparencia> = {
    normal: { cor: null, icone: null },
    selecionada: { cor: 'bordaSelecionada', icone: null },
    certa: { cor: 'sucesso', icone: 'checkmark-circle' },
    errada: { cor: 'erro', icone: 'close-circle' },
    apagada: { cor: null, icone: null },
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
    const { cor, icone } = APARENCIA[estado];
    const selecionada = estado === 'selecionada';

    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${letra}. ${texto.replaceAll('`', '')}`}
            aria-checked={marcada}
            disabled={desabilitada}
            onPress={onPress}
            style={({ pressed }) => [
                styles.item,
                {
                    backgroundColor: selecionada ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: cor ? theme[cor] : theme.borda,
                    opacity: estado === 'apagada' ? 0.5 : pressed ? 0.7 : 1,
                },
            ]}>
            <View
                style={[
                    styles.letra,
                    // Selecionada: o roxo do botão. Certa e errada: a cor do próprio estado.
                    { backgroundColor: selecionada ? theme.botao : cor ? theme[cor] : theme.background },
                    !cor && { borderWidth: 1.5, borderColor: theme.borda },
                ]}>
                <ThemedText
                    type="smallBold"
                    // Sobre a cor de estado, a letra usa a cor do fundo da tela: é o par que o
                    // teste de contraste confere, nos dois temas.
                    themeColor={selecionada ? 'textoDoBotao' : cor ? 'background' : 'textSecondary'}>
                    {letra}
                </ThemedText>
            </View>
            <View style={styles.texto}>
                <TextoComCodigo>{texto}</TextoComCodigo>
            </View>
            {icone && cor && <Ionicons name={icone} size={22} color={theme[cor]} />}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        minHeight: 56,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    letra: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    texto: { flex: 1 },
});
