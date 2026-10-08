import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BotaoPrincipal } from '@/components/botao-principal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TEXTOS } from '@/constants/textos';
import { useSession } from '@/lib/session';

// Endereço que não existe. Aparece na web, para quem digita ou segue um link errado; sem este
// arquivo, o Expo Router mostra a tela padrão dele, em inglês.
export default function NaoEncontradaScreen() {
    const router = useRouter();
    const { user, perfilCompleto } = useSession();
    // O "início" de cada um é a tela que o layout raiz deixa abrir: a home é protegida, e mandar
    // para ela quem não entrou não sai do lugar.
    const inicio = !user ? '/sign-in' : perfilCompleto ? '/' : '/complete-profile';

    return (
        <ThemedView style={styles.container}>
            <View style={styles.conteudo}>
                <ThemedText type="subtitle" style={styles.centro}>
                    {TEXTOS.paginaNaoExiste}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.centro}>
                    {TEXTOS.paginaNaoExisteDetalhe}
                </ThemedText>
                {/* `replace`, e não `push`: voltar não deve trazer o endereço errado de novo. */}
                <BotaoPrincipal rotulo={TEXTOS.voltarAoInicio} onPress={() => router.replace(inicio)} />
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    conteudo: { width: '100%', maxWidth: MaxContentWidth / 2, gap: Spacing.three, padding: Spacing.four },
    centro: { textAlign: 'center' },
});
