import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { alternarOpcao } from '@/lib/perfil';
import type { Erro } from '@/lib/validacao';

export type Opcao<V extends string> = { valor: V; rotulo: string };

type Base<V extends string> = {
    rotulo: string; // a pergunta; é também o nome do grupo para o leitor de tela
    opcoes: readonly Opcao<V>[];
    desabilitado?: boolean;
    erro?: Erro;
    dica?: string; // uma linha abaixo da pergunta
};

type OpcoesProps<V extends string> = Base<V> & {
    valor: V | null;
    aoEscolher: (valor: V | null) => void;
    // Nas perguntas opcionais, tocar na marcada desfaz a resposta.
    podeDesmarcar?: boolean;
};

type OpcoesMultiplasProps<V extends string> = Base<V> & {
    valores: readonly V[];
    aoMudar: (valores: V[]) => void;
};

// Uma escolha entre poucas opções, todas à vista (faixa etária, situação de estudo). É o desenho
// dos níveis de confiança: a marcada muda de borda, de fundo e de peso, porque só o fundo quase
// não se distingue no tema claro.
export function Opcoes<V extends string>({
    rotulo,
    opcoes,
    valor,
    aoEscolher,
    podeDesmarcar = false,
    desabilitado = false,
    erro,
    dica,
}: OpcoesProps<V>) {
    return (
        <Grupo rotulo={rotulo} papel="radiogroup" erro={erro} dica={dica}>
            {opcoes.map((opcao) => {
                const marcada = valor === opcao.valor;
                return (
                    <Botao
                        key={opcao.valor}
                        papel="radio"
                        rotulo={opcao.rotulo}
                        marcada={marcada}
                        desabilitado={desabilitado}
                        aoTocar={() => aoEscolher(marcada && podeDesmarcar ? null : opcao.valor)}
                    />
                );
            })}
        </Grupo>
    );
}

// Várias escolhas ao mesmo tempo (engines, linguagens, áreas de interesse).
export function OpcoesMultiplas<V extends string>({
    rotulo,
    opcoes,
    valores,
    aoMudar,
    desabilitado = false,
    erro,
    dica,
}: OpcoesMultiplasProps<V>) {
    return (
        <Grupo rotulo={rotulo} erro={erro} dica={dica}>
            {opcoes.map((opcao) => {
                const marcada = valores.includes(opcao.valor);
                return (
                    <Botao
                        key={opcao.valor}
                        papel="checkbox"
                        rotulo={opcao.rotulo}
                        marcada={marcada}
                        desabilitado={desabilitado}
                        // "Nenhuma" e as outras não ficam marcadas juntas: a regra é `alternarOpcao`.
                        aoTocar={() => aoMudar(alternarOpcao(opcoes.map((o) => o.valor), valores, opcao.valor))}
                    />
                );
            })}
        </Grupo>
    );
}

function Grupo({
    rotulo,
    papel,
    erro,
    dica,
    children,
}: {
    rotulo: string;
    papel?: 'radiogroup';
    erro?: Erro;
    dica?: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.grupo}>
            <ThemedText type="small" themeColor="textSecondary">
                {rotulo}
            </ThemedText>
            {dica && (
                <ThemedText type="small" themeColor="textSecondary">
                    {dica}
                </ThemedText>
            )}
            <View accessibilityRole={papel} accessibilityLabel={rotulo} style={styles.opcoes}>
                {children}
            </View>
            {erro && (
                <ThemedText type="small" themeColor="erro">
                    {erro}
                </ThemedText>
            )}
        </View>
    );
}

function Botao({
    papel,
    rotulo,
    marcada,
    desabilitado,
    aoTocar,
}: {
    papel: 'radio' | 'checkbox';
    rotulo: string;
    marcada: boolean;
    desabilitado: boolean;
    aoTocar: () => void;
}) {
    const theme = useTheme();

    return (
        <Pressable
            accessibilityRole={papel}
            accessibilityLabel={rotulo}
            aria-checked={marcada}
            disabled={desabilitado}
            onPress={aoTocar}
            style={[
                styles.opcao,
                {
                    backgroundColor: marcada ? theme.backgroundSelected : theme.background,
                    borderColor: marcada ? theme.bordaSelecionada : theme.borda,
                },
            ]}>
            <ThemedText type={marcada ? 'smallBold' : 'small'} style={styles.rotulo}>
                {rotulo}
            </ThemedText>
        </Pressable>
    );
}

type CaixaProps = {
    rotulo: string;
    marcada: boolean;
    aoMudar: (marcada: boolean) => void;
    desabilitado?: boolean;
};

// Uma caixa de marcar com o texto ao lado (o aceite de contato). O mesmo desenho da caixa do termo.
export function Caixa({ rotulo, marcada, aoMudar, desabilitado = false }: CaixaProps) {
    const theme = useTheme();

    return (
        <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={rotulo}
            aria-checked={marcada}
            disabled={desabilitado}
            onPress={() => aoMudar(!marcada)}
            style={styles.caixa}>
            <Ionicons
                name={marcada ? 'checkbox' : 'square-outline'}
                size={24}
                color={marcada ? theme.primaria : theme.textSecondary}
            />
            <ThemedText type="small" style={styles.textoDaCaixa}>
                {rotulo}
            </ThemedText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    grupo: { gap: Spacing.two },
    // Quebra de linha: cinco opções não cabem lado a lado num celular.
    opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
    opcao: {
        flexGrow: 1,
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotulo: { textAlign: 'center' },
    caixa: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
    textoDaCaixa: { flex: 1 },
});
