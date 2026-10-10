import { useSyncExternalStore } from 'react';
import { useColorScheme as useEsquemaDoAparelho } from 'react-native';

import { assinarPreferenciaDeTema, esquemaDaPreferencia, preferenciaDeTema, type EsquemaDeCores } from '@/lib/tema';

// O esquema de cores que o app usa: a escolha feita no Perfil (do sistema, claro ou escuro) por
// cima do esquema do aparelho. É por aqui, e pelo `useTheme`, que toda tela chega às cores.
export function useColorScheme(): EsquemaDeCores {
  const doAparelho = useEsquemaDoAparelho() === 'dark' ? 'dark' : 'light';
  const preferencia = useSyncExternalStore(assinarPreferenciaDeTema, preferenciaDeTema, preferenciaDeTema);

  return esquemaDaPreferencia(preferencia, doAparelho);
}
