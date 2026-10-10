import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraDeProgresso } from '@/components/barra-de-progresso';
import { BotaoPrincipal } from '@/components/botao-principal';
import { GradeDeQuadrantes } from '@/components/resultado/grade-de-quadrantes';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
    NIVEIS_DE_CONFIANCA,
    ROTULO_CONFIANCA,
    TEXTOS,
    antesEDepois,
    contarDias,
    dominioEmContagem,
    formatarTaxa,
    formatarXp,
    resumirQuadrantes,
    verificacaoEHoje,
} from '@/constants/textos';
import type { EstadoDasLicoes } from '@/hooks/use-licoes';
import { useTheme } from '@/hooks/use-theme';
import { resumoDasRespostas, revisaoPorTopico } from '@/lib/progresso';
import { ORDEM_DE_REVISAO } from '@/lib/resultado';

type TelaDoProgressoProps = {
    estado: EstadoDasLicoes; // chega do `useLicoes`; quem lê e recarrega é a rota
    aoAbrir: (topicId: string) => void; // abre o detalhe do tópico; quem navega é a rota
    aoTentarDeNovo: () => void;
    aoSair: () => void;
};

const QUANTAS_A_REVISAR = 3;

// O Progresso (Fase 5 do plano): o que o aluno sabe e se ele sabe que sabe. Só entra o que já
// pode aparecer: a prática sempre, e os blocos sem feedback depois de concluídos (item 30).
export function TelaDoProgresso({ estado, aoAbrir, aoTentarDeNovo, aoSair }: TelaDoProgressoProps) {
    const theme = useTheme();
    const pronto = estado.tipo === 'pronto' ? estado : null;
    const cartao = { backgroundColor: theme.backgroundElement, borderColor: theme.borda };
    const resumo = pronto ? resumoDasRespostas(pronto.aVista) : null;
    // As lições com resposta à vista, da mais fraca para a mais forte. É a ordem das duas listas.
    const porRevisao = pronto
        ? revisaoPorTopico(
              pronto.aVista,
              pronto.licoes.map((l) => l.topicId)
          ).flatMap((revisao) => {
              const licao = pronto.licoes.find((l) => l.topicId === revisao.topicId);
              return licao && licao.dominio ? [{ licao, dominio: licao.dominio, quadrantes: revisao.quadrantes }] : [];
          })
        : [];
    // O que revisar primeiro: as três mais fracas. Lição em que tudo está firme não entra.
    const aRevisar = porRevisao.filter((l) => ORDEM_DE_REVISAO.some((q) => l.quadrantes[q] > 0)).slice(0, QUANTAS_A_REVISAR);

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
                        {TEXTOS.progresso}
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

                {pronto && pronto.aVista.length === 0 && (
                    <View style={styles.centro}>
                        <ThemedText type="subtitle" style={styles.textoCentral}>
                            {TEXTOS.semRespostasAVista}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.textoCentral}>
                            {TEXTOS.quandoOsNumerosAparecem}
                        </ThemedText>
                    </View>
                )}

                {pronto && resumo && pronto.aVista.length > 0 && (
                    <ScrollView contentContainerStyle={styles.conteudo}>
                        <View style={styles.linha}>
                            <View style={[styles.cartao, styles.numeroDoTopo, cartao]}>
                                <ThemedText type="small" themeColor="textSecondary">
                                    {TEXTOS.xpTotal}
                                </ThemedText>
                                {/* O total tem piso em 0 (item 14). */}
                                <ThemedText style={styles.numero}>{formatarXp(pronto.xp ?? 0)}</ThemedText>
                            </View>
                            <View style={[styles.cartao, styles.numeroDoTopo, cartao]}>
                                <ThemedText type="small" themeColor="textSecondary">
                                    {TEXTOS.sequencia}
                                </ThemedText>
                                <ThemedText style={styles.numero}>{contarDias(pronto.sequencia)}</ThemedText>
                            </View>
                        </View>

                        {/* Vem antes dos quadrantes: "em que assunto eu preciso melhorar" é a primeira pergunta. */}
                        <View style={styles.secao}>
                            <ThemedText type="smallBold">{TEXTOS.revisarPrimeiro}</ThemedText>
                            {aRevisar.length === 0 && (
                                <ThemedText themeColor="textSecondary">{TEXTOS.nadaARevisar}</ThemedText>
                            )}
                            {aRevisar.map(({ licao, dominio, quadrantes }) => {
                                const oQueHa = resumirQuadrantes(quadrantes);
                                return (
                                    <Pressable
                                        key={licao.topicId}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Revisar ${licao.titulo}, ${oQueHa}`}
                                        onPress={() => aoAbrir(licao.topicId)}
                                        style={({ pressed }) => [styles.cartao, cartao, { opacity: pressed ? 0.7 : 1 }]}>
                                        <View style={styles.par}>
                                            <ThemedText style={[styles.cresce, styles.nome]}>{licao.titulo}</ThemedText>
                                            <ThemedText type="smallBold" themeColor="primaria">
                                                {formatarTaxa(dominio.acertos, dominio.total)}
                                            </ThemedText>
                                        </View>
                                        <ThemedText type="small" themeColor="textSecondary">
                                            {oQueHa}
                                        </ThemedText>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={styles.secao}>
                            <ThemedText type="smallBold">{TEXTOS.comoVoceRespondeu}</ThemedText>
                            <GradeDeQuadrantes quadrantes={resumo.quadrantes} />
                        </View>

                        <View style={styles.secao}>
                            <ThemedText type="smallBold">{TEXTOS.acertoPorConfianca}</ThemedText>
                            {NIVEIS_DE_CONFIANCA.map((nivel) => {
                                const valor = formatarTaxa(resumo.porConfianca[nivel].acertos, resumo.porConfianca[nivel].total);
                                return (
                                    <View
                                        key={nivel}
                                        accessible
                                        accessibilityLabel={`${ROTULO_CONFIANCA[nivel]}: ${valor}`}
                                        style={styles.par}>
                                        <ThemedText style={styles.cresce}>{ROTULO_CONFIANCA[nivel]}</ThemedText>
                                        <ThemedText themeColor="textSecondary">{valor}</ThemedText>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={styles.secao}>
                            <ThemedText type="smallBold">{TEXTOS.meuDominio}</ThemedText>
                            {porRevisao.map(({ licao, dominio, quadrantes }) => {
                                const oQueHa = resumirQuadrantes(quadrantes);
                                const { resultado } = licao;
                                return (
                                    <Pressable
                                        key={licao.topicId}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${licao.titulo}, ${dominioEmContagem(dominio)}`}
                                        onPress={() => aoAbrir(licao.topicId)}
                                        style={({ pressed }) => [styles.cartao, cartao, { opacity: pressed ? 0.7 : 1 }]}>
                                        <View style={styles.par}>
                                            <ThemedText style={[styles.cresce, styles.nome]}>{licao.titulo}</ThemedText>
                                            <ThemedText type="smallBold" themeColor="primaria">
                                                {formatarTaxa(dominio.acertos, dominio.total)}
                                            </ThemedText>
                                        </View>
                                        <BarraDeProgresso
                                            rotulo={TEXTOS.progressoDaLicao}
                                            feitas={dominio.acertos}
                                            total={dominio.total}
                                        />
                                        {resultado?.ciclo === 'completo' && (
                                            <ThemedText type="small" themeColor="textSecondary">
                                                {resultado.revisao
                                                    ? verificacaoEHoje(resultado.depois, resultado.revisao)
                                                    : antesEDepois(resultado.antes, resultado.depois)}
                                            </ThemedText>
                                        )}
                                        {oQueHa !== '' && (
                                            <ThemedText type="small" themeColor="textSecondary">
                                                {oQueHa}
                                            </ThemedText>
                                        )}
                                    </Pressable>
                                );
                            })}
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
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    textoCentral: { textAlign: 'center' },
    conteudo: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
    linha: { flexDirection: 'row', gap: Spacing.two },
    secao: { gap: Spacing.two },
    cartao: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
    numeroDoTopo: { flex: 1, gap: Spacing.one },
    numero: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
    par: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 32 },
    cresce: { flex: 1 },
    nome: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
});
