import { Lexend_400Regular } from '@expo-google-fonts/lexend/400Regular';
import { Lexend_500Medium } from '@expo-google-fonts/lexend/500Medium';
import { Lexend_600SemiBold } from '@expo-google-fonts/lexend/600SemiBold';
import { Lexend_700Bold } from '@expo-google-fonts/lexend/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { FundoDaMarca } from '@/components/fundo-da-marca';
import { FundoDaPagina } from '@/components/fundo-da-pagina';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/lib/session';
import { carregarPreferenciaDeTema } from '@/lib/tema';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Só os quatro pesos que o tema usa, cada um com o nome que `Fonts` dá a ele.
  const [fontesProntas, erroNasFontes] = useFonts({
    [Fonts.regular]: Lexend_400Regular,
    [Fonts.medium]: Lexend_500Medium,
    [Fonts.semibold]: Lexend_600SemiBold,
    [Fonts.bold]: Lexend_700Bold,
  });

  // A escolha de tema feita no Perfil fica no aparelho. Ler é rápido, e a função não falha:
  // sem conseguir ler, vale o tema do aparelho.
  const [temaLido, setTemaLido] = useState(false);
  useEffect(() => {
    carregarPreferenciaDeTema().then(() => setTemaLido(true));
  }, []);

  // A tela de abertura do aparelho segura até a fonte e o tema chegarem, para o texto não trocar
  // de fonte nem a tela de cor à vista. Se a fonte falhar, o app abre com a do aparelho em vez
  // de travar.
  const pronto = (fontesProntas || !!erroNasFontes) && temaLido;
  useEffect(() => {
    if (pronto) SplashScreen.hide();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* A barra do aparelho acompanha o tema escolhido no app, e não o do sistema: com o tema
          escuro forçado num aparelho em claro, os ícones escuros sumiriam no fundo. */}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Na web, quem faz esse papel é a página: o navegador pinta as barras dele com o fundo dela. */}
      <FundoDaPagina />
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { user, perfilCompleto, isLoading } = useSession();

  if (isLoading) {
    return (
      <FundoDaMarca style={styles.loading}>
        <ActivityIndicator />
      </FundoDaMarca>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user && perfilCompleto}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!!user && !perfilCompleto}>
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
