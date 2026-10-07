import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraDeProgresso } from '@/components/barra-de-progresso';
import { BotaoPrincipal } from '@/components/botao-principal';
import { ResultadoDoBloco } from '@/components/resultado/resultado-do-bloco';
import { TextoComCodigo } from '@/components/texto-com-codigo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TEXTOS, TEXTO_DA_FALTA } from '@/constants/textos';
import { useBloco, type EntradaDoBloco, type EstadoDoBloco } from '@/hooks/use-bloco';
import { useTheme } from '@/hooks/use-theme';
import {
    SELECAO_VAZIA,
    faseTemFeedback,
    oQueFalta,
    podeConfirmar,
    type Selecao,
    type SelecaoCompleta,
} from '@/lib/pergunta';

import { AlternativaItem, type EstadoDaAlternativa } from './alternativa-item';
import { FeedbackQuestao } from './feedback-questao';
import { SeletorConfianca } from './seletor-confianca';

const LETRAS = 'ABCD';

type TelaDoBlocoProps = EntradaDoBloco & {
    aoSair: () => void; // fecha a tela; quem navega é a rota
};

// A tela inteira de um bloco: cabeçalho, a pergunta da vez e o fim. Não sabe de onde os dados
// vêm (isso é do hook) nem para onde a navegação vai (isso é da rota).
export function TelaDoBloco({ aoSair, ...entrada }: TelaDoBlocoProps) {
    const theme = useTheme();
    const { estado, titulo, confirmar, avancar, tentarDeNovo } = useBloco(entrada);
    const naQuestao = estado.tipo === 'pergunta' || estado.tipo === 'feedback';

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.cabecalho}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={TEXTOS.sairDoBloco}
                        hitSlop={Spacing.three}
                        onPress={aoSair}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </Pressable>
                    <ThemedText type="smallBold" style={styles.titulo} numberOfLines={1}>
                        {titulo}
                    </ThemedText>
                    {naQuestao && (
                        <ThemedText type="smallBold" themeColor="textSecondary">
                            {estado.pergunta.posicao}/{estado.pergunta.total}
                        </ThemedText>
                    )}
                </View>

                {naQuestao && (
                    <View style={styles.progresso}>
                        {/* Conta as respondidas: no feedback da prática, a questão da vez já entra. */}
                        <BarraDeProgresso
                            rotulo={TEXTOS.progressoDoBloco}
                            feitas={estado.pergunta.posicao - (estado.tipo === 'feedback' ? 0 : 1)}
                            total={estado.pergunta.total}
                        />
                    </View>
                )}

                {estado.tipo === 'carregando' && (
                    <View style={styles.centro}>
                        <ActivityIndicator />
                    </View>
                )}

                {estado.tipo === 'erro' && (
                    <View style={styles.centro}>
                        <ThemedText style={styles.textoCentral}>{estado.mensagem}</ThemedText>
                        {estado.podeTentarDeNovo && (
                            <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={tentarDeNovo} />
                        )}
                        <Pressable accessibilityRole="button" onPress={aoSair}>
                            <ThemedText type="linkPrimary">{TEXTOS.voltarAoInicio}</ThemedText>
                        </Pressable>
                    </View>
                )}

                {/* Fim do bloco: o resultado, calculado das respostas (M4). */}
                {estado.tipo === 'concluido' && estado.relatorio && (
                    <>
                        <ScrollView contentContainerStyle={styles.conteudo}>
                            <ResultadoDoBloco relatorio={estado.relatorio} medido={!faseTemFeedback(entrada.fase)} />
                        </ScrollView>
                        <View style={[styles.rodape, { borderTopColor: theme.borda }]}>
                            <BotaoPrincipal rotulo={TEXTOS.voltarAoInicio} onPress={aoSair} />
                        </View>
                    </>
                )}

                {/* Sem bloco para resumir (prática sem tópico pendente): só a mensagem. */}
                {estado.tipo === 'concluido' && !estado.relatorio && (
                    <View style={styles.centro}>
                        <Ionicons name="checkmark-done-circle" size={56} color={theme.sucesso} />
                        <ThemedText type="subtitle" style={styles.textoCentral}>
                            {TEXTOS.blocoConcluido}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.textoCentral}>
                            {estado.mensagem}
                        </ThemedText>
                        <BotaoPrincipal rotulo={TEXTOS.voltarAoInicio} onPress={aoSair} />
                    </View>
                )}

                {naQuestao && (
                    // A `key` troca o componente a cada questão, e com ele as seleções: nada fica marcado.
                    <Pergunta
                        key={estado.pergunta.questao.id}
                        estado={estado}
                        semFeedback={!faseTemFeedback(entrada.fase)}
                        aoConfirmar={confirmar}
                        aoAvancar={avancar}
                    />
                )}
            </SafeAreaView>
        </ThemedView>
    );
}

