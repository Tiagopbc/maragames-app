import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { NIVEIS_DE_CONFIANCA, ROTULO_CONFIANCA, TEXTOS } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import type { Confianca } from '@/types/domain';

type SeletorConfiancaProps = {
    valor: Confianca | null;
    onChange: (confianca: Confianca) => void;
    desabilitado: boolean;
};

// Seleção independente da alternativa: pode ser marcada antes ou depois dela (item 25).
// O componente trabalha com o valor 1, 2 ou 3; o rótulo vem do arquivo de strings.
// Os três níveis ficam lado a lado, numa linha só, para caberem no rodapé fixo da pergunta:
// nenhum deles pode depender de rolar a tela para ser visto.
export function SeletorConfianca({ valor, onChange, desabilitado }: SeletorConfiancaProps) {
    const theme = useTheme();

    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={TEXTOS.perguntaDeConfianca} style={styles.grupo}>
            <ThemedText type="smallBold" themeColor="textSecondary">
                {TEXTOS.perguntaDeConfianca}
            </ThemedText>

            <View style={styles.linha}>
                {NIVEIS_DE_CONFIANCA.map((nivel) => {
                    const marcado = valor === nivel;
                    return (
                        <Pressable
                            key={nivel}
                            accessibilityRole="radio"
                            accessibilityLabel={ROTULO_CONFIANCA[nivel]}
                            accessibilityState={{ checked: marcado }}
                            disabled={desabilitado}
                            onPress={() => onChange(nivel)}
                            style={({ pressed }) => [
                                styles.nivel,
                                {
                                    backgroundColor: marcado ? theme.backgroundSelected : theme.background,
                                    borderColor: marcado ? theme.bordaSelecionada : theme.borda,
                                    opacity: pressed ? 0.7 : 1,
                                },
                            ]}>
                            {/* O marcado muda de borda, de fundo e de peso: não depende só de cor. */}
                            <ThemedText type={marcado ? 'smallBold' : 'small'} style={styles.rotulo}>
                                {ROTULO_CONFIANCA[nivel]}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    grupo: { gap: Spacing.two },
    linha: { flexDirection: 'row', gap: Spacing.two },
    // Larguras iguais; o rótulo quebra em duas linhas se a tela for estreita ou a fonte, grande.
    nivel: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.one,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    rotulo: { textAlign: 'center' },
});
