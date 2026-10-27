import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { FundoDaMarca } from '@/components/fundo-da-marca';
import { Mascote } from '@/components/mascote';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TERMO, TEXTOS_DO_TERMO } from '@/constants/termo';
import { useTheme } from '@/hooks/use-theme';

type TelaDeConsentimentoProps =
    | {
          somenteLeitura?: false;
          aoAceitar: () => Promise<void>; // grava o aceite; se rejeitar, a tela avisa e deixa tentar de novo
          aoSair: () => void; // "Agora não": fecha sem gravar nada
      }
    // Aberto pelo Perfil, para reler: o texto e um Fechar, sem caixa e sem aceite.
    | { somenteLeitura: true; aoSair: () => void };

// Mostra o termo e colhe o aceite. Não sabe como o aceite é gravado (isso é da sessão e do
// repositório) nem para onde a navegação vai depois (isso é da rota).
export function TelaDeConsentimento(props: TelaDeConsentimentoProps) {
    const { aoSair } = props;
    const theme = useTheme();
    const [concordo, setConcordo] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState(false);
    const ocupado = useRef(false); // barra o toque duplo antes de a tela redesenhar

    async function aceitar() {
        if (props.somenteLeitura || !concordo || ocupado.current) return;
        ocupado.current = true;
        setErro(false);
        setEnviando(true);
        try {
            await props.aoAceitar();
        } catch (e) {
            console.warn('Não foi possível registrar o consentimento.', e);
            setErro(true);
        } finally {
            ocupado.current = false;
            setEnviando(false);
        }
    }

    return (
        <FundoDaMarca style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.conteudo}>
                    <Mascote />
                    <ThemedText type="subtitle">{TEXTOS_DO_TERMO.titulo}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        {TEXTOS_DO_TERMO.versao}
                    </ThemedText>

                    {TERMO.map((secao) => (
                        <View key={secao.titulo} style={styles.secao}>
                            <ThemedText type="smallBold">{secao.titulo}</ThemedText>
                            <ThemedText themeColor="textSecondary">{secao.texto}</ThemedText>
                        </View>
                    ))}
                </ScrollView>

                {props.somenteLeitura ? (
                    <View style={styles.rodape}>
                        <BotaoPrincipal rotulo={TEXTOS_DO_TERMO.fechar} onPress={aoSair} />
                    </View>
                ) : (
                    <View style={styles.rodape}>
                        <Pressable
                            accessibilityRole="checkbox"
                            accessibilityLabel={TEXTOS_DO_TERMO.concordo}
                            aria-checked={concordo}
                            disabled={enviando}
                            onPress={() => setConcordo((marcado) => !marcado)}
                            style={styles.caixa}>
                            <Ionicons
                                name={concordo ? 'checkbox' : 'square-outline'}
                                size={24}
                                color={concordo ? theme.primaria : theme.textSecondary}
                            />
                            <ThemedText type="smallBold" style={styles.textoDaCaixa}>
                                {TEXTOS_DO_TERMO.concordo}
                            </ThemedText>
                        </Pressable>

                        {erro && (
                            <ThemedText type="small" themeColor="erro" aria-live="polite">
                                {TEXTOS_DO_TERMO.erroAoAceitar}
                            </ThemedText>
                        )}

                        <BotaoPrincipal
                            rotulo={TEXTOS_DO_TERMO.aceitar}
                            desabilitado={!concordo}
                            carregando={enviando}
                            onPress={aceitar}
                        />

                        <Pressable accessibilityRole="button" disabled={enviando} onPress={aoSair} style={styles.agoraNao}>
                            <ThemedText type="linkPrimary">{TEXTOS_DO_TERMO.agoraNao}</ThemedText>
                        </Pressable>
                    </View>
                )}
            </SafeAreaView>
        </FundoDaMarca>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
    safeArea: { flex: 1, maxWidth: MaxContentWidth },
    conteudo: { gap: Spacing.four, padding: Spacing.four },
    secao: { gap: Spacing.one },
    rodape: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
    caixa: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
    textoDaCaixa: { flex: 1 },
    agoraNao: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
});
