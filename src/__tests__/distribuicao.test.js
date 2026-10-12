// Em JavaScript, como o teste da identidade: lê arquivos de configuração com o Node.
const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

// O app chega a quem é de fora por um endereço na web, hospedado na Vercel, e por um APK do
// EAS Build (item 32). Nada disso roda nos testes; o que dá para amarrar é a configuração de
// que cada caminho depende.

const RAIZ = join(__dirname, '..', '..');
const { expo } = require('../../app.json');

const lerJson = (nome) => JSON.parse(readFileSync(join(RAIZ, nome), 'utf8'));

describe('a web na Vercel', () => {
    // Com a saída "static", /licoes/[topicId] vira um arquivo de nome literal: abrir ou
    // recarregar /licoes/mda_framework num servidor de arquivos não acha página.
    it('exporta uma página só, que resolve as rotas no navegador', () => {
        expect(expo.web.output).toBe('single');
    });

    it('tem o vercel.json, que monta a versão web e a publica da pasta dist', () => {
        expect(existsSync(join(RAIZ, 'vercel.json'))).toBe(true);

        const vercel = lerJson('vercel.json');

        expect(vercel.buildCommand).toBe('expo export -p web');
        expect(vercel.outputDirectory).toBe('dist');
        expect(vercel.framework).toBeNull();
    });

    it('manda qualquer endereço para a página única', () => {
        const { rewrites } = lerJson('vercel.json');

        expect(rewrites).toEqual([{ source: '/:path*', destination: '/' }]);
    });
});

describe('o APK pelo EAS', () => {
    it('o app tem identificador no Android', () => {
        expect(expo.android.package).toBe('com.beastmaragames.app');
    });

    it('tem um perfil de build que gera APK, e não o pacote da loja', () => {
        expect(existsSync(join(RAIZ, 'eas.json'))).toBe(true);

        const { build } = lerJson('eas.json');

        expect(build.preview.android.buildType).toBe('apk');
    });

    // As variáveis do Firebase ficam no .env, fora do git: o build na nuvem só as enxerga
    // se o perfil disser de que ambiente do EAS elas vêm.
    it('o perfil diz de que ambiente do EAS vêm as variáveis', () => {
        const { build } = lerJson('eas.json');

        expect(build.preview.environment).toBe('preview');
    });
});
