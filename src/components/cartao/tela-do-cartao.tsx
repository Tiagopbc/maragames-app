import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { FundoDaMarca } from '@/components/fundo-da-marca';
import { TextoComCodigo } from '@/components/texto-com-codigo';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TEXTOS, numeroDaCarta, peDaCartaParaLeitor } from '@/constants/textos';
import { useCartao } from '@/hooks/use-cartao';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRelevo, useTheme } from '@/hooks/use-theme';

// A logo na placa da carta. No escuro, a cabeça do lobo em lilás, recortada justa; no claro, a
// logo roxa de sempre, que tem folga em volta e por isso entra maior para ocupar o mesmo lugar.
const LOGO_LILAS = require('@/assets/images/logo-beast-lilas.svg');
const LOGO_ROXA = require('@/assets/images/logo-beast.svg');
const TAMANHO_DA_LOGO = 26;

type TelaDoCartaoProps = {
    topicId: string;
    aoComecarPratica: () => void; // depois do último slide; quem navega é a rota
    aoSair: () => void; // o X: fecha sem começar a prática
    // O botão do último slide. Quem relê o cartão com a prática fechada (item 30) não vai para
    // a prática: a rota troca o rótulo e o destino.
    rotuloDoFim?: string;
};

// Cartão de conceito: os slides do tópico, um por vez, antes da prática (item 19). Cada slide é
// uma "carta de jogo": o título numa placa com a logo, o texto numa caixa e, no pé, o tipo da
// carta e o número dela. Nada aqui é gravado: em que slide a pessoa está só existe enquanto a
// tela está aberta.
export function TelaDoCartao({ topicId, aoComecarPratica, aoSair, rotuloDoFim = TEXTOS.comecarPratica }: TelaDoCartaoProps) {
    const theme = useTheme();
    const relevo = useRelevo();
    const escuro = useColorScheme() === 'dark';
    const { estado, tentarDeNovo } = useCartao(topicId);
    const [indice, setIndice] = useState(0);

    // Tópico sem cartão: não há o que ler, então a prática abre direto. A ref garante uma
    // chamada só, mesmo que a rota entregue uma função nova a cada desenho.
    const jaPulou = useRef(false);
    const semCartao = estado.tipo === 'vazio';
    useEffect(() => {
        if (!semCartao || jaPulou.current) return;
        jaPulou.current = true;
        aoComecarPratica();
    }, [semCartao, aoComecarPratica]);

    const pronto = estado.tipo === 'pronto' ? estado : null;
    const slide = pronto?.slides[indice];
    const ultimo = pronto !== null && indice === pronto.slides.length - 1;

    return (
        <FundoDaMarca style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.cabecalho}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={TEXTOS.sairDoCartao}
                        hitSlop={Spacing.three}
                        onPress={aoSair}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </Pressable>
                    <ThemedText type="smallBold" style={styles.titulo} numberOfLines={1}>
                        {pronto?.titulo}
                    </ThemedText>
                </View>

                {(estado.tipo === 'carregando' || estado.tipo === 'vazio') && (
                    <View style={styles.centro}>
                        <ActivityIndicator
                            accessibilityLabel={estado.tipo === 'vazio' ? TEXTOS.abrindoPratica : undefined}
                        />
                    </View>
                )}

                {estado.tipo === 'erro' && (
                    <View style={styles.centro}>
                        <ThemedText style={styles.textoCentral}>{TEXTOS.erroAoCarregarCartao}</ThemedText>
                        <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={tentarDeNovo} />
                    </View>
                )}

                {pronto && slide && (
                    <>
                        {/* Uma barra por slide: as já vistas e a atual ficam na cor primária. */}
                        <View style={styles.progresso}>
                            {pronto.slides.map((s, i) => (
                                <View
                                    key={s.titulo}
                                    style={[
                                        styles.barra,
                                        { backgroundColor: i <= indice ? theme.primaria : theme.borda },
                                    ]}
                                />
                            ))}
                        </View>

                        <View
                            style={[
                                styles.carta,
                                {
                                    backgroundColor: theme.cartao,
                                    borderColor: theme.bordaDoCartao,
                                    borderBottomWidth: 1.5 + relevo.espessura,
                                },
                            ]}>
                            <View style={[styles.placa, { backgroundColor: theme.placaDaCarta }]}>
                                <ThemedText style={styles.tituloDoSlide}>{slide.titulo}</ThemedText>
                                <View style={styles.logo}>
                                    <Image
                                        source={escuro ? LOGO_LILAS : LOGO_ROXA}
                                        contentFit="contain"
                                        style={escuro ? styles.logoJusta : styles.logoComFolga}
                                    />
                                </View>
                            </View>

                            {/* O texto rola dentro da caixa; a `key` recomeça do topo a cada slide. */}
                            <ScrollView
                                key={indice}
                                style={[
                                    styles.caixa,
                                    { backgroundColor: theme.caixaDaCarta, borderColor: theme.bordaDaCaixa },
                                ]}
                                contentContainerStyle={styles.conteudo}>
                                <TextoComCodigo style={styles.textoDoSlide}>{slide.texto}</TextoComCodigo>
                            </ScrollView>

                            {/* A posição fica no pé, como o número de uma carta colecionável; o
                                leitor de tela ouve a frase inteira. */}
                            <View
                                accessible
                                accessibilityLabel={peDaCartaParaLeitor(indice, pronto.slides.length)}
                                style={styles.pe}>
                                <ThemedText type="smallBold" themeColor="textoDoPe">
                                    {TEXTOS.conceito}
                                </ThemedText>
                                <ThemedText type="smallBold" themeColor="textoDoPe">
                                    {numeroDaCarta(indice, pronto.slides.length)}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.rodape}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={TEXTOS.voltar}
                                disabled={indice === 0}
                                onPress={() => setIndice((i) => i - 1)}
                                style={({ pressed }) => [
                                    styles.voltar,
                                    {
                                        backgroundColor: theme.cartao,
                                        opacity: indice === 0 ? 0.4 : pressed ? 0.7 : 1,
                                    },
                                    // No escuro, o card roxo com relevo; no claro, sem borda, como antes.
                                    relevo.espessura > 0 && {
                                        borderWidth: 1.5,
                                        borderBottomWidth: 1.5 + relevo.espessura,
                                        borderColor: theme.bordaDoCartao,
                                    },
                                ]}>
                                <ThemedText type="smallBold">{TEXTOS.voltar}</ThemedText>
                            </Pressable>

                            <View style={styles.avancar}>
                                {ultimo ? (
                                    <BotaoPrincipal rotulo={rotuloDoFim} onPress={aoComecarPratica} />
                                ) : (
                                    <BotaoPrincipal rotulo={TEXTOS.proximo} onPress={() => setIndice((i) => i + 1)} />
                                )}
                            </View>
                        </View>
                    </>
                )}
            </SafeAreaView>
        </FundoDaMarca>
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
    progresso: { flexDirection: 'row', gap: Spacing.one, paddingHorizontal: Spacing.four },
    barra: { flex: 1, height: 4, borderRadius: 2 },
    carta: {
        flex: 1,
        gap: Spacing.two,
        marginTop: Spacing.three,
        marginHorizontal: Spacing.four,
        padding: Spacing.two,
        borderRadius: 18,
        borderWidth: 1.5,
    },
    placa: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: 12,
        paddingLeft: 14,
        paddingRight: 12,
        borderRadius: 12,
    },
    tituloDoSlide: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: 700 },
    logo: { width: TAMANHO_DA_LOGO, height: TAMANHO_DA_LOGO, alignItems: 'center', justifyContent: 'center' },
    logoJusta: { width: TAMANHO_DA_LOGO, height: TAMANHO_DA_LOGO },
    // A cabeça ocupa 860 dos 1080 do quadro da logo roxa.
    logoComFolga: { width: (TAMANHO_DA_LOGO * 1080) / 860, height: (TAMANHO_DA_LOGO * 1080) / 860 },
    caixa: { flex: 1, borderRadius: 12, borderWidth: 1 },
    conteudo: { padding: Spacing.three },
    textoDoSlide: { fontSize: 18, lineHeight: 28 },
    pe: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
    rodape: {
        flexDirection: 'row',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
    },
    voltar: {
        borderRadius: Spacing.three,
        paddingHorizontal: Spacing.four,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avancar: { flex: 1 },
});
