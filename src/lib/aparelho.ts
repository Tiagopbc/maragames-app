// De onde o app está rodando, para gravar em cada tentativa (item 34): a plataforma e a versão.
// Ninguém é perguntado; serve para separar, na análise, o que veio da web e o que veio do APK.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { OrigemDaTentativa } from '../types/domain';

/** A versão do `app.json`, a mesma que o Perfil mostra em "Sobre". */
export function versaoDoApp(): string {
    return Constants.expoConfig?.version ?? 'desconhecida';
}

/** 'web', 'android' ou 'ios', e a versão do app. É só leitura: nada muda de comportamento aqui. */
export function origemDaTentativa(): OrigemDaTentativa {
    return { plataforma: Platform.OS, versaoDoApp: versaoDoApp() };
}
