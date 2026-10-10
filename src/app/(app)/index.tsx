import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { BotaoPrincipal } from '@/components/botao-principal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  TEXTOS,
  detalheDaSugestao,
  emQuantosDias,
  formatarSequencia,
  formatarXpTotal,
  licoesFeitas,
  proximaRevisao,
  rotuloDoBotaoDaLicao,
  tituloDaSugestao,
} from '@/constants/textos';
import { useAoVoltarAoApp } from '@/hooks/use-ao-voltar-ao-app';
import { useLicoes, type EstadoDasLicoes, type LicaoDoAluno } from '@/hooks/use-licoes';
import { useTheme } from '@/hooks/use-theme';
import { destinoDaLicao } from '@/lib/licao';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

type LicoesProntas = Extract<EstadoDasLicoes, { tipo: 'pronto' }>;

type Atalho = {
  id: string;
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  rota: '/licoes' | '/progresso' | '/perfil';
  // Um número pequeno que resume a área, quando há o que dizer.
  resumo?: (licoes: LicoesProntas) => string;
};

// Feita é a lição que já passou da verificação (ou, no ciclo curto, da prática).
const FEITA: readonly LicaoDoAluno['estado']['tipo'][] = ['aguardando_revisao', 'revisao', 'concluida'];

// Os atalhos são dados: acrescentar ou reordenar é mexer nesta lista, sem tocar no layout (item 6).
const ATALHOS: Atalho[] = [
  {
    id: 'licoes',
    titulo: 'Lições',
    icone: 'book',
    rota: '/licoes',
    resumo: ({ licoes }) => licoesFeitas(licoes.filter((l) => FEITA.includes(l.estado.tipo)).length, licoes.length),
  },
  { id: 'progresso', titulo: 'Progresso', icone: 'stats-chart', rota: '/progresso' },
  { id: 'perfil', titulo: 'Perfil', icone: 'person', rota: '/perfil' },
];

