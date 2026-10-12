import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoSecundario } from '@/components/botao-secundario';
import { Caixa } from '@/components/opcoes';
import { FormularioDoPerfil } from '@/components/perfil/formulario-do-perfil';
import { Secao } from '@/components/perfil/secao';
import { SeletorDeTema } from '@/components/perfil/seletor-de-tema';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LarguraDoFormulario, Spacing } from '@/constants/theme';
import {
    TEXTOS,
    TEXTOS_DO_PERFIL,
    TEXTOS_DO_SOBRE,
    extrasRespondidosDe,
    resumoDoPerfil,
    termoAceitoEm,
    versaoDoAppNoPerfil,
} from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import { TOTAL_DE_EXTRAS, extrasRespondidos } from '@/lib/perfil';
import type { DadosPerfil, Perfil } from '@/types/domain';

// O XP total e as lições feitas, os mesmos da home. Null enquanto as lições não foram lidas.
export type ResumoDoPerfil = { xp: number | null; feitas: number; total: number };

type TelaDoPerfilProps = {
    perfil: Perfil;
    resumo: ResumoDoPerfil | null;
    versao: string; // a do app, para a seção Sobre
    aoSalvar: (dados: DadosPerfil) => Promise<void>;
    // Quem entra pelo Google não tem senha neste app, e não vê o botão de redefinir.
    entraComSenha: boolean;
    aoRedefinirSenha: () => Promise<void>; // pede o e-mail com o link; rejeita se não conseguir
    aoMudarAceiteDeContato: (aceita: boolean) => Promise<void>; // grava na hora
    aoResponderSobreVoce: () => void; // abre as perguntas opcionais
    aoLerOTermo: () => void;
    aoSairDaConta: () => void;
    aoSair: () => void; // fecha a tela; quem navega é a rota
};

type Envio = 'parado' | 'enviando' | 'enviado' | 'falhou';

// O Perfil (Fase 6 do plano), em seções: os dados do cadastro, editáveis; as perguntas
// opcionais; a conta, com o e-mail, a senha e o aceite de contato; o tema; o termo; a versão e
// o contato do grupo; e o Sair. No topo, quem é a pessoa e os números dela na home.
// A validação é a do cadastro, e quem garante é a regra do Firestore (item 9).
export function TelaDoPerfil({
    perfil,
    resumo,
    versao,
    aoSalvar,
    entraComSenha,
    aoRedefinirSenha,
    aoMudarAceiteDeContato,
    aoResponderSobreVoce,
    aoLerOTermo,
    aoSairDaConta,
    aoSair,
}: TelaDoPerfilProps) {
    const theme = useTheme();
    const [envio, setEnvio] = useState<Envio>('parado');
    // A caixa muda no toque e volta atrás se a gravação falhar: esperar o servidor para marcar
    // faria o toque parecer que não pegou.
    const [aceitaContato, setAceitaContato] = useState(perfil.aceitaContato === true);
    const [gravandoAceite, setGravandoAceite] = useState(false);
    const [erroNoAceite, setErroNoAceite] = useState(false);

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

    // O aceite não passa pelo "Salvar alterações": é uma caixa, e vale na hora.
    async function mudarAceite(aceita: boolean) {
        setErroNoAceite(false);
        setGravandoAceite(true);
        setAceitaContato(aceita);
        try {
            await aoMudarAceiteDeContato(aceita);
        } catch (e) {
            console.warn('Não foi possível gravar o aceite de contato.', e);
            setAceitaContato(!aceita);
            setErroNoAceite(true);
        } finally {
            setGravandoAceite(false);
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
                    {/* Quem é a pessoa, de relance. O nome e o apelido são os salvos, e não o que
                        está sendo digitado no formulário. */}
                    <View style={styles.resumo}>
                        <View style={[styles.inicial, { backgroundColor: theme.backgroundSelected }]}>
                            <ThemedText type="subtitle" themeColor="primaria" testID="inicial-do-perfil">
                                {perfil.apelido.trim().charAt(0).toUpperCase()}
                            </ThemedText>
                        </View>
                        <View style={styles.quem}>
                            <ThemedText type="smallBold" numberOfLines={1}>
                                {perfil.nome}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary" testID="resumo-do-perfil">
                                {resumoDoPerfil(perfil.apelido, resumo)}
                            </ThemedText>
                        </View>
                    </View>

                    <Secao titulo={TEXTOS.meusDados}>
                        <FormularioDoPerfil
                            inicial={perfil}
                            rotuloDoBotao={TEXTOS.salvarAlteracoes}
                            aoSalvar={aoSalvar}
                            soComMudanca
                            mensagemDeSucesso={TEXTOS.alteracoesSalvas}
                        />
                    </Secao>

                    {/* As perguntas opcionais ficam numa tela própria: aqui, só quantas faltam. */}
                    <Secao titulo={TEXTOS_DO_PERFIL.sobreVoceEOsJogos}>
                        <ThemedText type="small" themeColor="textSecondary">
                            {TEXTOS_DO_PERFIL.sobreAsOpcionais}
                        </ThemedText>
                        <ThemedText type="smallBold">
                            {extrasRespondidosDe(extrasRespondidos(perfil), TOTAL_DE_EXTRAS)}
                        </ThemedText>
                        <BotaoSecundario rotulo={TEXTOS_DO_PERFIL.responder} onPress={aoResponderSobreVoce} />
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

                        <Caixa
                            rotulo={TEXTOS_DO_PERFIL.aceitaContato}
                            marcada={aceitaContato}
                            aoMudar={mudarAceite}
                            desabilitado={gravandoAceite}
                        />
                        {erroNoAceite && (
                            <ThemedText type="small" themeColor="erro" aria-live="polite">
                                {TEXTOS_DO_PERFIL.erroAoSalvar}
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

                    <Secao titulo={TEXTOS_DO_SOBRE.titulo}>
                        <ThemedText type="small" themeColor="textSecondary">
                            {versaoDoAppNoPerfil(versao)}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" selectable>
                            {TEXTOS_DO_SOBRE.contato}
                        </ThemedText>
                    </Secao>

                    <BotaoSecundario rotulo={TEXTOS.sair} onPress={aoSairDaConta} />
                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
    safeArea: { flex: 1, maxWidth: LarguraDoFormulario },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
    },
    titulo: { flex: 1 },
    resumo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
    inicial: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    quem: { flex: 1, gap: Spacing.half },
    conteudo: { gap: Spacing.five, paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
    cartao: { gap: Spacing.half, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
});
