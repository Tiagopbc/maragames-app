import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ROTULO_DO_TEMA, TEXTOS } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import { PREFERENCIAS_DE_TEMA, assinarPreferenciaDeTema, escolherTema, preferenciaDeTema } from '@/lib/tema';

// A escolha do tema, no Perfil: do sistema, claro ou escuro. Muda na hora e fica guardada no
// aparelho (`src/lib/tema.ts`); não faz parte do perfil, então não passa pelo "Salvar alterações".
export function SeletorDeTema() {
    const theme = useTheme();
    const escolhida = useSyncExternalStore(assinarPreferenciaDeTema, preferenciaDeTema, preferenciaDeTema);

    return (
        <View style={styles.secao}>
            <ThemedText type="small" themeColor="textSecondary">
                {TEXTOS.aparencia}
            </ThemedText>

            <View accessibilityRole="radiogroup" style={styles.opcoes}>
                {PREFERENCIAS_DE_TEMA.map((preferencia) => {
                    const ativa = escolhida === preferencia;
                    return (
                        <Pressable
                            key={preferencia}
                            accessibilityRole="radio"
                            accessibilityLabel={ROTULO_DO_TEMA[preferencia]}
                            aria-checked={ativa}
                            onPress={() => escolherTema(preferencia)}
                            // O mesmo desenho das opções de experiência: a marcada muda de borda,
                            // de fundo e de peso.
                            style={[
                                styles.opcao,
                                {
                                    backgroundColor: ativa ? theme.backgroundSelected : theme.background,
                                    borderColor: ativa ? theme.bordaSelecionada : theme.borda,
                                },
                            ]}>
                            <ThemedText type={ativa ? 'smallBold' : 'small'} style={styles.rotulo}>
                                {ROTULO_DO_TEMA[preferencia]}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    secao: { gap: Spacing.two },
    opcoes: { flexDirection: 'row', gap: Spacing.two },
    opcao: {
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.one,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotulo: { textAlign: 'center' },
});
