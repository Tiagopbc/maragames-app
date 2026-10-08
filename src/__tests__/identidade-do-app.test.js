// Em JavaScript, como o teste das cores: lê arquivos com o Node.
const { existsSync } = require('fs');
const { join } = require('path');

const { Colors } = require('@/constants/theme');

// O que o aparelho mostra antes de o app abrir (ícone, tela de abertura, favicon) é configurado
// no app.json, fora do tema. Este teste amarra uma coisa à outra e barra a volta do template.

const RAIZ = join(__dirname, '..', '..');
const { expo } = require('../../app.json');
const abertura = expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen')[1];

const IMAGENS = {
    'ícone do app': expo.icon,
    'ícone do Android': expo.android.adaptiveIcon.foregroundImage,
    favicon: expo.web.favicon,
    'tela de abertura': abertura.image,
    'tela de abertura no escuro': abertura.dark.image,
};

it.each(Object.entries(IMAGENS))('%s aponta para um arquivo que existe', (_nome, caminho) => {
    expect(typeof caminho).toBe('string');
    expect(existsSync(join(RAIZ, caminho))).toBe(true);
});

it('nenhuma imagem do app é a do template do Expo', () => {
    const texto = JSON.stringify(expo);

    for (const resto of ['expo.icon', 'splash-icon', 'expo-logo', 'android-icon-background', 'android-icon-monochrome']) {
        expect(texto).not.toContain(resto);
    }
});

it('nenhuma cor do app.json é o azul do template', () => {
    const texto = JSON.stringify(expo).toUpperCase();

    expect(texto).not.toContain('#208AEF');
    expect(texto).not.toContain('#E6F4FE');
});

it('a tela de abertura usa o fundo do tema, no claro e no escuro', () => {
    expect(abertura.backgroundColor).toBe(Colors.light.background);
    expect(abertura.dark.backgroundColor).toBe(Colors.dark.background);
});

it('o ícone do Android usa o fundo da logo', () => {
    expect(expo.android.adaptiveIcon.backgroundColor).toBe(Colors.light.fundoDaLogo);
});
