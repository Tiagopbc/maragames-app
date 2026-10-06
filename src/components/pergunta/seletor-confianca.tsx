import { Ionicons } from '@expo/vector-icons';
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
export function SeletorConfianca({ valor, onChange, desabilitado }: SeletorConfiancaProps) {
    const theme = useTheme();

    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={TEXTOS.perguntaDeConfianca} style={styles.grupo}>
            <ThemedText type="smallBold">{TEXTOS.perguntaDeConfianca}</ThemedText>

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
                                backgroundColor: marcado ? theme.backgroundSelected : theme.backgroundElement,
                                borderColor: marcado ? theme.primaria : theme.backgroundElement,
                                opacity: pressed ? 0.7 : 1,
                            },
                        ]}>
                        <Ionicons
                            name={marcado ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={marcado ? theme.primaria : theme.textSecondary}
                        />
                        <ThemedText type="small">{ROTULO_CONFIANCA[nivel]}</ThemedText>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    grupo: { gap: Spacing.two },
    nivel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        minHeight: 44,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Spacing.three,
        borderWidth: 2,
    },
});
