import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { BotaoSecundario } from '@/components/botao-secundario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import {
    SITUACAO_DA_ETAPA,
    TEXTOS,
    TITULO_DA_ETAPA,
    acertosDoTopico,
    antesEDepois,
    detalheDaEtapa,
    formatarXp,
    quandoARevisaoAbre,
    rotuloDoBotaoDaLicao,
    verificacaoEHoje,
} from '@/constants/textos';
import type { EstadoDaLicaoDoAluno } from '@/hooks/use-licao';
import { useTheme } from '@/hooks/use-theme';
import {
    destinoDaLicao,
    etapasDaLicao,
    podeAbrirNaLicao,
    type DestinoDaLicao,
    type SituacaoDaEtapa,
} from '@/lib/licao';

type TelaDaLicaoProps = {
    estado: EstadoDaLicaoDoAluno; // chega do `useLicao`; quem lê e recarrega é a rota
    temForma: boolean; // o termo já foi aceito
    aoAbrir: (destino: DestinoDaLicao) => void; // quem navega é a rota
    aoTentarDeNovo: () => void;
    aoSair: () => void;
};

const ICONE_DA_SITUACAO: Record<SituacaoDaEtapa, { nome: keyof typeof Ionicons.glyphMap; cor: ThemeColor }> = {
    feito: { nome: 'checkmark-circle', cor: 'sucesso' },
    agora: { nome: 'play-circle', cor: 'primaria' },
    espera: { nome: 'time-outline', cor: 'textSecondary' },
    depois: { nome: 'ellipse-outline', cor: 'textSecondary' },
};

