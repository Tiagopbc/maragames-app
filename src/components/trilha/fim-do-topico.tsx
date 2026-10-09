import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { BotaoPrincipal } from '@/components/botao-principal';
import { Mascote } from '@/components/mascote';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { DIA_ABREVIADO, TEXTOS, acertosDoTopico, diasSeguidos } from '@/constants/textos';
import { useRoteiro } from '@/hooks/use-roteiro';
import { useTheme } from '@/hooks/use-theme';
import type { Participante } from '@/lib/participante';

type FimDoTopicoProps = {
    uid: string;
    participante: Participante;
    topicId: string; // o tópico da trilha que acabou de ser praticado
    acertos: number;
    total: number;
    xp: number; // saldo do tópico; aparece como é, inclusive negativo (item 14)
    aoSair: () => void; // volta para a home; quem navega é a rota
    relogio?: () => number; // ms; trocável em teste
};

// O fim de um tópico da trilha diária (item 23): a sequência de dias, o acerto e o XP do tópico
// e quando vem o próximo. Entra no lugar do resultado detalhado: o feedback já foi dado questão
// a questão, e o que traz a pessoa de volta amanhã é a sequência.
export function FimDoTopico({ uid, participante, topicId, acertos, total, xp, aoSair, relogio }: FimDoTopicoProps) {
    const theme = useTheme();
    // A mesma conta da home, refeita agora que o tópico terminou.
    const { estado, recarregar } = useRoteiro({ uid, participante, relogio });

    useEffect(() => {
        recarregar();
    }, [recarregar]);

    if (estado.tipo === 'carregando') {
        return (
            <View style={styles.centro}>
                <ActivityIndicator />
            </View>
        );
    }

    if (estado.tipo === 'erro') {
        return (
            <View style={styles.centro}>
                <ThemedText style={styles.textoCentral}>{TEXTOS.erroAoCarregarSequencia}</ThemedText>
                <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={recarregar} />
            </View>
        );
    }

    const { trilha, sequencia, semana, nomes } = estado;
    const nomeDe = (id: string) => nomes[id] ?? id;

    return (
        <>
            <ScrollView contentContainerStyle={styles.conteudo}>
                <Mascote altura={120} />

                <View
                    accessible
                    accessibilityLabel={`${sequencia} ${diasSeguidos(sequencia)}`}
                    style={[styles.circulo, { backgroundColor: theme.backgroundSelected, borderColor: theme.bordaSelecionada }]}>
                    <ThemedText themeColor="primaria" style={styles.numero}>
                        {sequencia}
                    </ThemedText>
                    <ThemedText type="smallBold" themeColor="primaria">
                        {diasSeguidos(sequencia)}
                    </ThemedText>
                </View>

                <ThemedText type="subtitle" style={styles.textoCentral}>
                    {sequencia > 1 ? TEXTOS.sequenciaMantida : TEXTOS.sequenciaIniciada}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.textoCentral}>
                    {acertosDoTopico(acertos, total, nomeDe(topicId), xp)}
                </ThemedText>

                <View style={styles.semana}>
                    {semana.map((dia) => (
                        <View key={dia.inicio} style={styles.dia}>
                            <View
                                style={[
                                    styles.bolinha,
                                    // Dia com resposta: cheio. Sem resposta: só o contorno.
                                    dia.ativo
                                        ? { backgroundColor: theme.bordaSelecionada, borderColor: theme.bordaSelecionada }
                                        : { backgroundColor: theme.backgroundElement, borderColor: theme.borda },
                                ]}
                            />
                            <ThemedText type={dia.hoje ? 'smallBold' : 'small'} themeColor={dia.ativo ? 'text' : 'textSecondary'}>
                                {DIA_ABREVIADO[dia.diaDaSemana]}
                            </ThemedText>
                        </View>
                    ))}
                </View>

                {trilha.tipo === 'amanha' && (
                    <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
                        <ThemedText type="smallBold" themeColor="primaria">
                            {TEXTOS.proximoTopico}
                        </ThemedText>
                        <ThemedText style={styles.titulo}>{nomeDe(trilha.topicId)}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                            {TEXTOS.liberaAmanha}
                        </ThemedText>
                    </View>
                )}

                {trilha.tipo === 'concluida' && (
                    <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
                        <ThemedText style={styles.titulo}>{TEXTOS.trilhaConcluida}</ThemedText>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.rodape, { borderTopColor: theme.borda }]}>
                <BotaoPrincipal rotulo={TEXTOS.voltarParaOInicio} onPress={aoSair} />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    textoCentral: { textAlign: 'center' },
    conteudo: { alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
    circulo: {
        width: 132,
        height: 132,
        borderRadius: 66,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numero: { fontSize: 48, lineHeight: 54, fontWeight: 700 },
    semana: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
    dia: { alignItems: 'center', gap: Spacing.one },
    bolinha: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5 },
    cartao: { alignSelf: 'stretch', gap: Spacing.one, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
    titulo: { fontSize: 18, lineHeight: 24, fontWeight: 600 },
    rodape: {
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});
