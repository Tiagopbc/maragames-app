import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { TextoComCodigo } from '@/components/texto-com-codigo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TEXTOS, posicaoNoCartao } from '@/constants/textos';
import { useCartao } from '@/hooks/use-cartao';
import { useTheme } from '@/hooks/use-theme';

type TelaDoCartaoProps = {
    topicId: string;
    aoComecarPratica: () => void; // depois do último slide; quem navega é a rota
    aoSair: () => void; // o X: fecha sem começar a prática
};

// Cartão de conceito: os slides do tópico, um por vez, antes da prática (item 19).
// Nada aqui é gravado: em que slide a pessoa está só existe enquanto a tela está aberta.
export function TelaDoCartao({ topicId, aoComecarPratica, aoSair }: TelaDoCartaoProps) {
    const theme = useTheme();
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
        <ThemedView style={styles.container}>
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
                    {pronto && (
                        <ThemedText type="smallBold" themeColor="textSecondary">
                            {posicaoNoCartao(indice, pronto.slides.length)}
                        </ThemedText>
                    )}
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

                        {/* A `key` recomeça a rolagem do topo a cada slide. */}
                        <ScrollView key={indice} contentContainerStyle={styles.conteudo}>
                            <ThemedText style={styles.tituloDoSlide}>{slide.titulo}</ThemedText>
                            <TextoComCodigo style={styles.textoDoSlide}>{slide.texto}</TextoComCodigo>
                        </ScrollView>

                        <View style={styles.rodape}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={TEXTOS.voltar}
                                disabled={indice === 0}
                                onPress={() => setIndice((i) => i - 1)}
                                style={({ pressed }) => [
                                    styles.voltar,
                                    {
                                        backgroundColor: theme.backgroundElement,
                                        opacity: indice === 0 ? 0.4 : pressed ? 0.7 : 1,
                                    },
                                ]}>
                                <ThemedText type="smallBold">{TEXTOS.voltar}</ThemedText>
                            </Pressable>

                            <View style={styles.avancar}>
                                {ultimo ? (
                                    <BotaoPrincipal rotulo={TEXTOS.comecarPratica} onPress={aoComecarPratica} />
                                ) : (
                                    <BotaoPrincipal rotulo={TEXTOS.proximo} onPress={() => setIndice((i) => i + 1)} />
                                )}
                            </View>
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
    conteudo: { gap: Spacing.three, padding: Spacing.four },
    tituloDoSlide: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
    textoDoSlide: { fontSize: 18, lineHeight: 28 },
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
