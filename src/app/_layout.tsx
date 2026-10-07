import { Lexend_400Regular } from '@expo-google-fonts/lexend/400Regular';
import { Lexend_500Medium } from '@expo-google-fonts/lexend/500Medium';
import { Lexend_600SemiBold } from '@expo-google-fonts/lexend/600SemiBold';
import { Lexend_700Bold } from '@expo-google-fonts/lexend/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { SessionProvider, useSession } from '@/lib/session';

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

  // A tela de abertura segura até a fonte chegar, para o texto não trocar de fonte à vista.
  // Se a carga falhar, o app abre com a fonte do aparelho em vez de travar.
  if (!fontesProntas && !erroNasFontes) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { user, perfilCompleto, isLoading } = useSession();

  if (isLoading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator />
      </ThemedView>
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
