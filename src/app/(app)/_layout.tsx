import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="consentimento" />
      <Stack.Screen name="licoes/index" />
      <Stack.Screen name="licoes/[topicId]/index" />
      <Stack.Screen name="licoes/[topicId]/cartao" />
      {/* Sem gesto de voltar: sair do bloco é só pelo X, para ninguém fechar a questão sem querer. */}
      <Stack.Screen name="licoes/[topicId]/[passo]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="progresso/index" />
      <Stack.Screen name="progresso/[topicId]" />
      <Stack.Screen name="perfil" />
    </Stack>
  );
}
