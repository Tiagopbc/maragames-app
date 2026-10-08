import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { SeloQuadrante } from '@/components/selo-quadrante';
import { TextoComCodigo } from '@/components/texto-com-codigo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { DESCRICAO_QUADRANTE, TEXTOS, formatarXp } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import type { Feedback } from '@/lib/pergunta';

// Só existe na prática. Nos blocos medidos (pré, pós e reteste) este componente nem é montado.
export function FeedbackQuestao({ feedback }: { feedback: Feedback }) {
    const theme = useTheme();
    const cor = feedback.correta ? theme.sucesso : theme.erro;

    return (
        <View
            aria-live="polite"
            style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: cor }]}>
            <View style={styles.linha}>
                <Ionicons name={feedback.correta ? 'checkmark-circle' : 'close-circle'} size={24} color={cor} />
                <ThemedText type="default" style={styles.titulo}>
                    {feedback.correta ? TEXTOS.acertou : TEXTOS.errou}
                </ThemedText>
                <ThemedText type="smallBold">{formatarXp(feedback.xp)}</ThemedText>
            </View>

            <View style={styles.linha}>
                <SeloQuadrante quadrante={feedback.quadrante} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.descricao}>
                    {DESCRICAO_QUADRANTE[feedback.quadrante]}
                </ThemedText>
            </View>

            <TextoComCodigo type="small">{feedback.explicacaoDaEscolha}</TextoComCodigo>

            {feedback.explicacaoDaCorreta !== null && (
                <View style={styles.correta}>
                    <ThemedText type="smallBold">{TEXTOS.respostaCerta}</ThemedText>
                    <TextoComCodigo type="small">{feedback.explicacaoDaCorreta}</TextoComCodigo>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cartao: {
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    titulo: { flex: 1, fontWeight: 700 },
    descricao: { flex: 1 },
    correta: { gap: Spacing.half },
});
