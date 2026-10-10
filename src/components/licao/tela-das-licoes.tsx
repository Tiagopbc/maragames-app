import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { TEXTOS, dominioEmContagem, situacaoDaLicao } from '@/constants/textos';
import type { EstadoDasLicoes, LicaoDoAluno } from '@/hooks/use-licoes';
import { useTheme } from '@/hooks/use-theme';
import type { EstadoDaLicao } from '@/lib/licao';

type TelaDasLicoesProps = {
    estado: EstadoDasLicoes; // chega do `useLicoes`; quem lê e recarrega é a rota
    aoAbrir: (topicId: string) => void; // quem navega é a rota
    aoTentarDeNovo: () => void;
    aoSair: () => void;
};

const ICONE_DO_ESTADO: Record<EstadoDaLicao['tipo'], { nome: keyof typeof Ionicons.glyphMap; cor: ThemeColor }> = {
    nova: { nome: 'ellipse-outline', cor: 'textSecondary' },
    diagnostico: { nome: 'play-circle', cor: 'primaria' },
    estudo: { nome: 'play-circle', cor: 'primaria' },
    verificacao: { nome: 'play-circle', cor: 'primaria' },
    aguardando_revisao: { nome: 'time-outline', cor: 'textSecondary' },
    revisao: { nome: 'refresh-circle', cor: 'primaria' },
    concluida: { nome: 'checkmark-circle', cor: 'sucesso' },
};

// As lições chegam na ordem sugerida; o módulo de cada grupo é o da primeira lição dele.
function porModulo(licoes: readonly LicaoDoAluno[]): { modulo: string; licoes: LicaoDoAluno[] }[] {
    const grupos: { modulo: string; licoes: LicaoDoAluno[] }[] = [];
    for (const licao of licoes) {
        const modulo = licao.modulo ?? TEXTOS.outrasLicoes;
        const grupo = grupos.find((g) => g.modulo === modulo);
        if (grupo) grupo.licoes.push(licao);
        else grupos.push({ modulo, licoes: [licao] });
    }
    return grupos;
}

// A lista de lições (item 30): todas, por módulo, cada uma com a situação e o domínio. Qualquer
// uma abre, em qualquer ordem. Só desenha: os estados chegam prontos.
export function TelaDasLicoes({ estado, aoAbrir, aoTentarDeNovo, aoSair }: TelaDasLicoesProps) {
    const theme = useTheme();

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
                    <ThemedText type="subtitle" style={styles.titulo}>
                        {TEXTOS.licoes}
                    </ThemedText>
                </View>

                {estado.tipo === 'carregando' && (
                    <View style={styles.centro}>
                        <ActivityIndicator />
                    </View>
                )}

                {estado.tipo === 'erro' && (
                    <View style={styles.centro}>
                        <ThemedText style={styles.textoCentral}>{TEXTOS.erroAoCarregarLicoes}</ThemedText>
                        <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={aoTentarDeNovo} />
                    </View>
                )}

                {estado.tipo === 'pronto' && (
                    <ScrollView contentContainerStyle={styles.conteudo}>
                        {porModulo(estado.licoes).map((grupo) => (
                            <View key={grupo.modulo} style={styles.grupo}>
                                <ThemedText type="smallBold" themeColor="textSecondary">
                                    {grupo.modulo}
                                </ThemedText>
                                {grupo.licoes.map((licao) => {
                                    const situacao = situacaoDaLicao(licao.estado);
                                    const dominio = licao.dominio ? dominioEmContagem(licao.dominio) : null;
                                    const icone = ICONE_DO_ESTADO[licao.estado.tipo];
                                    return (
                                        <Pressable
                                            key={licao.topicId}
                                            accessibilityRole="button"
                                            accessibilityLabel={[licao.titulo, situacao, dominio].filter(Boolean).join(', ')}
                                            onPress={() => aoAbrir(licao.topicId)}
                                            style={({ pressed }) => [
                                                styles.licao,
                                                {
                                                    backgroundColor: theme.backgroundElement,
                                                    borderColor: theme.borda,
                                                    opacity: pressed ? 0.7 : 1,
                                                },
                                            ]}>
                                            <Ionicons name={icone.nome} size={24} color={theme[icone.cor]} />
                                            <View style={styles.textos}>
                                                <ThemedText style={styles.nome}>{licao.titulo}</ThemedText>
                                                <ThemedText type="small" themeColor="textSecondary">
                                                    {[situacao, dominio].filter(Boolean).join(' · ')}
                                                </ThemedText>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}
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
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    textoCentral: { textAlign: 'center' },
    conteudo: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
    grupo: { gap: Spacing.two },
    licao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: 16,
        borderWidth: 1,
    },
    textos: { flex: 1, gap: Spacing.half },
    nome: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
});
