import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { BotaoPrincipal } from '@/components/botao-principal';
import { Mascote } from '@/components/mascote';
import { GradeDeQuadrantes } from '@/components/resultado/grade-de-quadrantes';
import { ResultadoDoBloco } from '@/components/resultado/resultado-do-bloco';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
    TEXTOS,
    acertosDoTopico,
    antesEDepois,
    diasSeguidos,
    formatarXp,
    quandoARevisaoAbre,
    verificacaoEHoje,
} from '@/constants/textos';
import type { Relatorio } from '@/hooks/use-bloco';
import { useLicao } from '@/hooks/use-licao';
import { useTheme } from '@/hooks/use-theme';
import type { FormaPre } from '@/types/domain';

// O fim de cada passo de uma lição (item 30). Entram no lugar do resultado do bloco, dentro da
// tela do bloco: quem escolhe qual mostrar e para onde o botão leva é a rota.

/** Fim do diagnóstico: nenhum número. O acerto dele só aparece no fim da lição, ao lado do depois. */
export function DiagnosticoFeito({ aoContinuar }: { aoContinuar: () => void }) {
    const theme = useTheme();

    return (
        <View style={styles.centro}>
            <Ionicons name="checkmark-done-circle" size={56} color={theme.sucesso} />
            <ThemedText type="subtitle" style={styles.textoCentral}>
                {TEXTOS.diagnosticoFeito}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.textoCentral}>
                {TEXTOS.diagnosticoFeitoDetalhe}
            </ThemedText>
            <BotaoPrincipal rotulo={TEXTOS.irParaOCartao} onPress={aoContinuar} />
        </View>
    );
}

type PraticaFeitaProps = {
    relatorio: Relatorio;
    rotulo: string; // "Fazer a verificação" no meio da lição; "Voltar para a lição" ao rever
    aoContinuar: () => void;
};

/** Fim da prática: o resultado de sempre, com as questões a revisar, e o botão do passo seguinte. */
export function PraticaFeita({ relatorio, rotulo, aoContinuar }: PraticaFeitaProps) {
    const theme = useTheme();

    return (
        <>
            <ScrollView contentContainerStyle={styles.conteudo}>
                <ResultadoDoBloco relatorio={relatorio} medido={false} />
            </ScrollView>
            <View style={[styles.rodape, { borderTopColor: theme.borda }]}>
                <BotaoPrincipal rotulo={rotulo} onPress={aoContinuar} />
            </View>
        </>
    );
}

type FimDaLicaoProps = {
    uid: string;
    topicId: string;
    formaPre: FormaPre | null;
    aoSair: () => void; // volta para a página da lição; quem navega é a rota
    relogio?: () => number; // ms; trocável em teste
};

/**
 * Fim da verificação, da revisão ou, no ciclo curto, da prática: a sequência de dias e o
 * resultado da lição. Nada por questão: a revisão repete as questões da verificação, e dizer
 * quais a pessoa errou ensinaria o que vai ser medido de novo (item 27).
 */
export function FimDaLicao({ uid, topicId, formaPre, aoSair, relogio }: FimDaLicaoProps) {
    const theme = useTheme();
    // A mesma conta da página da lição, refeita agora que o passo terminou.
    const { estado, recarregar } = useLicao({ uid, topicId, formaPre, relogio });

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

    if (estado.tipo !== 'pronto' || estado.resultado === null) {
        return (
            <View style={styles.centro}>
                <ThemedText style={styles.textoCentral}>{TEXTOS.erroAoCarregarLicao}</ThemedText>
                <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={recarregar} />
            </View>
        );
    }

    const { licao, resultado, sequencia, titulo } = estado;
    const concluida = licao.estado.tipo === 'concluida';

    return (
        <>
            <ScrollView contentContainerStyle={[styles.conteudo, styles.aoCentro]}>
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
                    {concluida ? TEXTOS.licaoConcluida : TEXTOS.verificacaoFeita}
                </ThemedText>

                {resultado.ciclo === 'curto' ? (
                    <ThemedText themeColor="textSecondary" style={styles.textoCentral}>
                        {acertosDoTopico(resultado.pratica.acertos, resultado.pratica.total, titulo, resultado.xp)}
                    </ThemedText>
                ) : (
                    <>
                        <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
                            <ThemedText type="small" themeColor="textSecondary">
                                {TEXTOS.xpDaLicao}
                            </ThemedText>
                            {/* O saldo aparece como é, inclusive negativo (item 14). */}
                            <ThemedText style={styles.xp}>{formatarXp(resultado.xp)}</ThemedText>
                            <ThemedText style={styles.textoCentral}>
                                {resultado.revisao
                                    ? verificacaoEHoje(resultado.depois, resultado.revisao)
                                    : antesEDepois(resultado.antes, resultado.depois)}
                            </ThemedText>
                            {licao.estado.tipo === 'aguardando_revisao' && (
                                <ThemedText type="small" themeColor="textSecondary" style={styles.textoCentral}>
                                    {quandoARevisaoAbre(licao.estado.liberaEm)}
                                </ThemedText>
                            )}
                        </View>

                        <View style={styles.secao}>
                            <ThemedText type="smallBold">{TEXTOS.comoVoceRespondeu}</ThemedText>
                            <GradeDeQuadrantes quadrantes={resultado.quadrantes} />
                        </View>
                    </>
                )}
            </ScrollView>

            <View style={[styles.rodape, { borderTopColor: theme.borda }]}>
                <BotaoPrincipal rotulo={TEXTOS.voltarParaALicao} onPress={aoSair} />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    textoCentral: { textAlign: 'center' },
    conteudo: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
    aoCentro: { alignItems: 'center', gap: Spacing.three },
    circulo: {
        width: 132,
        height: 132,
        borderRadius: 66,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numero: { fontSize: 48, lineHeight: 54, fontWeight: 700 },
    cartao: {
        alignSelf: 'stretch',
        alignItems: 'center',
        gap: Spacing.one,
        padding: Spacing.three,
        borderRadius: 16,
        borderWidth: 1,
    },
    xp: { fontSize: 40, lineHeight: 48, fontWeight: 700 },
    secao: { alignSelf: 'stretch', gap: Spacing.two },
    rodape: {
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});
