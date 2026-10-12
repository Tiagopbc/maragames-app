import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { BotaoSecundario } from '@/components/botao-secundario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TEXTOS, TEXTOS_DO_PERFIL, notaDoModulo } from '@/constants/textos';
import type { EstadoDosModulos } from '@/hooks/use-modulos';
import { useTheme } from '@/hooks/use-theme';
import { NOTAS_DA_AUTOAVALIACAO } from '@/lib/perfil';

type TelaDeAutoavaliacaoProps = {
    estado: EstadoDosModulos;
    aoGravar: (notas: Record<string, number>) => Promise<void>; // rejeita se não conseguir gravar
    aoTentarDeNovo: () => void; // quando a lista de módulos não carregou
    aoSair: () => void; // fecha sem gravar nada
};

// A nota que a pessoa se dá em cada módulo, de 1 a 5, antes do primeiro diagnóstico (item 34).
// É a pergunta de confiança do app feita uma vez sobre o assunto inteiro: comparada com o que o
// diagnóstico mede, mostra quem se superestima antes de estudar. Não há como pular uma área.
export function TelaDeAutoavaliacao({ estado, aoGravar, aoTentarDeNovo, aoSair }: TelaDeAutoavaliacaoProps) {
    const theme = useTheme();
    const [notas, setNotas] = useState<Record<string, number>>({});
    const [falta, setFalta] = useState(false);
    const [gravando, setGravando] = useState(false);
    const [erro, setErro] = useState(false);
    const ocupado = useRef(false); // barra o toque duplo antes de a tela redesenhar

    const modulos = estado.tipo === 'pronto' ? estado.modulos : [];

    function darNota(modulo: string, nota: number) {
        setNotas((n) => ({ ...n, [modulo]: nota }));
        setFalta(false);
    }

    async function continuar() {
        if (ocupado.current) return;
        if (modulos.some((m) => notas[m.id] === undefined)) {
            setFalta(true);
            return;
        }

        ocupado.current = true;
        setErro(false);
        setGravando(true);
        try {
            // Só as notas dos módulos que existem hoje, na ordem deles.
            await aoGravar(Object.fromEntries(modulos.map((m) => [m.id, notas[m.id]])));
        } catch (e) {
            console.warn('Não foi possível gravar a autoavaliação.', e);
            setErro(true);
        } finally {
            ocupado.current = false;
            setGravando(false);
        }
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.cabecalho}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={TEXTOS_DO_PERFIL.fecharAAutoavaliacao}
                        hitSlop={Spacing.three}
                        disabled={gravando}
                        onPress={aoSair}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </Pressable>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.titulo}>
                        {TEXTOS_DO_PERFIL.autoavaliacao}
                    </ThemedText>
                </View>

                {estado.tipo === 'carregando' && (
                    <View style={styles.centro}>
                        <ActivityIndicator />
                    </View>
                )}

                {estado.tipo === 'erro' && (
                    <View style={styles.centro}>
                        <ThemedText themeColor="textSecondary" style={styles.aviso}>
                            {TEXTOS_DO_PERFIL.erroAoCarregarAsAreas}
                        </ThemedText>
                        <BotaoSecundario rotulo={TEXTOS.tentarDeNovo} onPress={aoTentarDeNovo} />
                    </View>
                )}

                {estado.tipo === 'pronto' && (
                    <>
                        <ScrollView contentContainerStyle={styles.conteudo}>
                            <ThemedText type="subtitle">{TEXTOS_DO_PERFIL.perguntaDaAutoavaliacao}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                                {TEXTOS_DO_PERFIL.sobreAAutoavaliacao}
                            </ThemedText>

                            {modulos.map((modulo) => (
                                <View key={modulo.id} style={styles.modulo}>
                                    <ThemedText type="smallBold">{modulo.nome}</ThemedText>
                                    <View accessibilityRole="radiogroup" accessibilityLabel={modulo.nome} style={styles.notas}>
                                        {NOTAS_DA_AUTOAVALIACAO.map((nota) => {
                                            const marcada = notas[modulo.id] === nota;
                                            return (
                                                <Pressable
                                                    key={nota}
                                                    accessibilityRole="radio"
                                                    accessibilityLabel={notaDoModulo(modulo.nome, nota)}
                                                    aria-checked={marcada}
                                                    disabled={gravando}
                                                    onPress={() => darNota(modulo.id, nota)}
                                                    style={[
                                                        styles.nota,
                                                        {
                                                            backgroundColor: marcada ? theme.backgroundSelected : theme.background,
                                                            borderColor: marcada ? theme.bordaSelecionada : theme.borda,
                                                        },
                                                    ]}>
                                                    <ThemedText type={marcada ? 'smallBold' : 'small'}>{nota}</ThemedText>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.rodape}>
                            {falta && (
                                <ThemedText type="small" themeColor="erro" aria-live="polite">
                                    {TEXTOS_DO_PERFIL.faltaAvaliar}
                                </ThemedText>
                            )}
                            {erro && (
                                <ThemedText type="small" themeColor="erro" aria-live="polite">
                                    {TEXTOS_DO_PERFIL.erroAoGravarAAutoavaliacao}
                                </ThemedText>
                            )}
                            <BotaoPrincipal rotulo={TEXTOS_DO_PERFIL.continuar} carregando={gravando} onPress={continuar} />
                        </View>
                    </>
                )}
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
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    aviso: { textAlign: 'center' },
    conteudo: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
    modulo: { gap: Spacing.two },
    notas: { flexDirection: 'row', gap: Spacing.two },
    nota: {
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rodape: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
});
