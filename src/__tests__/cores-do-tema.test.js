// Em JavaScript, como os scripts de seed: lê arquivos com o Node, e os tipos do Node não entram
// no tsconfig para o código do app não poder usá-los por engano.
const { readdirSync, readFileSync } = require('fs');
const { join, relative } = require('path');

// "Cores sempre do tema" (AGENTS.md): cor escrita à mão numa tela não acompanha o tema escuro
// nem a troca de identidade. O único lugar onde uma cor pode nascer é src/constants/theme.ts.

const RAIZ = join(__dirname, '..');
const TEMA = 'constants/theme.ts';

const COR_FIXA = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

function arquivos(pasta) {
    return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
        const caminho = join(pasta, item.name);
        if (item.isDirectory()) return item.name === '__tests__' ? [] : arquivos(caminho);
        return /\.(ts|tsx|css)$/.test(item.name) ? [caminho] : [];
    });
}

it('nenhum arquivo fora do tema escreve cor à mão', () => {
    const comCorFixa = arquivos(RAIZ)
        .map((caminho) => relative(RAIZ, caminho))
        .filter((caminho) => caminho !== TEMA)
        .filter((caminho) =>
            readFileSync(join(RAIZ, caminho), 'utf8')
                .split('\n')
                .some((linha) => COR_FIXA.test(linha))
        );

    expect(comCorFixa).toEqual([]);
});

// O `Button` do React Native traz a cor do sistema (azul) e não aceita a do tema.
it('nenhuma tela usa o Button do React Native', () => {
    const comButton = arquivos(RAIZ)
        .map((caminho) => relative(RAIZ, caminho))
        .filter((caminho) => /import \{[^}]*\bButton\b[^}]*\} from 'react-native'/.test(readFileSync(join(RAIZ, caminho), 'utf8')));

    expect(comButton).toEqual([]);
});
