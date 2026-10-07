import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

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
    const { entrarComEmail, entrarComGoogle } = useSession();

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);

    async function executar(acao: () => Promise<void>) {
        setErro(null);
        setCarregando(true);
        try {
            await acao();
        } catch (e: any) {
            setErro(ERROS[e?.code] ?? 'Não foi possível entrar. Tente de novo.');
        } finally {
            setCarregando(false);
        }
    }

    const enviar = () => executar(() => entrarComEmail(email, senha));
    const podeEnviar = !!email && !!senha && !carregando;

    const inputStyle = [styles.input, { color: theme.text, borderColor: theme.borda }];

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.card}>
                <ThemedText type="subtitle">Entrar</ThemedText>

                <TextInput
                    style={inputStyle}
                    placeholder="email"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    editable={!carregando}
                />

                <TextInput
                    style={inputStyle}
                    placeholder="senha"
                    placeholderTextColor={theme.textSecondary}
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry
                    autoComplete="current-password"
                    editable={!carregando}
                    onSubmitEditing={enviar}
                />

                {erro && (
                    <ThemedText type="small" themeColor="textSecondary">
                        {erro}
                    </ThemedText>
                )}

                <Pressable disabled={!podeEnviar} onPress={enviar}>
                    <ThemedView
                        type="backgroundSelected"
                        style={[styles.botao, !podeEnviar && styles.desabilitado]}>
                        {carregando ? <ActivityIndicator /> : <ThemedText type="smallBold">Entrar</ThemedText>}
                    </ThemedView>
                </Pressable>

                {Platform.OS === 'web' && (
                    <Pressable disabled={carregando} onPress={() => executar(entrarComGoogle)}>
                        <ThemedView type="backgroundElement" style={styles.botao}>
                            <ThemedText type="smallBold">Continuar com Google</ThemedText>
                        </ThemedView>
                    </Pressable>
                )}

                <Link href="/sign-up">
                    <ThemedText type="linkPrimary">Não tenho conta — criar perfil</ThemedText>
                </Link>
            </ThemedView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { width: '100%', maxWidth: 360, gap: Spacing.three, padding: Spacing.four },
    input: {
        borderWidth: 1,
        borderRadius: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    botao: {
        borderRadius: Spacing.three,
        paddingVertical: Spacing.three,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    desabilitado: { opacity: 0.5 },
});