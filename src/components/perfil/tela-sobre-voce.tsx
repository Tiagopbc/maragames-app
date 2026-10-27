import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoPrincipal } from '@/components/botao-principal';
import { FundoDaMarca } from '@/components/fundo-da-marca';
import { Opcoes, OpcoesMultiplas, type Opcao } from '@/components/opcoes';
import { ThemedText } from '@/components/themed-text';
import { LarguraDoFormulario, Spacing } from '@/constants/theme';
import {
    ROTULO_DA_ENGINE,
    ROTULO_DA_LINGUAGEM,
    ROTULO_DA_OCUPACAO,
    ROTULO_DE_COMO_CONHECEU,
    ROTULO_DO_ESTUDO_DE_GAME_DESIGN,
    ROTULO_DO_INTERESSE,
    ROTULO_DO_OBJETIVO,
    ROTULO_DO_TEMPO_POR_SEMANA,
    TEXTOS,
    TEXTOS_DO_PERFIL,
    extrasRespondidosDe,
} from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';
import {
    COMO_CONHECEU,
    ENGINES,
    ESTUDOS_DE_GAME_DESIGN,
    INTERESSES,
    LINGUAGENS,
    OBJETIVOS,
    OCUPACOES,
    TEMPOS_POR_SEMANA,
    TOTAL_DE_EXTRAS,
    extrasDe,
    extrasRespondidos,
} from '@/lib/perfil';
import type { ExtrasDoPerfil } from '@/types/domain';

type TelaSobreVoceProps = {
    inicial: ExtrasDoPerfil; // o que já está respondido
    // Recebe as nove perguntas: a que ficou sem resposta vai sem valor, e é apagada do perfil.
    aoSalvar: (extras: ExtrasDoPerfil) => Promise<void>;
    aoSair: () => void;
};

type SimOuNao = 'sim' | 'nao';

const SIM_OU_NAO: readonly Opcao<SimOuNao>[] = [
    { valor: 'sim', rotulo: TEXTOS_DO_PERFIL.sim },
    { valor: 'nao', rotulo: TEXTOS_DO_PERFIL.nao },
];

function opcoes<V extends string>(valores: readonly V[], rotulos: Record<V, string>): Opcao<V>[] {
    return valores.map((valor) => ({ valor, rotulo: rotulos[valor] }));
}

// Lista vazia e campo ausente são a mesma coisa: pergunta sem resposta.
const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const semVazias = (e: ExtrasDoPerfil): ExtrasDoPerfil =>
    Object.fromEntries(Object.entries(e).filter(([, v]) => !(Array.isArray(v) && v.length === 0))) as ExtrasDoPerfil;

