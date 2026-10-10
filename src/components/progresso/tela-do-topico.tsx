import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { GradeDeQuadrantes } from '@/components/resultado/grade-de-quadrantes';
import { SeloQuadrante } from '@/components/selo-quadrante';
import { TextoComCodigo } from '@/components/texto-com-codigo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
    NIVEIS_DE_CONFIANCA,
    ROTULO_CONFIANCA,
    TEXTOS,
    antesEDepois,
    formatarTaxa,
    formatarXp,
    passoFeitoEm,
    verificacaoEHoje,
} from '@/constants/textos';
import type { EstadoDasLicoes } from '@/hooks/use-licoes';
import { useTheme } from '@/hooks/use-theme';
import { questoesDaPratica } from '@/lib/bloco';
import { historicoDoTopico, resumoDasRespostas } from '@/lib/progresso';
import { resultadoDoBloco } from '@/lib/resultado';

type TelaDoTopicoProps = {
    estado: EstadoDasLicoes; // chega do `useLicoes`; quem lê e recarrega é a rota
    topicId: string;
    aoAbrirLicao: () => void; // quem navega é a rota
    aoTentarDeNovo: () => void;
    aoSair: () => void;
};

// O detalhe de um tópico no Progresso (Fase 5 do plano). Os números saem só do que já pode
// aparecer; o histórico diz quais passos foram feitos, sem dizer o acerto. Questão só é citada
// se for da prática: as dos blocos sem feedback voltam na revisão (item 27).
export function TelaDoTopico({ estado, topicId, aoAbrirLicao, aoTentarDeNovo, aoSair }: TelaDoTopicoProps) {
    const theme = useTheme();
    const pronto = estado.tipo === 'pronto' ? estado : null;
    const licao = pronto?.licoes.find((l) => l.topicId === topicId);
    const cartao = { backgroundColor: theme.backgroundElement, borderColor: theme.borda };

    const aVista = pronto ? pronto.aVista.filter((r) => r.topicId === topicId) : [];
    const resumo = resumoDasRespostas(aVista);
    const historico = pronto ? historicoDoTopico(pronto.respostas, topicId) : [];
    // Na prática o feedback já foi dado questão a questão, então citá-las não revela nada.
    const aRevisar = pronto
        ? resultadoDoBloco(
              aVista.filter((r) => r.fase === 'pratica'),
              questoesDaPratica(pronto.questoes, topicId)
          ).questoesARevisar
        : [];
    const enunciadoDe = (id: string) => pronto?.questoes.find((q) => q.id === id)?.enunciado ?? '';

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.cabecalho}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={TEXTOS.voltar}
                        hitSlop={Spacing.three}
                        onPress={aoSair}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </Pressable>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cresce} numberOfLines={1}>
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

                {pronto && !licao && (
                    <View style={styles.centro}>
                        <ThemedText style={styles.textoCentral}>{TEXTOS.licaoNaoExiste}</ThemedText>
                        <BotaoPrincipal rotulo={TEXTOS.voltar} onPress={aoSair} />
                    </View>
                )}

                {pronto && licao && (
                    <>
                        <ScrollView contentContainerStyle={styles.conteudo}>
                            <ThemedText type="subtitle">{licao.titulo}</ThemedText>

                            {aVista.length === 0 ? (
                                <View style={[styles.cartao, cartao]}>
                                    <ThemedText>{TEXTOS.semRespostasAVista}</ThemedText>
                                    <ThemedText type="small" themeColor="textSecondary">
                                        {TEXTOS.quandoOsNumerosAparecem}
                                    </ThemedText>
                                </View>
                            ) : (
                                <>
                                    <View style={[styles.cartao, cartao]}>
                                        {licao.dominio && (
                                            <ThemedText style={styles.numero}>
                                                {`Domínio ${formatarTaxa(licao.dominio.acertos, licao.dominio.total)}`}
                                            </ThemedText>
                                        )}
                                        {licao.resultado?.ciclo === 'completo' && (
                                            <>
                                                <ThemedText>
                                                    {antesEDepois(licao.resultado.antes, licao.resultado.depois)}
                                                </ThemedText>
                                                {licao.resultado.revisao && (
                                                    <ThemedText>
                                                        {verificacaoEHoje(licao.resultado.depois, licao.resultado.revisao)}
                                                    </ThemedText>
                                                )}
                                            </>
                                        )}
                                        {licao.resultado && (
                                            <ThemedText type="small" themeColor="textSecondary">
                                                {`${TEXTOS.xpDaLicao}: ${formatarXp(licao.resultado.xp)}`}
                                            </ThemedText>
                                        )}
                                    </View>

                                    <View style={styles.secao}>
                                        <ThemedText type="smallBold">{TEXTOS.comoVoceRespondeu}</ThemedText>
                                        <GradeDeQuadrantes quadrantes={resumo.quadrantes} />
                                    </View>

                                    <View style={styles.secao}>
                                        <ThemedText type="smallBold">{TEXTOS.acertoPorConfianca}</ThemedText>
                                        {NIVEIS_DE_CONFIANCA.map((nivel) => {
                                            const { acertos, total } = resumo.porConfianca[nivel];
                                            const valor = formatarTaxa(acertos, total);
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
                                </>
                            )}

                            {aRevisar.length > 0 && (
                                <View style={styles.secao}>
                                    <ThemedText type="smallBold">{TEXTOS.revisarNaPratica}</ThemedText>
                                    {aRevisar.map((questao) => (
                                        <View key={questao.questionId} style={[styles.cartao, cartao]}>
                                            <SeloQuadrante quadrante={questao.quadrante} />
                                            <TextoComCodigo type="small">{enunciadoDe(questao.questionId)}</TextoComCodigo>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {historico.length > 0 && (
                                <View style={styles.secao}>
                                    <ThemedText type="smallBold">{TEXTOS.historico}</ThemedText>
                                    {historico.map((passo) => (
                                        <View key={passo.fase} style={styles.par}>
                                            <Ionicons name="checkmark-circle" size={18} color={theme.sucesso} />
                                            <ThemedText style={styles.cresce}>{passoFeitoEm(passo.fase, passo.em)}</ThemedText>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        <View style={[styles.rodape, { borderTopColor: theme.borda }]}>
                            <BotaoPrincipal rotulo={TEXTOS.abrirALicao} onPress={aoAbrirLicao} />
                        </View>
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
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    textoCentral: { textAlign: 'center' },
    conteudo: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
    secao: { gap: Spacing.two },
    cartao: { gap: Spacing.one, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
    numero: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
    par: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 32 },
    cresce: { flex: 1 },
    rodape: {
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});
