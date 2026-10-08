// Avisa quando o app volta a ficar ativo: no celular, ao sair do segundo plano; na web, quando
// a aba volta a ficar visível (o react-native-web liga o AppState à visibilidade da página).
// Serve para refazer contas que dependem do dia: o app fica dias na memória do aparelho, e
// quem volta não troca de tela, então o foco da navegação não muda.

import { useEffect } from 'react';
import { AppState } from 'react-native';

/** `aoVoltar` precisa ser sempre a mesma função (com `useCallback`), ou a escuta é refeita a cada desenho. */
export function useAoVoltarAoApp(aoVoltar: () => void) {
    useEffect(() => {
        const escuta = AppState.addEventListener('change', (estado) => {
            if (estado === 'active') aoVoltar();
        });
        return () => escuta.remove();
    }, [aoVoltar]);
}