// A página de uma lição (item 30): as etapas do ciclo, o passo da vez e, com a verificação
// feita, o resultado. Só desenha: o estado chega pronto e a trava é de `src/lib/licao.ts`.
export function TelaDaLicao({ estado, temForma, aoAbrir, aoTentarDeNovo, aoSair }: TelaDaLicaoProps) {
    const theme = useTheme();
    const pronto = estado.tipo === 'pronto' ? estado : null;
    const destino = pronto ? destinoDaLicao(pronto.licao, temForma) : null;
    // O cartão e a prática que a trava deixa abrir fora do passo da vez (D2 do plano).
    const podeReverCartao =
        pronto !== null &&
        pronto.temCartao &&
        podeAbrirNaLicao(pronto.licao, 'cartao', temForma) &&
        !(destino?.tipo === 'passo' && destino.passo === 'cartao');
    const podeVerPratica =
        pronto !== null && pronto.licao.estado.tipo === 'concluida' && podeAbrirNaLicao(pronto.licao, 'pratica', temForma);

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.cabecalho}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={TEXTOS.fecharLicao}
                        hitSlop={Spacing.three}
                        onPress={aoSair}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </Pressable>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.modulo} numberOfLines={1}>
                        {pronto?.modulo}
                    </ThemedText>
                </View>

                {estado.tipo === 'carregando' && (
                    <View style={styles.centro}>
                        <ActivityIndicator />
                    </View>
                )}

                {estado.tipo === 'erro' && (
                    <View style={styles.centro}>
                        <ThemedText style={styles.textoCentral}>{TEXTOS.erroAoCarregarLicao}</ThemedText>
                        <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={aoTentarDeNovo} />
                    </View>
                )}

                {estado.tipo === 'inexistente' && (
                    <View style={styles.centro}>
                        <ThemedText style={styles.textoCentral}>{TEXTOS.licaoNaoExiste}</ThemedText>
                        <BotaoPrincipal rotulo={TEXTOS.voltarAoInicio} onPress={aoSair} />
                    </View>
                )}

                {pronto && (
                    <>
                        <ScrollView contentContainerStyle={styles.conteudo}>
                            <ThemedText type="subtitle">{pronto.titulo}</ThemedText>

                            <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
                                {etapasDaLicao(pronto.licao).map(({ etapa, situacao }) => {
                                    const detalhe = detalheDaEtapa(etapa, pronto.questoesPorEtapa[etapa], pronto.licao.estado);
                                    const icone = ICONE_DA_SITUACAO[situacao];
                                    return (
                                        <View
                                            key={etapa}
                                            accessible
                                            accessibilityLabel={`${TITULO_DA_ETAPA[etapa]}, ${SITUACAO_DA_ETAPA[situacao]}, ${detalhe}`}
                                            style={styles.etapa}>
                                            <Ionicons name={icone.nome} size={22} color={theme[icone.cor]} />
                                            <ThemedText
                                                type={situacao === 'agora' ? 'smallBold' : 'default'}
                                                themeColor={situacao === 'depois' ? 'textSecondary' : 'text'}
                                                style={styles.nomeDaEtapa}>
                                                {TITULO_DA_ETAPA[etapa]}
                                            </ThemedText>
                                            <ThemedText type="small" themeColor="textSecondary">
                                                {detalhe}
                                            </ThemedText>
                                        </View>
                                    );
                                })}
                            </View>

                            {pronto.resultado && (
                                <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
                                    {pronto.resultado.ciclo === 'curto' ? (
                                        <ThemedText>
                                            {acertosDoTopico(
                                                pronto.resultado.pratica.acertos,
                                                pronto.resultado.pratica.total,
                                                pronto.titulo,
                                                pronto.resultado.xp
                                            )}
                                        </ThemedText>
                                    ) : (
                                        <>
                                            <ThemedText type="small" themeColor="textSecondary">
                                                {TEXTOS.xpDaLicao}
                                            </ThemedText>
                                            {/* O saldo aparece como é, inclusive negativo (item 14). */}
                                            <ThemedText style={styles.numero}>{formatarXp(pronto.resultado.xp)}</ThemedText>
                                            <ThemedText>{antesEDepois(pronto.resultado.antes, pronto.resultado.depois)}</ThemedText>
                                            {pronto.resultado.revisao && (
                                                <ThemedText>
                                                    {verificacaoEHoje(pronto.resultado.depois, pronto.resultado.revisao)}
                                                </ThemedText>
                                            )}
                                        </>
                                    )}
                                    {pronto.licao.estado.tipo === 'aguardando_revisao' && (
                                        <ThemedText type="small" themeColor="textSecondary">
                                            {quandoARevisaoAbre(pronto.licao.estado.liberaEm)}
                                        </ThemedText>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        {(destino || podeReverCartao || podeVerPratica) && (
                            <View style={[styles.rodape, { borderTopColor: theme.borda }]}>
                                {destino?.tipo === 'termo' && (
                                    <ThemedText type="small" themeColor="textSecondary">
                                        {TEXTOS.termoAntesDoDiagnostico}
                                    </ThemedText>
                                )}
                                {destino && (
                                    <BotaoPrincipal
                                        rotulo={rotuloDoBotaoDaLicao(pronto.licao.estado)}
                                        onPress={() => aoAbrir(destino)}
                                    />
                                )}
                                {podeReverCartao && (
                                    <BotaoSecundario
                                        rotulo={TEXTOS.reverCartao}
                                        onPress={() => aoAbrir({ tipo: 'passo', passo: 'cartao' })}
                                    />
                                )}
                                {podeVerPratica && (
                                    <BotaoSecundario
                                        rotulo={TEXTOS.verPratica}
                                        onPress={() => aoAbrir({ tipo: 'passo', passo: 'pratica' })}
                                    />
                                )}
                            </View>
                        )}
                    </>
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
    modulo: { flex: 1 },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    textoCentral: { textAlign: 'center' },
    conteudo: { gap: Spacing.three, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
    cartao: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
    etapa: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 36 },
    nomeDaEtapa: { flex: 1 },
    numero: { fontSize: 32, lineHeight: 38, fontWeight: 700 },
    rodape: {
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});
