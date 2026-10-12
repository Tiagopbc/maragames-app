import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { FormularioDoPerfil } from '@/components/perfil/formulario-do-perfil';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LarguraDoFormulario, Spacing } from '@/constants/theme';
import { TEXTOS_DO_PERFIL } from '@/constants/textos';
import { useSession } from '@/lib/session';

// O preenchimento do núcleo do perfil, que é obrigatório (itens 8 e 34). É a tela de quem acabou
// de criar a conta e também a de quem tem um perfil de antes de 12/10/2026, sem os campos novos:
// o que já existe vem preenchido. Ao salvar, a navegação troca de tela sozinha, pelo estado da
// sessão (item 7).
export default function CompleteProfileScreen() {
    const { user, perfil, salvarPerfil, sair } = useSession();

    return (
        <ThemedView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <ThemedView style={styles.card}>
                    <ThemedText type="subtitle">{TEXTOS_DO_PERFIL.seuPerfil}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        Falta pouco para começar. Entrando como {user?.email}.
                    </ThemedText>

                    <FormularioDoPerfil
                        inicial={{ nome: user?.displayName ?? '', ...perfil }}
                        rotuloDoBotao={TEXTOS_DO_PERFIL.salvarEComecar}
                        // O aceite de contato vai junto, na mesma gravação.
                        aoSalvar={(dados, aceitaContato) => salvarPerfil(dados, { aceitaContato: aceitaContato ?? false })}
                        comAceiteDeContato
                    />

                    <Pressable onPress={sair}>
                        <ThemedText type="link" themeColor="textSecondary" style={styles.sair}>
                            Sair
                        </ThemedText>
                    </Pressable>
                </ThemedView>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
    card: { width: '100%', maxWidth: LarguraDoFormulario, gap: Spacing.three },
    sair: { textAlign: 'center' },
});
