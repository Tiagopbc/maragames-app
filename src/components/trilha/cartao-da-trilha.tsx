import { StyleSheet, View } from 'react-native';

import { BotaoPrincipal } from '@/components/botao-principal';
import { BotaoSecundario } from '@/components/botao-secundario';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { TEXTOS, formatarSequencia, progressoDoTopico, tamanhoDoTopico } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import type { Trilha } from '@/lib/trilha';

type CartaoDaTrilhaProps = {
    trilha: Trilha; // chega calculada de src/lib/trilha.ts
    sequencia: number; // dias seguidos com resposta
    nomes: Record<string, string>; // título de cada tópico, por id
    // O botão é o principal da tela só quando o roteiro não tem ação própria (a espera do reteste).
    principal: boolean;
    aoAbrir: () => void; // abre o tópico de hoje; quem navega é a tela
};

// A trilha diária na home (item 23): o tópico de hoje, ou quando vem o próximo.
// Só desenha: a fila dos tópicos e a sequência chegam prontas.
export function CartaoDaTrilha({ trilha, sequencia, nomes, principal, aoAbrir }: CartaoDaTrilhaProps) {
    const theme = useTheme();
    if (trilha.tipo === 'fechada') return null;

    const nomeDe = (topicId: string) => nomes[topicId] ?? topicId;
    const Botao = principal ? BotaoPrincipal : BotaoSecundario;

    return (
        <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
            <View style={styles.topo}>
                <ThemedText type="smallBold" themeColor="primaria" style={styles.rotulo}>
                    {trilha.tipo === 'hoje' ? TEXTOS.topicoDeHoje : TEXTOS.trilhaDiaria}
                </ThemedText>
                {sequencia > 0 && (
                    <View style={[styles.selo, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="smallBold" themeColor="primaria">
                            {formatarSequencia(sequencia)}
                        </ThemedText>
                    </View>
                )}
            </View>

            {trilha.tipo === 'hoje' && (
                <>
                    <ThemedText style={styles.titulo}>{nomeDe(trilha.topicId)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        {trilha.respondidas === 0
                            ? tamanhoDoTopico(trilha.total)
                            : progressoDoTopico(trilha.respondidas, trilha.total)}
                    </ThemedText>
                    <Botao rotulo={trilha.respondidas === 0 ? TEXTOS.comecar : TEXTOS.continuar} onPress={aoAbrir} />
                </>
            )}

            {trilha.tipo === 'amanha' && (
                <>
                    <ThemedText style={styles.titulo}>
                        {trilha.feitoHoje ? TEXTOS.feitoPorHoje : TEXTOS.trilhaComecaAmanha}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        {trilha.feitoHoje
                            ? `Próximo: ${nomeDe(trilha.topicId)}. Libera amanhã.`
                            : `Primeiro tópico: ${nomeDe(trilha.topicId)}.`}
                    </ThemedText>
                </>
            )}

            {trilha.tipo === 'concluida' && <ThemedText style={styles.titulo}>{TEXTOS.trilhaConcluida}</ThemedText>}
        </View>
    );
}

const styles = StyleSheet.create({
    cartao: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
    topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
    rotulo: { flexShrink: 1 },
    selo: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: 999 },
    titulo: { fontSize: 18, lineHeight: 24, fontWeight: 600 },
});
