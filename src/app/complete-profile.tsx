import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { BotaoPrincipal } from '@/components/botao-principal';
import { CampoTexto } from '@/components/campo-texto';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import {
    formatarTelefone,
    somenteDigitos,
    tudoValido,
    validarTelefone,
    validarTexto,
    type Erro,
} from '@/lib/validacao';
import type { Experiencia } from '@/types/domain';

const EXPERIENCIAS: { valor: Experiencia; rotulo: string }[] = [
    { valor: 'iniciante', rotulo: 'Iniciante' },
    { valor: 'intermediario', rotulo: 'Intermediário' },
    { valor: 'avancado', rotulo: 'Avançado' },
];

export default function CompleteProfileScreen() {
    const theme = useTheme();
    const { user, salvarPerfil, sair } = useSession();

    const [nome, setNome] = useState(user?.displayName ?? '');
    const [apelido, setApelido] = useState('');
    const [telefone, setTelefone] = useState('');
    const [instituicao, setInstituicao] = useState('');
    const [curso, setCurso] = useState('');
    const [experiencia, setExperiencia] = useState<Experiencia>('iniciante');

    const [erros, setErros] = useState<Record<string, Erro>>({});
    const [erroGeral, setErroGeral] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    function validar(): Record<string, Erro> {
        return {
            nome: validarTexto(nome, 'o nome', 2, 60),
            apelido: validarTexto(apelido, 'o apelido', 2, 20),
            telefone: validarTelefone(telefone),
            instituicao: validarTexto(instituicao, 'a instituição', 2, 80),
            curso: validarTexto(curso, 'o curso', 2, 80),
        };
    }

    async function enviar() {
        const novos = validar();
        setErros(novos);
        if (!tudoValido(novos)) return;

        setErroGeral(null);
        setSalvando(true);
        try {
            await salvarPerfil({
                nome: nome.trim(),
                apelido: apelido.trim(),
                telefone: somenteDigitos(telefone),
                instituicao: instituicao.trim(),
                curso: curso.trim(),
                experiencia,
            });
        } catch (e: any) {
            setErroGeral(
                e?.code === 'permission-denied'
                    ? 'O servidor recusou o perfil. As regras do Firestore foram publicadas?'
                    : 'Não foi possível salvar. Tente de novo.'
            );
        } finally {
            setSalvando(false);
        }
    }

    return (
        <ThemedView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <ThemedView style={styles.card}>
                    <ThemedText type="subtitle">Seu perfil</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        Falta pouco para começar. Entrando como {user?.email}.
                    </ThemedText>

                    <CampoTexto
                        rotulo="Nome completo"
                        erro={erros.nome}
                        value={nome}
                        onChangeText={setNome}
                        onBlur={() => setErros((e) => ({ ...e, nome: validarTexto(nome, 'o nome', 2, 60) }))}
                        autoComplete="name"
                        editable={!salvando}
                    />

                    <CampoTexto
                        rotulo="Apelido"
                        placeholder="como você aparece no ranking"
                        erro={erros.apelido}
                        value={apelido}
                        onChangeText={setApelido}
                        onBlur={() =>
                            setErros((e) => ({ ...e, apelido: validarTexto(apelido, 'o apelido', 2, 20) }))
                        }
                        autoCapitalize="none"
                        maxLength={20}
                        editable={!salvando}
                    />

                    <CampoTexto
                        rotulo="Telefone"
                        placeholder="(99) 99999-9999"
                        erro={erros.telefone}
                        value={telefone}
                        onChangeText={(t) => setTelefone(formatarTelefone(t))}
                        onBlur={() => setErros((e) => ({ ...e, telefone: validarTelefone(telefone) }))}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        editable={!salvando}
                    />

                    <CampoTexto
                        rotulo="Instituição"
                        erro={erros.instituicao}
                        value={instituicao}
                        onChangeText={setInstituicao}
                        onBlur={() =>
                            setErros((e) => ({
                                ...e,
                                instituicao: validarTexto(instituicao, 'a instituição', 2, 80),
                            }))
                        }
                        editable={!salvando}
                    />

                    <CampoTexto
                        rotulo="Curso"
                        erro={erros.curso}
                        value={curso}
                        onChangeText={setCurso}
                        onBlur={() => setErros((e) => ({ ...e, curso: validarTexto(curso, 'o curso', 2, 80) }))}
                        editable={!salvando}
                    />

                    <ThemedText type="small" themeColor="textSecondary">
                        Experiência com games
                    </ThemedText>

                    <ThemedView style={styles.opcoes}>
                        {EXPERIENCIAS.map((opcao) => {
                            const ativa = experiencia === opcao.valor;
                            return (
                                <Pressable
                                    key={opcao.valor}
                                    accessibilityRole="radio"
                                    accessibilityLabel={opcao.rotulo}
                                    aria-checked={ativa}
                                    disabled={salvando}
                                    onPress={() => setExperiencia(opcao.valor)}
                                    // A marcada muda de borda, de fundo e de peso, como os níveis
                                    // de confiança: só o fundo quase não se distingue no tema claro.
                                    style={[
                                        styles.opcao,
                                        {
                                            backgroundColor: ativa ? theme.backgroundSelected : theme.background,
                                            borderColor: ativa ? theme.bordaSelecionada : theme.borda,
                                        },
                                    ]}>
                                    <ThemedText type={ativa ? 'smallBold' : 'small'} style={styles.rotuloDaOpcao}>
                                        {opcao.rotulo}
                                    </ThemedText>
                                </Pressable>
                            );
                        })}
                    </ThemedView>

                    {erroGeral && (
                        <ThemedText type="small" themeColor="erro">
                            {erroGeral}
                        </ThemedText>
                    )}

                    <BotaoPrincipal rotulo="Salvar e começar" carregando={salvando} onPress={enviar} />

                    <Pressable disabled={salvando} onPress={sair}>
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
    opcoes: { flexDirection: 'row', gap: Spacing.two },
    opcao: {
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.one,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotuloDaOpcao: { textAlign: 'center' },
    sair: { textAlign: 'center' },
});