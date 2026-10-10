import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BotaoPrincipal } from '@/components/botao-principal';
import { CampoTexto } from '@/components/campo-texto';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
    formatarTelefone,
    somenteDigitos,
    tudoValido,
    validarTelefone,
    validarTexto,
    type Erro,
} from '@/lib/validacao';
import type { DadosPerfil, Experiencia } from '@/types/domain';

const EXPERIENCIAS: { valor: Experiencia; rotulo: string }[] = [
    { valor: 'iniciante', rotulo: 'Iniciante' },
    { valor: 'intermediario', rotulo: 'Intermediário' },
    { valor: 'avancado', rotulo: 'Avançado' },
];

type FormularioDoPerfilProps = {
    inicial: DadosPerfil;
    rotuloDoBotao: string;
    aoSalvar: (dados: DadosPerfil) => Promise<void>;
    // Na edição, salvar sem ter mudado nada não faz sentido: o botão espera uma mudança.
    soComMudanca?: boolean;
    // O aviso depois de salvar. No primeiro preenchimento não há: a navegação troca de tela.
    mensagemDeSucesso?: string;
};

// O que vai para `salvarPerfil`: textos aparados e telefone só em dígitos.
function dadosDe(c: DadosPerfil): DadosPerfil {
    return {
        nome: c.nome.trim(),
        apelido: c.apelido.trim(),
        telefone: somenteDigitos(c.telefone),
        instituicao: c.instituicao.trim(),
        curso: c.curso.trim(),
        experiencia: c.experiencia,
    };
}

// Os campos do perfil, com a validação de `src/lib/validacao.ts` (a mesma lista está em
// `perfilValido()`, no firestore.rules). Serve ao primeiro preenchimento e à edição (item 9).
export function FormularioDoPerfil({
    inicial,
    rotuloDoBotao,
    aoSalvar,
    soComMudanca = false,
    mensagemDeSucesso,
}: FormularioDoPerfilProps) {
    const theme = useTheme();
    const [campos, setCampos] = useState<DadosPerfil>({ ...inicial, telefone: formatarTelefone(inicial.telefone) });
    // O que está salvo: na edição, é com isto que se compara para saber se algo mudou.
    const [salvo, setSalvo] = useState<DadosPerfil>(dadosDe(inicial));
    const [erros, setErros] = useState<Record<string, Erro>>({});
    const [erroGeral, setErroGeral] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [deuCerto, setDeuCerto] = useState(false);

    const validadores: Record<'nome' | 'apelido' | 'telefone' | 'instituicao' | 'curso', () => Erro> = {
        nome: () => validarTexto(campos.nome, 'o nome', 2, 60),
        apelido: () => validarTexto(campos.apelido, 'o apelido', 2, 20),
        telefone: () => validarTelefone(campos.telefone),
        instituicao: () => validarTexto(campos.instituicao, 'a instituição', 2, 80),
        curso: () => validarTexto(campos.curso, 'o curso', 2, 80),
    };
    const conferir = (campo: keyof typeof validadores) => setErros((e) => ({ ...e, [campo]: validadores[campo]() }));

    function mudar<C extends keyof DadosPerfil>(campo: C, valor: DadosPerfil[C]) {
        setCampos((c) => ({ ...c, [campo]: valor }));
        setDeuCerto(false);
    }

    const atual = dadosDe(campos);
    const mudou = (Object.keys(atual) as (keyof DadosPerfil)[]).some((campo) => atual[campo] !== salvo[campo]);

    async function enviar() {
        const novos = Object.fromEntries(Object.entries(validadores).map(([campo, validar]) => [campo, validar()]));
        setErros(novos);
        if (!tudoValido(novos)) return;

        setErroGeral(null);
        setSalvando(true);
        try {
            await aoSalvar(atual);
            setSalvo(atual);
            setDeuCerto(true);
        } catch (e) {
            setErroGeral(
                (e as { code?: string })?.code === 'permission-denied'
                    ? 'O servidor recusou o perfil. As regras do Firestore foram publicadas?'
                    : 'Não foi possível salvar. Tente de novo.'
            );
        } finally {
            setSalvando(false);
        }
    }

    return (
        <View style={styles.formulario}>
            <CampoTexto
                rotulo="Nome completo"
                erro={erros.nome}
                value={campos.nome}
                onChangeText={(t) => mudar('nome', t)}
                onBlur={() => conferir('nome')}
                autoComplete="name"
                editable={!salvando}
            />

            <CampoTexto
                rotulo="Apelido"
                placeholder="como você aparece no ranking"
                erro={erros.apelido}
                value={campos.apelido}
                onChangeText={(t) => mudar('apelido', t)}
                onBlur={() => conferir('apelido')}
                autoCapitalize="none"
                maxLength={20}
                editable={!salvando}
            />

            <CampoTexto
                rotulo="Telefone"
                placeholder="(99) 99999-9999"
                erro={erros.telefone}
                value={campos.telefone}
                onChangeText={(t) => mudar('telefone', formatarTelefone(t))}
                onBlur={() => conferir('telefone')}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!salvando}
            />

            <CampoTexto
                rotulo="Instituição"
                erro={erros.instituicao}
                value={campos.instituicao}
                onChangeText={(t) => mudar('instituicao', t)}
                onBlur={() => conferir('instituicao')}
                editable={!salvando}
            />

            <CampoTexto
                rotulo="Curso"
                erro={erros.curso}
                value={campos.curso}
                onChangeText={(t) => mudar('curso', t)}
                onBlur={() => conferir('curso')}
                editable={!salvando}
            />

            <ThemedText type="small" themeColor="textSecondary">
                Experiência com games
            </ThemedText>

            <View accessibilityRole="radiogroup" style={styles.opcoes}>
                {EXPERIENCIAS.map((opcao) => {
                    const ativa = campos.experiencia === opcao.valor;
                    return (
                        <Pressable
                            key={opcao.valor}
                            accessibilityRole="radio"
                            accessibilityLabel={opcao.rotulo}
                            aria-checked={ativa}
                            disabled={salvando}
                            onPress={() => mudar('experiencia', opcao.valor)}
                            // A marcada muda de borda, de fundo e de peso, como os níveis de
                            // confiança: só o fundo quase não se distingue no tema claro.
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
            </View>

            {erroGeral && (
                <ThemedText type="small" themeColor="erro" aria-live="polite">
                    {erroGeral}
                </ThemedText>
            )}
            {deuCerto && mensagemDeSucesso && (
                <ThemedText type="small" themeColor="sucesso" aria-live="polite">
                    {mensagemDeSucesso}
                </ThemedText>
            )}

            <BotaoPrincipal
                rotulo={rotuloDoBotao}
                carregando={salvando}
                desabilitado={soComMudanca && !mudou}
                onPress={enviar}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    formulario: { gap: Spacing.three },
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
});