// As perguntas opcionais do perfil (item 34), numa tela própria aberta pelo Perfil. Nenhuma é
// obrigatória, toda resposta pode ser desfeita, e nada daqui barra o uso do app.
export function TelaSobreVoce({ inicial, aoSalvar, aoSair }: TelaSobreVoceProps) {
    const theme = useTheme();
    const [respostas, setRespostas] = useState<ExtrasDoPerfil>(() => extrasDe(inicial));
    const [salvas, setSalvas] = useState<ExtrasDoPerfil>(() => extrasDe(inicial));
    const [salvando, setSalvando] = useState(false);
    const [deuCerto, setDeuCerto] = useState(false);
    const [erro, setErro] = useState(false);

    function responder<C extends keyof ExtrasDoPerfil>(campo: C, valor: ExtrasDoPerfil[C]) {
        setRespostas((r) => ({ ...r, [campo]: valor }));
        setDeuCerto(false);
    }

    const atuais = semVazias(respostas);
    const mudou = !igual(extrasDe(atuais), extrasDe(salvas));

    async function salvar() {
        setErro(false);
        setSalvando(true);
        try {
            // Todas as chaves vão: a que não tem valor diz à sessão para apagar o campo.
            await aoSalvar({
                ocupacao: atuais.ocupacao,
                engines: atuais.engines,
                linguagens: atuais.linguagens,
                estudoDeGameDesign: atuais.estudoDeGameDesign,
                interesses: atuais.interesses,
                objetivo: atuais.objetivo,
                tempoPorSemana: atuais.tempoPorSemana,
                comoConheceu: atuais.comoConheceu,
                alunoDoSite: atuais.alunoDoSite,
            });
            setSalvas(atuais);
            setDeuCerto(true);
        } catch (e) {
            console.warn('Não foi possível salvar as respostas opcionais.', e);
            setErro(true);
        } finally {
            setSalvando(false);
        }
    }

    const alunoDoSite: SimOuNao | null =
        respostas.alunoDoSite === undefined ? null : respostas.alunoDoSite ? 'sim' : 'nao';

    return (
        <FundoDaMarca style={styles.container}>
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
                        {TEXTOS_DO_PERFIL.sobreVoceEOsJogos}
                    </ThemedText>
                </View>

                <ScrollView contentContainerStyle={styles.conteudo}>
                    <View style={styles.introducao}>
                        <ThemedText type="small" themeColor="textSecondary">
                            {TEXTOS_DO_PERFIL.sobreAsOpcionais}
                        </ThemedText>
                        <ThemedText type="smallBold">
                            {extrasRespondidosDe(extrasRespondidos(atuais), TOTAL_DE_EXTRAS)}
                        </ThemedText>
                    </View>

                    <Opcoes
                        rotulo={TEXTOS_DO_PERFIL.ocupacao}
                        opcoes={opcoes(OCUPACOES, ROTULO_DA_OCUPACAO)}
                        valor={respostas.ocupacao ?? null}
                        aoEscolher={(v) => responder('ocupacao', v ?? undefined)}
                        podeDesmarcar
                        desabilitado={salvando}
                    />

                    <OpcoesMultiplas
                        rotulo={TEXTOS_DO_PERFIL.engines}
                        dica={TEXTOS_DO_PERFIL.variasOpcoes}
                        opcoes={opcoes(ENGINES, ROTULO_DA_ENGINE)}
                        valores={respostas.engines ?? []}
                        aoMudar={(v) => responder('engines', v)}
                        desabilitado={salvando}
                    />

                    <OpcoesMultiplas
                        rotulo={TEXTOS_DO_PERFIL.linguagens}
                        dica={TEXTOS_DO_PERFIL.variasOpcoes}
                        opcoes={opcoes(LINGUAGENS, ROTULO_DA_LINGUAGEM)}
                        valores={respostas.linguagens ?? []}
                        aoMudar={(v) => responder('linguagens', v)}
                        desabilitado={salvando}
                    />

                    <Opcoes
                        rotulo={TEXTOS_DO_PERFIL.estudoDeGameDesign}
                        opcoes={opcoes(ESTUDOS_DE_GAME_DESIGN, ROTULO_DO_ESTUDO_DE_GAME_DESIGN)}
                        valor={respostas.estudoDeGameDesign ?? null}
                        aoEscolher={(v) => responder('estudoDeGameDesign', v ?? undefined)}
                        podeDesmarcar
                        desabilitado={salvando}
                    />

                    <OpcoesMultiplas
                        rotulo={TEXTOS_DO_PERFIL.interesses}
                        dica={TEXTOS_DO_PERFIL.variasOpcoes}
                        opcoes={opcoes(INTERESSES, ROTULO_DO_INTERESSE)}
                        valores={respostas.interesses ?? []}
                        aoMudar={(v) => responder('interesses', v)}
                        desabilitado={salvando}
                    />

                    <Opcoes
                        rotulo={TEXTOS_DO_PERFIL.objetivo}
                        opcoes={opcoes(OBJETIVOS, ROTULO_DO_OBJETIVO)}
                        valor={respostas.objetivo ?? null}
                        aoEscolher={(v) => responder('objetivo', v ?? undefined)}
                        podeDesmarcar
                        desabilitado={salvando}
                    />

                    <Opcoes
                        rotulo={TEXTOS_DO_PERFIL.tempoPorSemana}
                        opcoes={opcoes(TEMPOS_POR_SEMANA, ROTULO_DO_TEMPO_POR_SEMANA)}
                        valor={respostas.tempoPorSemana ?? null}
                        aoEscolher={(v) => responder('tempoPorSemana', v ?? undefined)}
                        podeDesmarcar
                        desabilitado={salvando}
                    />

                    <Opcoes
                        rotulo={TEXTOS_DO_PERFIL.comoConheceu}
                        opcoes={opcoes(COMO_CONHECEU, ROTULO_DE_COMO_CONHECEU)}
                        valor={respostas.comoConheceu ?? null}
                        aoEscolher={(v) => responder('comoConheceu', v ?? undefined)}
                        podeDesmarcar
                        desabilitado={salvando}
                    />

                    <Opcoes
                        rotulo={TEXTOS_DO_PERFIL.alunoDoSite}
                        opcoes={SIM_OU_NAO}
                        valor={alunoDoSite}
                        aoEscolher={(v) => responder('alunoDoSite', v === null ? undefined : v === 'sim')}
                        podeDesmarcar
                        desabilitado={salvando}
                    />

                    {erro && (
                        <ThemedText type="small" themeColor="erro" aria-live="polite">
                            {TEXTOS_DO_PERFIL.erroAoSalvar}
                        </ThemedText>
                    )}
                    {deuCerto && (
                        <ThemedText type="small" themeColor="sucesso" aria-live="polite">
                            {TEXTOS_DO_PERFIL.respostasSalvas}
                        </ThemedText>
                    )}

                    <BotaoPrincipal
                        rotulo={TEXTOS_DO_PERFIL.salvarRespostas}
                        carregando={salvando}
                        desabilitado={!mudou}
                        onPress={salvar}
                    />
                </ScrollView>
            </SafeAreaView>
        </FundoDaMarca>
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
    conteudo: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
    introducao: { gap: Spacing.one },
});
