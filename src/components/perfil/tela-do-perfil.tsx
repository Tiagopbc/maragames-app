import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoSecundario } from '@/components/botao-secundario';
import { FormularioDoPerfil } from '@/components/perfil/formulario-do-perfil';
import { Secao } from '@/components/perfil/secao';
import { SeletorDeTema } from '@/components/perfil/seletor-de-tema';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TEXTOS, termoAceitoEm } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import type { DadosPerfil, Perfil } from '@/types/domain';

type TelaDoPerfilProps = {
    perfil: Perfil;
    aoSalvar: (dados: DadosPerfil) => Promise<void>;
    // Quem entra pelo Google não tem senha neste app, e não vê o botão de redefinir.
    entraComSenha: boolean;
    aoRedefinirSenha: () => Promise<void>; // pede o e-mail com o link; rejeita se não conseguir
    aoLerOTermo: () => void;
    aoSairDaConta: () => void;
    aoSair: () => void; // fecha a tela; quem navega é a rota
};

type Envio = 'parado' | 'enviando' | 'enviado' | 'falhou';

// O Perfil (Fase 6 do plano), em seções: os dados do cadastro, editáveis; a conta, com o
// e-mail e a senha; a escolha do tema; o termo; e o Sair.
// A validação é a do cadastro, e quem garante é a regra do Firestore (item 9).
export function TelaDoPerfil({
    perfil,
    aoSalvar,
    entraComSenha,
    aoRedefinirSenha,
    aoLerOTermo,
    aoSairDaConta,
    aoSair,
}: TelaDoPerfilProps) {
    const theme = useTheme();
    const [envio, setEnvio] = useState<Envio>('parado');

    async function redefinirSenha() {
        setEnvio('enviando');
        try {
            await aoRedefinirSenha();
            setEnvio('enviado');
        } catch (e) {
            console.warn('Não foi possível pedir a redefinição da senha.', e);
            setEnvio('falhou');
        }
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.cabecalho}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={TEXTOS.voltarAoInicio}
                        hitSlop={Spacing.three}
                        onPress={aoSair}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </Pressable>
                    <ThemedText type="subtitle" style={styles.titulo}>
                        {TEXTOS.perfil}
                    </ThemedText>
                </View>

                <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
                    <Secao titulo={TEXTOS.meusDados}>
                        <FormularioDoPerfil
                            inicial={perfil}
                            rotuloDoBotao={TEXTOS.salvarAlteracoes}
                            aoSalvar={aoSalvar}
                            soComMudanca
                            mensagemDeSucesso={TEXTOS.alteracoesSalvas}
                        />
                    </Secao>

                    <Secao titulo={TEXTOS.conta}>
                        {/* O e-mail é a credencial da conta: aparece, mas não é campo. */}
                        <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
                            <ThemedText type="small" themeColor="textSecondary">
                                {TEXTOS.emailDaConta}
                            </ThemedText>
                            <ThemedText>{perfil.email}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                                {entraComSenha ? TEXTOS.entraPorSenha : TEXTOS.entraPeloGoogle}
                            </ThemedText>
                        </View>

                        {entraComSenha && (
                            <BotaoSecundario
                                rotulo={TEXTOS.redefinirASenha}
                                desabilitado={envio === 'enviando'}
                                onPress={redefinirSenha}
                            />
                        )}
                        {envio === 'enviado' && (
                            <ThemedText type="small" themeColor="sucesso" aria-live="polite">
                                {TEXTOS.linkEnviadoParaAConta}
                            </ThemedText>
                        )}
                        {envio === 'falhou' && (
                            <ThemedText type="small" themeColor="erro" aria-live="polite">
                                {TEXTOS.erroAoEnviarOLink}
                            </ThemedText>
                        )}
                    </Secao>

                    <Secao titulo={TEXTOS.aparencia}>
                        <SeletorDeTema />
                    </Secao>

                    <Secao titulo={TEXTOS.estudo}>
                        <ThemedText type="small" themeColor="textSecondary">
                            {perfil.consentiuEm !== undefined ? termoAceitoEm(perfil.consentiuEm) : TEXTOS.termoAindaNaoAceito}
                        </ThemedText>
                        <BotaoSecundario rotulo={TEXTOS.lerOTermo} onPress={aoLerOTermo} />
                    </Secao>

                    <BotaoSecundario rotulo={TEXTOS.sair} onPress={aoSairDaConta} />
                </ScrollView>
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
    conteudo: { gap: Spacing.five, paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
    cartao: { gap: Spacing.half, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
});
