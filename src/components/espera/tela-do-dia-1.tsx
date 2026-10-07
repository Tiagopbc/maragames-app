import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { ResultadoDoBloco } from '@/components/resultado/resultado-do-bloco';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TEXTOS } from '@/constants/textos';
import { useDia1 } from '@/hooks/use-dia-1';
import { useTheme } from '@/hooks/use-theme';
import type { FormaPre } from '@/types/domain';

type TelaDoDia1Props = {
    uid: string;
    formaPre: FormaPre;
    aoSair: () => void; // fecha a tela; quem navega é a rota
};

// O que a pessoa vê enquanto espera o reteste (M5): o resultado do pós-teste, agrupado como em
// todo bloco medido, e os tópicos que ficam travados até lá, com o motivo.
export function TelaDoDia1({ uid, formaPre, aoSair }: TelaDoDia1Props) {
    const theme = useTheme();
    const { estado, tentarDeNovo } = useDia1({ uid, formaPre });

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.cabecalho}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={TEXTOS.voltarAoInicio}
                        hitSlop={Spacing.three}
                        onPress={aoSair}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </Pressable>
                    <ThemedText type="smallBold" style={styles.titulo} numberOfLines={1}>
                        {TEXTOS.seuDia1}
                    </ThemedText>
                </View>

                {estado.tipo === 'carregando' && (
                    <View style={styles.centro}>
                        <ActivityIndicator />
                    </View>
                )}

                {estado.tipo === 'erro' && (
                    <View style={styles.centro}>
                        <ThemedText style={styles.textoCentral}>{TEXTOS.erroAoCarregarDia1}</ThemedText>
                        <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={tentarDeNovo} />
                    </View>
                )}

                {estado.tipo === 'pronto' && (
                    <ScrollView contentContainerStyle={styles.conteudo}>
                        <ResultadoDoBloco relatorio={estado.relatorio} medido />

                        <View style={styles.secao}>
                            <ThemedText type="smallBold">{TEXTOS.travadosAteOReteste}</ThemedText>
                            <View
                                style={[
                                    styles.lista,
                                    { backgroundColor: theme.backgroundElement, borderColor: theme.borda },
                                ]}>
                                {estado.travados.map((topico) => (
                                    <View
                                        key={topico.id}
                                        accessible
                                        accessibilityLabel={`${topico.titulo}, ${TEXTOS.topicoTravado}`}
                                        style={styles.linha}>
                                        <Ionicons name="lock-closed" size={18} color={theme.textSecondary} />
                                        <ThemedText themeColor="textSecondary" style={styles.nomeDoTopico}>
                                            {topico.titulo}
                                        </ThemedText>
                                    </View>
                                ))}
                            </View>
                            <ThemedText type="small" themeColor="textSecondary" style={styles.textoCentral}>
                                {TEXTOS.porQueTravados}
                            </ThemedText>
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
    safeArea: { flex: 1, maxWidth: MaxContentWidth },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
    },
    titulo: { flex: 1 },
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.three,
        padding: Spacing.four,
    },
    textoCentral: { textAlign: 'center' },
    conteudo: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
    secao: { gap: Spacing.two },
    lista: { gap: Spacing.three, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    nomeDoTopico: { flex: 1 },
});