type PerguntaProps = {
    estado: Extract<EstadoDoBloco, { tipo: 'pergunta' | 'feedback' }>;
    semFeedback: boolean;
    aoConfirmar: (selecao: SelecaoCompleta) => void;
    aoAvancar: () => void;
};

function Pergunta({ estado, semFeedback, aoConfirmar, aoAvancar }: PerguntaProps) {
    // Alternativa e confiança são dois campos do mesmo estado, marcados em qualquer ordem.
    // Só existem aqui, na tela: trocar de ideia antes de confirmar não gera evento.
    const theme = useTheme();
    const [selecao, setSelecao] = useState<Selecao>(SELECAO_VAZIA);
    const rolagem = useRef<ScrollView>(null);

    const { pergunta } = estado;
    const feedback = estado.tipo === 'feedback' ? estado.feedback : null;
    // Depois de confirmar, vale o que foi gravado, não o que está marcado na tela.
    const marcado: Selecao = estado.tipo === 'feedback' ? estado.resposta : selecao;
    const travado = estado.tipo === 'feedback' || estado.gravando;
    const falta = oQueFalta(selecao);

    // O feedback entra abaixo das alternativas; em tela pequena, sem rolar ele ficaria escondido.
    const temFeedback = feedback !== null;
    useEffect(() => {
        if (temFeedback) rolagem.current?.scrollToEnd({ animated: true });
    }, [temFeedback]);

    function estadoDa(alternativaId: string): EstadoDaAlternativa {
        const escolhida = marcado.escolha === alternativaId;
        if (!feedback) return escolhida ? 'selecionada' : 'normal';
        if (alternativaId === feedback.corretaId) return 'certa';
        return escolhida ? 'errada' : 'apagada';
    }

    return (
        <>
            <ScrollView ref={rolagem} contentContainerStyle={styles.conteudo}>
                {semFeedback && (
                    <ThemedText type="small" themeColor="textSecondary">
                        {TEXTOS.semFeedback}
                    </ThemedText>
                )}

                <TextoComCodigo style={styles.enunciado}>{pergunta.questao.enunciado}</TextoComCodigo>

                <View accessibilityRole="radiogroup" style={styles.alternativas}>
                    {pergunta.alternativas.map((alternativa, i) => (
                        <AlternativaItem
                            key={alternativa.id}
                            letra={LETRAS[i]}
                            texto={alternativa.texto}
                            estado={estadoDa(alternativa.id)}
                            marcada={marcado.escolha === alternativa.id}
                            desabilitada={travado}
                            onPress={() => setSelecao((s) => ({ ...s, escolha: alternativa.id }))}
                        />
                    ))}
                </View>

                {feedback && <FeedbackQuestao feedback={feedback} />}
            </ScrollView>

            {/* Rodapé fixo: só o enunciado, as alternativas e o feedback rolam. A confiança fica
                sempre à vista, junto do Confirmar, por mais longa que seja a questão. */}
            <View testID="rodape-da-pergunta" style={[styles.rodape, { borderTopColor: theme.borda }]}>
                <SeletorConfianca
                    valor={marcado.confianca}
                    desabilitado={travado}
                    onChange={(confianca) => setSelecao((s) => ({ ...s, confianca }))}
                />

                {estado.tipo === 'feedback' ? (
                    <BotaoPrincipal
                        rotulo={pergunta.ultima ? TEXTOS.concluir : TEXTOS.proxima}
                        onPress={aoAvancar}
                    />
                ) : (
                    <>
                        {estado.erroAoGravar ? (
                            <ThemedText type="small" themeColor="erro" accessibilityLiveRegion="polite">
                                {TEXTOS.erroAoGravar}
                            </ThemedText>
                        ) : (
                            falta && (
                                <ThemedText type="small" themeColor="textSecondary">
                                    {TEXTO_DA_FALTA[falta]}
                                </ThemedText>
                            )
                        )}
                        <BotaoPrincipal
                            rotulo={TEXTOS.confirmar}
                            desabilitado={!podeConfirmar(selecao)}
                            carregando={estado.gravando}
                            onPress={() => {
                                if (podeConfirmar(selecao)) aoConfirmar(selecao);
                            }}
                        />
                    </>
                )}
            </View>
        </>
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
    progresso: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.three,
        padding: Spacing.four,
    },
    textoCentral: { textAlign: 'center' },
    conteudo: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
    enunciado: { fontSize: 20, lineHeight: 28, fontWeight: 600 },
    alternativas: { gap: Spacing.two },
    rodape: {
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});
