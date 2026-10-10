import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

import { assinarPreferenciaDeTema, esquemaDaPreferencia, preferenciaDeTema, type EsquemaDeCores } from '@/lib/tema';

// O `useColorScheme` do react-native-web guarda o esquema em estado e troca de ouvinte a cada
// render. Na troca de tema do sistema, o componente redesenhado por quem está em volta antes de
// chegar a vez do ouvinte dele perde o aviso e fica com o esquema antigo (item 29 das decisões).
// Aqui o esquema é lido do sistema a cada render e a assinatura é uma só por componente, que é
// como o React Native já faz no nativo.
function assinar(aoMudar: () => void) {
  const assinatura = Appearance.addChangeListener(aoMudar);
  return () => assinatura.remove();
}

function esquemaDoSistema(): EsquemaDeCores {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

// A página estática sai sempre em claro; o esquema do sistema só entra depois de hidratar.
function esquemaNaPaginaEstatica() {
  return 'light' as const;
}

// A escolha feita no Perfil (do sistema, claro ou escuro) vale por cima do esquema do sistema.
export function useColorScheme(): EsquemaDeCores {
  const doSistema = useSyncExternalStore(assinar, esquemaDoSistema, esquemaNaPaginaEstatica);
  const preferencia = useSyncExternalStore(assinarPreferenciaDeTema, preferenciaDeTema, preferenciaDeTema);

  return esquemaDaPreferencia(preferencia, doSistema);
}
