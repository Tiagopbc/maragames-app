// Em JavaScript, como o teste das cores: lê arquivos com o Node.
const { readdirSync, readFileSync } = require('fs');
const { join, relative } = require('path');

// Estado e valor de acessibilidade vão nas props `aria-*`, que o React Native entende no
// celular e o react-native-web entrega ao navegador. As props antigas (`accessibilityState`,
// `accessibilityValue`, `accessibilityLiveRegion`) não chegam à página na web: visto em 08/10,
// a alternativa marcada saía sem `aria-checked` e a barra de progresso, sem `aria-valuenow`.
// Papel e rótulo (`accessibilityRole`, `accessibilityLabel`) chegam, e continuam como estão.

const RAIZ = join(__dirname, '..');
const PROP_ANTIGA = /\baccessibility(State|Value|LiveRegion)\b/;

function arquivos(pasta) {
    return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
        const caminho = join(pasta, item.name);
        if (item.isDirectory()) return item.name === '__tests__' ? [] : arquivos(caminho);
        return /\.tsx$/.test(item.name) ? [caminho] : [];
    });
}

it('nenhuma tela usa as props de acessibilidade que não chegam à web', () => {
    const comPropAntiga = arquivos(RAIZ)
        .map((caminho) => relative(RAIZ, caminho))
        .filter((caminho) => PROP_ANTIGA.test(readFileSync(join(RAIZ, caminho), 'utf8')));

    expect(comPropAntiga).toEqual([]);
});
