import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useAoVoltarAoApp } from '../use-ao-voltar-ao-app';

// Guarda quem está ouvindo o estado do app, para o teste poder simular a ida e a volta.
const ouvintes = new Set<(estado: AppStateStatus) => void>();

beforeEach(() => {
    ouvintes.clear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_evento, ouvinte) => {
        ouvintes.add(ouvinte as (estado: AppStateStatus) => void);
        return { remove: () => ouvintes.delete(ouvinte as (estado: AppStateStatus) => void) };
    });
});

afterEach(() => jest.restoreAllMocks());

const mudarPara = (estado: AppStateStatus) => ouvintes.forEach((ouvinte) => ouvinte(estado));

describe('useAoVoltarAoApp', () => {
    it('chama quando o app volta a ficar ativo', async () => {
        const aoVoltar = jest.fn();
        await renderHook(() => useAoVoltarAoApp(aoVoltar));

        mudarPara('background');
        mudarPara('active');

        expect(aoVoltar).toHaveBeenCalledTimes(1);
    });

    it('não chama quando o app vai para segundo plano', async () => {
        const aoVoltar = jest.fn();
        await renderHook(() => useAoVoltarAoApp(aoVoltar));

        mudarPara('inactive');
        mudarPara('background');

        expect(aoVoltar).not.toHaveBeenCalled();
    });

    it('para de ouvir quando a tela sai', async () => {
        const aoVoltar = jest.fn();
        const hook = await renderHook(() => useAoVoltarAoApp(aoVoltar));

        await hook.unmount();
        mudarPara('active');

        expect(ouvintes.size).toBe(0);
        expect(aoVoltar).not.toHaveBeenCalled();
    });
});
