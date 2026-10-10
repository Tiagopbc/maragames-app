import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { FormularioDoPerfil } from '@/components/perfil/formulario-do-perfil';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';

// O primeiro preenchimento do perfil: todos os campos são obrigatórios (item 8). Ao salvar, a
// navegação troca de tela sozinha, pelo estado da sessão (item 7).
export default function CompleteProfileScreen() {
    const { user, salvarPerfil, sair } = useSession();

    return (
        <ThemedView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <ThemedView style={styles.card}>
                    <ThemedText type="subtitle">Seu perfil</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        Falta pouco para começar. Entrando como {user?.email}.
                    </ThemedText>

                    <FormularioDoPerfil
                        inicial={{
                            nome: user?.displayName ?? '',
                            apelido: '',
                            telefone: '',
                            instituicao: '',
                            curso: '',
                            experiencia: 'iniciante',
                        }}
                        rotuloDoBotao="Salvar e começar"
                        aoSalvar={salvarPerfil}
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
    card: { width: '100%', maxWidth: 420, gap: Spacing.three },
    sair: { textAlign: 'center' },
});
