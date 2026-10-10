import { act, renderHook } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { escolherTema } from '@/lib/tema';

import { useColorScheme } from '../use-color-scheme';

// O esquema que o app usa: a escolha do Perfil, quando há, e o do aparelho, quando não.
describe('useColorScheme', () => {
    const doAparelho = jest.spyOn(ReactNative, 'useColorScheme');

    beforeEach(async () => {
        doAparelho.mockReturnValue('light');
        await act(() => escolherTema('sistema'));
    });

    it('em "do sistema", segue o aparelho', async () => {
        doAparelho.mockReturnValue('dark');

        const { result } = await renderHook(() => useColorScheme());

        expect(result.current).toBe('dark');
    });

    it('sem esquema definido no aparelho, fica o claro', async () => {
        doAparelho.mockReturnValue('unspecified');

        const { result } = await renderHook(() => useColorScheme());

        expect(result.current).toBe('light');
    });

    it('a escolha de "escuro" vale por cima do aparelho, e muda a tela na hora', async () => {
        const { result } = await renderHook(() => useColorScheme());
        expect(result.current).toBe('light');

        await act(() => escolherTema('escuro'));

        expect(result.current).toBe('dark');
    });

    it('voltar para "do sistema" devolve o esquema do aparelho', async () => {
        await act(() => escolherTema('escuro'));
        const { result } = await renderHook(() => useColorScheme());

        await act(() => escolherTema('sistema'));

        expect(result.current).toBe('light');
    });
});
