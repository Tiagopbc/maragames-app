import { StyleSheet, View } from 'react-native';

import { GradeDeQuadrantes } from '@/components/resultado/grade-de-quadrantes';
import { SeloQuadrante } from '@/components/selo-quadrante';
import { TextoComCodigo } from '@/components/texto-com-codigo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
    NIVEIS_DE_CONFIANCA,
    ROTULO_CONFIANCA,
    TEXTOS,
    formatarAcertos,
    formatarTaxa,
    formatarXp,
    resumirQuadrantes,
} from '@/constants/textos';
import type { Relatorio } from '@/hooks/use-bloco';
import { useTheme } from '@/hooks/use-theme';

type ResultadoDoBlocoProps = {
    relatorio: Relatorio;
    // Blocos medidos (pré, pós e reteste) mostram tudo agrupado. Nada por questão: o reteste
    // repete as questões do pós, e dizer quais a pessoa errou ensinaria o que vai ser medido de novo.
    medido: boolean;
    // De que é o XP mostrado. A tela do dia 1 diz que é o do pós-teste, porque a trilha não entra nela.
    rotuloDoXp?: string;
};

// Só apresentação: os números chegam prontos de `resultadoDoBloco` (src/lib/resultado.ts).
export function ResultadoDoBloco({ relatorio, medido, rotuloDoXp = TEXTOS.xpDoBloco }: ResultadoDoBlocoProps) {
    const theme = useTheme();
    const { resultado, enunciados, nomesDosTopicos } = relatorio;
    const cartao = { backgroundColor: theme.backgroundElement };
    const nomeDe = (topicId: string) => nomesDosTopicos[topicId] ?? topicId;

    return (
        <View style={styles.container}>
            <ThemedText type="subtitle">{TEXTOS.resultado}</ThemedText>

            <View style={[styles.cartao, styles.xp, cartao]}>
                <ThemedText type="small" themeColor="textSecondary">
                    {rotuloDoXp}
                </ThemedText>
                {/* O saldo aparece como é, inclusive negativo: é o peso do erro com certeza (item 14). */}
                <ThemedText style={styles.numero}>{formatarXp(resultado.xp)}</ThemedText>
                <ThemedText themeColor="textSecondary">
                    {formatarAcertos(resultado.acertos, resultado.total)}
                </ThemedText>
            </View>

            <Secao titulo={TEXTOS.comoVoceRespondeu}>
                <GradeDeQuadrantes quadrantes={resultado.quadrantes} />
            </Secao>

            {medido && (
                <Secao titulo={TEXTOS.acertoPorTopico}>
                    {resultado.porTopico.map((topico) => (
                        <Linha
                            key={topico.topicId}
                            rotulo={nomeDe(topico.topicId)}
                            valor={formatarTaxa(topico.acertos, topico.total)}
                        />
                    ))}
                </Secao>
            )}

            {medido && (
                <Secao titulo={TEXTOS.acertoPorConfianca}>
                    {NIVEIS_DE_CONFIANCA.map((nivel) => (
                        <Linha
                            key={nivel}
                            rotulo={ROTULO_CONFIANCA[nivel]}
                            valor={formatarTaxa(
                                resultado.porConfianca[nivel].acertos,
                                resultado.porConfianca[nivel].total
                            )}
                        />
                    ))}
                </Secao>
            )}

            <Secao titulo={TEXTOS.revisarPrimeiro}>
                {resultado.questoesARevisar.length === 0 ? (
                    <ThemedText themeColor="textSecondary">{TEXTOS.nadaARevisar}</ThemedText>
                ) : medido ? (
                    resultado.topicosARevisar.map((topicId) => {
                        const topico = resultado.porTopico.find((t) => t.topicId === topicId)!;
                        return (
                            <View key={topicId} style={[styles.cartao, cartao]}>
                                <ThemedText type="smallBold">{nomeDe(topicId)}</ThemedText>
                                <ThemedText type="small" themeColor="textSecondary">
                                    {resumirQuadrantes(topico.quadrantes)}
                                </ThemedText>
                            </View>
                        );
                    })
                ) : (
                    // Na prática o feedback já foi dado questão a questão, então citá-las não revela nada.
                    resultado.questoesARevisar.map((questao) => (
                        <View key={questao.questionId} style={[styles.cartao, cartao]}>
                            <SeloQuadrante quadrante={questao.quadrante} />
                            <TextoComCodigo type="small">{enunciados[questao.questionId] ?? ''}</TextoComCodigo>
                        </View>
                    ))
                )}
            </Secao>
        </View>
    );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <View style={styles.secao}>
            <ThemedText type="smallBold">{titulo}</ThemedText>
            {children}
        </View>
    );
}

// Rótulo à esquerda e valor à direita, lidos juntos por leitor de tela ("Framework MDA: 2 de 3").
function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
    return (
        <View accessible accessibilityLabel={`${rotulo}: ${valor}`} style={styles.linha}>
            <ThemedText style={styles.rotuloDaLinha}>{rotulo}</ThemedText>
            <ThemedText themeColor="textSecondary">{valor}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: Spacing.four },
    secao: { gap: Spacing.two },
    cartao: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
    xp: { alignItems: 'center' },
    numero: { fontSize: 40, lineHeight: 48, fontWeight: 700 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 32 },
    rotuloDaLinha: { flex: 1 },
});
