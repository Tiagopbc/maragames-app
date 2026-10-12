import { Link } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { BotaoPrincipal } from '@/components/botao-principal';
import { BotaoSecundario } from '@/components/botao-secundario';
import { CampoSenha } from '@/components/campo-senha';
import { CampoTexto } from '@/components/campo-texto';
import { LogoBeast } from '@/components/logo-beast';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TEXTOS_DO_LOGIN } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { validarEmail } from '@/lib/validacao';

const ERROS: Record<string, string> = {
    'auth/invalid-credential': 'Email ou senha incorretos.',
    'auth/invalid-email': 'Esse email não parece válido.',
    'auth/user-disabled': 'Essa conta foi desativada.',
    'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com o servidor.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
};

export default function SignInScreen() {
    const theme = useTheme();
    const { entrarComEmail, entrarComGoogle, redefinirSenha } = useSession();

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);

    async function executar(acao: () => Promise<void>) {
        setErro(null);
        setAviso(null);
        setCarregando(true);
        try {
            await acao();
        } catch (e: any) {
            setErro(ERROS[e?.code] ?? TEXTOS_DO_LOGIN.erroAoEntrar);
        } finally {
            setCarregando(false);
        }
    }

    const enviar = () => executar(() => entrarComEmail(email, senha));

    // O link vai para o e-mail que estiver digitado no campo de cima.
    async function esqueciASenha() {
        setAviso(null);
        if (validarEmail(email)) {
            setErro(TEXTOS_DO_LOGIN.informeOEmailParaRedefinir);
            return;
        }

        setErro(null);
        setCarregando(true);
        try {
            await redefinirSenha(email.trim());
            setAviso(TEXTOS_DO_LOGIN.linkDeRedefinicaoEnviado);
        } catch (e: any) {
            setErro(ERROS[e?.code] ?? TEXTOS_DO_LOGIN.erroAoEnviarOLink);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <ThemedView style={styles.container}>
            <View style={styles.coluna}>
                <View style={styles.topo}>
                    <LogoBeast />
                    <ThemedText themeColor="primaria" style={styles.marca}>
                        {TEXTOS_DO_LOGIN.marca}
                    </ThemedText>
                    <ThemedText type="title" style={styles.centro}>
                        {TEXTOS_DO_LOGIN.chamada}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.centro}>
                        {TEXTOS_DO_LOGIN.convite}
                    </ThemedText>
                </View>

                <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
                    <CampoTexto
                        rotulo={TEXTOS_DO_LOGIN.email}
                        placeholder={TEXTOS_DO_LOGIN.exemploDeEmail}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        keyboardType="email-address"
                        editable={!carregando}
                    />

                    <CampoSenha
                        rotulo={TEXTOS_DO_LOGIN.senha}
                        placeholder={TEXTOS_DO_LOGIN.dicaDaSenha}
                        value={senha}
                        onChangeText={setSenha}
                        autoComplete="current-password"
                        editable={!carregando}
                        onSubmitEditing={enviar}
                    />

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={TEXTOS_DO_LOGIN.esqueciASenha}
                        disabled={carregando}
                        onPress={esqueciASenha}
                        style={styles.esqueci}>
                        <ThemedText type="linkPrimary">{TEXTOS_DO_LOGIN.esqueciASenha}</ThemedText>
                    </Pressable>

                    {erro && (
                        <ThemedText type="small" themeColor="erro" aria-live="polite">
                            {erro}
                        </ThemedText>
                    )}
                    {aviso && (
                        <ThemedText type="small" themeColor="sucesso" aria-live="polite">
                            {aviso}
                        </ThemedText>
                    )}

                    <BotaoPrincipal
                        rotulo={TEXTOS_DO_LOGIN.entrar}
                        desabilitado={!email || !senha}
                        carregando={carregando}
                        onPress={enviar}
                    />

                    {Platform.OS === 'web' && (
                        <BotaoSecundario
                            rotulo={TEXTOS_DO_LOGIN.entrarComGoogle}
                            desabilitado={carregando}
                            onPress={() => executar(entrarComGoogle)}
                        />
                    )}
                </View>

                <View style={styles.cadastro}>
                    <ThemedText type="small" themeColor="textSecondary">
                        {TEXTOS_DO_LOGIN.semConta}
                    </ThemedText>
                    <Link href="/sign-up">
                        <ThemedText type="linkPrimary">{TEXTOS_DO_LOGIN.criarConta}</ThemedText>
                    </Link>
                </View>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    coluna: { width: '100%', maxWidth: 400, gap: Spacing.four, padding: Spacing.four },
    topo: { alignItems: 'center', gap: Spacing.two },
    marca: { fontSize: 20, lineHeight: 26, fontWeight: 600 },
    centro: { textAlign: 'center' },
    cartao: { gap: Spacing.three, padding: Spacing.three, borderRadius: 20, borderWidth: 1 },
    esqueci: { alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center' },
    cadastro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
});
