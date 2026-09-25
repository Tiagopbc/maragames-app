import { Button, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

type Atalho = {
  id: string;
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
};

const ATALHOS: Atalho[] = [
  { id: 'continuar', titulo: 'Continuar lição', icone: 'play-circle' },
  { id: 'licoes', titulo: 'Lições', icone: 'book' },
  { id: 'progresso', titulo: 'Progresso', icone: 'stats-chart' },
  { id: 'perfil', titulo: 'Perfil', icone: 'person' },
];

export default function HomeScreen() {
  const { sair, perfil } = useSession();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.saudacao}>
          <ThemedText type="title">Olá, {perfil?.apelido}</ThemedText>
          <ThemedText themeColor="textSecondary">
            O que vamos estudar hoje?
          </ThemedText>
        </View>

        <View style={styles.grade}>
          {ATALHOS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => console.log(item.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}>
              <Ionicons name={item.icone} size={36} color={theme.text} />
              <ThemedText type="smallBold">{item.titulo}</ThemedText>
            </Pressable>
          ))}
        </View>

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
});