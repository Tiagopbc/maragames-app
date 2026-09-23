import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';

import { CampoTexto } from '@/components/campo-texto';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import {
    tudoValido,
    validarConfirmacao,
    validarEmail,
    validarSenha,
    type Erro,
} from '@/lib/validacao';

const ERROS: Record<string, string> = {
    'auth/email-already-in-use': 'Já existe conta com esse email. Tente entrar.',
    'auth/invalid-email': 'Esse email não parece válido.',
    'auth/weak-password': 'Senha fraca demais para o servidor.',
    'auth/network-request-failed': 'Sem conexão com o servidor.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
};

export default function SignUpScreen() {
    const { cadastrarComEmail, entrarComGoogle } = useSession();

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');

    const [erros, setErros] = useState<Record<string, Erro>>({});
    const [erroGeral, setErroGeral] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);

    function validar(): Record<string, Erro> {
        return {
            email: validarEmail(email),
            senha: validarSenha(senha),
            confirmacao: validarConfirmacao(senha, confirmacao),
        };
    }

    async function enviar() {
        const novos = validar();
        setErros(novos);
        if (!tudoValido(novos)) return;

        setErroGeral(null);
        setCarregando(true);
        try {
            await cadastrarComEmail(email.trim(), senha);
        } catch (e: any) {
            setErroGeral(ERROS[e?.code] ?? 'Não foi possível criar a conta. Tente de novo.');
        } finally {
            setCarregando(false);
        }
    }

    async function comGoogle() {
        setErroGeral(null);
        setCarregando(true);
        try {
            await entrarComGoogle();
        } catch (e: any) {
            setErroGeral(ERROS[e?.code] ?? 'Não foi possível entrar com o Google.');
        } finally {
            setCarregando(false);
        }
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.card}>
                <ThemedText type="subtitle">Criar conta</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    Depois a gente completa seu perfil.
                </ThemedText>

                <CampoTexto
                    rotulo="Email"
                    erro={erros.email}
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => setErros((e) => ({ ...e, email: validarEmail(email) }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    editable={!carregando}
                />

                <CampoTexto
                    rotulo="Senha"
                    placeholder="8+ caracteres, com letra e número"
                    erro={erros.senha}
                    value={senha}
                    onChangeText={setSenha}
                    onBlur={() => setErros((e) => ({ ...e, senha: validarSenha(senha) }))}
                    secureTextEntry
                    autoComplete="new-password"
                    editable={!carregando}
                />

                <CampoTexto
                    rotulo="Repetir senha"
                    erro={erros.confirmacao}
                    value={confirmacao}
                    onChangeText={setConfirmacao}
                    onBlur={() =>
                        setErros((e) => ({ ...e, confirmacao: validarConfirmacao(senha, confirmacao) }))
                    }
                    secureTextEntry
                    autoComplete="new-password"
                    editable={!carregando}
                    onSubmitEditing={enviar}
                />

                {erroGeral && (
                    <ThemedText type="small" themeColor="erro">
                        {erroGeral}
                    </ThemedText>
                )}

                <Pressable disabled={carregando} onPress={enviar}>
                    <ThemedView
                        type="backgroundSelected"
                        style={[styles.botao, carregando && styles.desabilitado]}>
                        {carregando ? (
                            <ActivityIndicator />
                        ) : (
                            <ThemedText type="smallBold">Criar conta</ThemedText>
                        )}
                    </ThemedView>
                </Pressable>

                {Platform.OS === 'web' && (
                    <Pressable disabled={carregando} onPress={comGoogle}>
                        <ThemedView type="backgroundElement" style={styles.botao}>
                            <ThemedText type="smallBold">Continuar com Google</ThemedText>
                        </ThemedView>
                    </Pressable>
                )}

                <Link href="/sign-in">
                    <ThemedText type="linkPrimary">Já tenho conta — entrar</ThemedText>
                </Link>
            </ThemedView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { width: '100%', maxWidth: 360, gap: Spacing.three, padding: Spacing.four },
    botao: {
        borderRadius: Spacing.three,
        paddingVertical: Spacing.three,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    desabilitado: { opacity: 0.5 },
});