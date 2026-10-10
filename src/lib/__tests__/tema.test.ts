import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    assinarPreferenciaDeTema,
    carregarPreferenciaDeTema,
    escolherTema,
    esquemaDaPreferencia,
    preferenciaDeTema,
} from '../tema';

const CHAVE = 'maragames:tema';

beforeEach(async () => {
    await AsyncStorage.clear();
    await escolherTema('sistema');
    jest.clearAllMocks();
});

describe('esquemaDaPreferencia', () => {
    it('"do sistema" segue o aparelho', () => {
        expect(esquemaDaPreferencia('sistema', 'light')).toBe('light');
        expect(esquemaDaPreferencia('sistema', 'dark')).toBe('dark');
    });

    it('claro e escuro valem por cima do aparelho', () => {
        expect(esquemaDaPreferencia('claro', 'dark')).toBe('light');
        expect(esquemaDaPreferencia('escuro', 'light')).toBe('dark');
    });
});

describe('a preferência de tema', () => {
    it('começa em "do sistema"', () => {
        expect(preferenciaDeTema()).toBe('sistema');
    });

    it('escolher muda na hora, avisa quem está ouvindo e guarda no aparelho', async () => {
        const ouvinte = jest.fn();
        const parar = assinarPreferenciaDeTema(ouvinte);

        await escolherTema('escuro');

        expect(preferenciaDeTema()).toBe('escuro');
        expect(ouvinte).toHaveBeenCalledTimes(1);
        expect(await AsyncStorage.getItem(CHAVE)).toBe('escuro');
        parar();
    });

    it('quem parou de ouvir não é mais avisado', async () => {
        const ouvinte = jest.fn();
        assinarPreferenciaDeTema(ouvinte)();

        await escolherTema('claro');

        expect(ouvinte).not.toHaveBeenCalled();
    });

    it('carregar traz o que estava guardado no aparelho', async () => {
        await AsyncStorage.setItem(CHAVE, 'claro');

        await carregarPreferenciaDeTema();

        expect(preferenciaDeTema()).toBe('claro');
    });

    it('valor guardado que não é uma das três opções vale como "do sistema"', async () => {
        await escolherTema('escuro');
        await AsyncStorage.setItem(CHAVE, 'roxo');

        await carregarPreferenciaDeTema();

        expect(preferenciaDeTema()).toBe('sistema');
    });

    describe('quando o armazenamento do aparelho falha', () => {
        beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
        afterEach(() => jest.restoreAllMocks());

        it('a escolha vale até fechar o app, sem erro na tela', async () => {
            (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disco cheio'));

            await expect(escolherTema('escuro')).resolves.toBeUndefined();

            expect(preferenciaDeTema()).toBe('escuro');
        });

        it('carregar não derruba o app: fica o que estava', async () => {
            (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('sem acesso'));

            await expect(carregarPreferenciaDeTema()).resolves.toBeUndefined();

            expect(preferenciaDeTema()).toBe('sistema');
        });
    });
});
