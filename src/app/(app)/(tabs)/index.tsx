import { useCallback } from 'react';
import { Button, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { BotaoPrincipal } from '@/components/botao-principal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { TEXTOS, TITULO_DA_FASE, descreverEtapa } from '@/constants/textos';
import { useRoteiro } from '@/hooks/use-roteiro';
import { useTheme } from '@/hooks/use-theme';
import { participanteDoRoteiro } from '@/lib/participante';
import { destinoDaEtapa, type Destino } from '@/lib/passo';
import { useSession } from '@/lib/session';
import type { Fase } from '@/types/domain';

type Atalho = {
  id: string;
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  travado: boolean; // no piloto, só o roteiro guiado fica aberto (item 6)
};

// Os atalhos são dados: destravar uma trilha depois do piloto é mudar `travado` aqui, e
// acrescentar ou reordenar é mexer nesta lista, sem tocar no layout.
const ATALHOS: Atalho[] = [
  { id: 'licoes', titulo: 'Lições', icone: 'book', travado: true },
  { id: 'progresso', titulo: 'Progresso', icone: 'stats-chart', travado: true },
  { id: 'perfil', titulo: 'Perfil', icone: 'person', travado: true },
];

// Só em desenvolvimento: abre um bloco medido sem esperar o roteiro chegar nele (o reteste só
// abre sozinho 7 dias depois do pós). Exige o termo aceito e grava respostas de verdade na conta logada.
const BLOCOS_MEDIDOS: Exclude<Fase, 'pratica'>[] = ['pre', 'pos', 'reteste'];

export default function HomeScreen() {
  const { sair, perfil, user } = useSession();
  const theme = useTheme();
  const router = useRouter();

  // A etapa não é guardada em lugar nenhum: sai das respostas, a cada vez que a home aparece.
  const { estado, recarregar } = useRoteiro({
    uid: user?.uid ?? '',
    participante: participanteDoRoteiro(perfil),
  });

  // Roda quando a home ganha foco, inclusive na volta de um bloco, e não só na primeira vez.
  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  function abrir(destino: Destino) {
    if (destino.tipo === 'consentimento') {
      router.push('/consentimento');
      return;
    }
    if (destino.tipo === 'cartao') {
      router.push({ pathname: '/cartao/[topicId]', params: { topicId: destino.topicId } });
      return;
    }
    const { fase, topicId } = destino;
    router.push({ pathname: '/bloco/[fase]', params: topicId ? { fase, topicId } : { fase } });
  }

  const destino = estado.tipo === 'pronto' ? destinoDaEtapa(estado.etapa) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.saudacao}>
          <ThemedText type="title">Olá, {perfil?.apelido}</ThemedText>
          <ThemedText themeColor="textSecondary">
            O que vamos estudar hoje?
          </ThemedText>
        </View>

        <View style={[styles.proximaEtapa, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {TEXTOS.proximaEtapa}
          </ThemedText>

          {estado.tipo === 'erro' ? (
            <>
              <ThemedText type="small" themeColor="erro">
                {TEXTOS.erroAoCarregarRoteiro}
              </ThemedText>
              <BotaoPrincipal rotulo={TEXTOS.tentarDeNovo} onPress={recarregar} />
            </>
          ) : (
            <>
              {estado.tipo === 'pronto' && (
                <ThemedText>{descreverEtapa(estado.etapa, estado.nomeDoTopico)}</ThemedText>
              )}
              {/* Sem destino (espera do reteste, SUS ainda sem tela), o botão fica apagado. */}
              <BotaoPrincipal
                rotulo={TEXTOS.continuarEstudos}
                carregando={estado.tipo === 'carregando'}
                desabilitado={estado.tipo === 'pronto' && !destino}
                onPress={() => {
                  if (destino) abrir(destino);
                }}
              />
            </>
          )}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {TEXTOS.trilhas}
        </ThemedText>

        <View style={styles.grade}>
          {ATALHOS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.travado ? `${item.titulo}, ${TEXTOS.trilhaTravada}` : item.titulo}
              disabled={item.travado}
              onPress={() => console.log(item.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  // Travada: o cartão inteiro esmaece e o conteúdo fica em cinza.
                  opacity: item.travado ? 0.5 : pressed ? 0.6 : 1,
                },
              ]}>
              {item.travado && (
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.textSecondary}
                  style={styles.cadeado}
                />
              )}
              <Ionicons
                name={item.icone}
                size={36}
                color={item.travado ? theme.textSecondary : theme.text}
              />
              <ThemedText type="smallBold" themeColor={item.travado ? 'textSecondary' : 'text'}>
                {item.titulo}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {__DEV__ && (
          <View style={styles.desenvolvimento}>
            <ThemedText type="small" themeColor="textSecondary">
              Desenvolvimento: abrir bloco medido
            </ThemedText>
            <View style={styles.linha}>
              {BLOCOS_MEDIDOS.map((fase) => (
                <Pressable key={fase} accessibilityRole="button" onPress={() => abrir({ tipo: 'bloco', fase })}>
                  <ThemedText type="linkPrimary">{TITULO_DA_FASE[fase]}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <Button title="Sair" onPress={sair} />
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
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    alignItems: 'stretch',
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  saudacao: {
    gap: Spacing.one,
  },
  proximaEtapa: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  card: {
    width: '47%',
    height: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  cadeado: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
  },
  desenvolvimento: {
    gap: Spacing.one,
  },
  linha: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
});
