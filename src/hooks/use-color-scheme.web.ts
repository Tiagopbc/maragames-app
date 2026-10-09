import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

// O `useColorScheme` do react-native-web guarda o esquema em estado e troca de ouvinte a cada
// render. Na troca de tema do sistema, o componente redesenhado por quem está em volta antes de
// chegar a vez do ouvinte dele perde o aviso e fica com o esquema antigo (item 29 das decisões).
// Aqui o esquema é lido do sistema a cada render e a assinatura é uma só por componente, que é
// como o React Native já faz no nativo.
function assinar(aoMudar: () => void) {
  const assinatura = Appearance.addChangeListener(aoMudar);
  return () => assinatura.remove();
}

function esquemaDoSistema() {
  return Appearance.getColorScheme() ?? 'light';
}

// A página estática sai sempre em claro; o esquema do sistema só entra depois de hidratar.
function esquemaNaPaginaEstatica() {
  return 'light' as const;
}

export function useColorScheme() {
  return useSyncExternalStore(assinar, esquemaDoSistema, esquemaNaPaginaEstatica);
}