export default function HomeScreen() {
  const { perfil, user } = useSession();
  const theme = useTheme();
  const router = useRouter();

  const { formaPre } = participanteDoRoteiro(perfil);
  // Nada é guardado: as lições saem das respostas, a cada vez que a home aparece.
  const { estado, recarregar } = useLicoes({ uid: user?.uid ?? '', formaPre });

  // Roda quando a home ganha foco, inclusive na volta de uma lição, e não só na primeira vez.
  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );
  // E quando o app volta do segundo plano: a revisão abre pela virada do dia, e quem deixou o
  // app aberto e volta no dia dela não troca de tela.
  useAoVoltarAoApp(recarregar);

  const pronto = estado.tipo === 'pronto' ? estado : null;
  const sugestao = pronto?.sugestao;
  // A lição que o Para hoje aponta: a da revisão, a que ficou pela metade ou a próxima nova.
  const sugerida =
    pronto && sugestao && (sugestao.tipo === 'revisao' || sugestao.tipo === 'continuar' || sugestao.tipo === 'nova')
      ? pronto.licoes.find((l) => l.topicId === sugestao.topicId)
      : undefined;
  const agendadas = (pronto?.licoes ?? [])
    .flatMap((l) => (l.estado.tipo === 'aguardando_revisao' ? [{ ...l, estado: l.estado }] : []))
    .sort((a, b) => a.estado.liberaEm - b.estado.liberaEm);

  function abrirSugerida(licao: LicaoDoAluno) {
    const { topicId } = licao;
    const destino = destinoDaLicao(licao, formaPre !== null);

    // A página da lição entra primeiro na pilha: sair do passo volta para ela, e não para a home.
    router.push({ pathname: '/licoes/[topicId]', params: { topicId } });
    // Sem o termo aceito, quem explica o que falta é a página da lição.
    if (!destino || destino.tipo === 'termo') return;
    if (destino.passo === 'cartao') router.push({ pathname: '/licoes/[topicId]/cartao', params: { topicId } });
    else router.push({ pathname: '/licoes/[topicId]/[passo]', params: { topicId, passo: destino.passo } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
          <View style={styles.saudacao}>
            <View style={styles.topo}>
              <ThemedText type="title" style={styles.ola}>
                Olá, {perfil?.apelido}
              </ThemedText>
              {pronto && pronto.xp !== null && (
                <View style={[styles.selo, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" themeColor="primaria">
                    {formatarXpTotal(pronto.xp)}
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText themeColor="textSecondary">O que vamos estudar hoje?</ThemedText>
          </View>

          {/* Para hoje: a trilha diária como sugestão, um passo só, sem limite por dia (item 30). */}
          <View style={[styles.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }]}>
            <View style={styles.topo}>
              <ThemedText type="smallBold" themeColor="primaria" style={styles.ola}>
                {TEXTOS.paraHoje}
              </ThemedText>
              {pronto && pronto.sequencia > 0 && (
                <View style={[styles.selo, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" themeColor="primaria">
                    {formatarSequencia(pronto.sequencia)}
                  </ThemedText>
                </View>
              )}
            </View>

            {estado.tipo === 'carregando' && <ActivityIndicator />}

            {estado.tipo === 'erro' && (
              <>
                <ThemedText type="small" themeColor="erro">
                  {TEXTOS.erroAoCarregarLicoes}
                </ThemedText>
                <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={recarregar} />
              </>
            )}

            {sugerida && (
              <>
                <ThemedText style={styles.titulo}>{tituloDaSugestao(sugerida.titulo, sugerida.estado)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {detalheDaSugestao(sugerida.estado)}
                </ThemedText>
                <BotaoPrincipal rotulo={rotuloDoBotaoDaLicao(sugerida.estado)} onPress={() => abrirSugerida(sugerida)} />
              </>
            )}

            {sugestao?.tipo === 'em_dia' && (
              <>
                <ThemedText style={styles.titulo}>{TEXTOS.tudoEmDia}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {proximaRevisao(
                    pronto?.licoes.find((l) => l.topicId === sugestao.topicId)?.titulo ?? '',
                    sugestao.diasRestantes
                  )}
                </ThemedText>
              </>
            )}

            {sugestao?.tipo === 'tudo_concluido' && (
              <ThemedText style={styles.titulo}>{TEXTOS.todasAsLicoesConcluidas}</ThemedText>
            )}
          </View>

          {agendadas.length > 0 && (
            <View style={styles.secao}>
              <ThemedText type="small" themeColor="textSecondary">
                {TEXTOS.revisoesAgendadas}
              </ThemedText>
              {/* Sem botão: a revisão que vence sobe sozinha para o Para hoje. */}
              {agendadas.map((licao) => {
                const quando = emQuantosDias(licao.estado.diasRestantes);
                return (
                  <View
                    key={licao.topicId}
                    accessible
                    accessibilityLabel={`${licao.titulo}, ${quando}`}
                    style={styles.agendada}>
                    <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
                    <ThemedText style={styles.ola}>{licao.titulo}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {quando}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.grade}>
            {ATALHOS.map((item) => {
              const resumo = pronto && item.resumo ? item.resumo(pronto) : null;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={resumo ? `${item.titulo}, ${resumo}` : item.titulo}
                  onPress={() => router.push(item.rota)}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.borda, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Ionicons name={item.icone} size={32} color={theme.primaria} />
                  <ThemedText type="smallBold" style={styles.noCentro}>
                    {item.titulo}
                  </ThemedText>
                  {resumo && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.noCentro}>
                      {resumo}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  conteudo: {
    flexGrow: 1,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  saudacao: {
    gap: Spacing.one,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  // Texto comprido quebra a linha em vez de empurrar o selo para fora da tela.
  ola: {
    flexShrink: 1,
    flexGrow: 1,
  },
  selo: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
  },
  cartao: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
  },
  titulo: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
  },
  secao: {
    gap: Spacing.two,
  },
  agendada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 28,
  },
  grade: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  noCentro: {
    textAlign: 'center',
  },
  // Três atalhos lado a lado, com a mesma largura.
  card: {
    flex: 1,
    minHeight: 112,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
});
