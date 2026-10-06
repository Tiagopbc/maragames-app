import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      {/* Sem gesto de voltar: sair do bloco é só pelo X, para ninguém fechar a questão sem querer. */}
      <Stack.Screen name="bloco/[fase]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="consentimento" />
      <Stack.Screen name="cartao/[topicId]" />
    </Stack>
  );
}
