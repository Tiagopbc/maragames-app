// Em JavaScript, como o teste das cores: lê arquivos com o Node.
const { readFileSync } = require('fs');
const { join } = require('path');

const { LarguraDoFormulario, MaxContentWidth } = require('@/constants/theme');

// Num computador, um formulário da largura da tela inteira tem campos de um palmo: fica difícil
// de ler e de preencher. As telas do perfil usam uma coluna estreita, como o login.

const RAIZ = join(__dirname, '..');
const ler = (caminho) => readFileSync(join(RAIZ, caminho), 'utf8');

it('a coluna do formulário é mais estreita que a das telas de conteúdo', () => {
    expect(LarguraDoFormulario).toBe(480);
    expect(LarguraDoFormulario).toBeLessThan(MaxContentWidth);
});

it.each([
    'components/perfil/tela-do-perfil.tsx',
    'components/perfil/tela-sobre-voce.tsx',
    'app/complete-profile.tsx',
])('%s usa a coluna do formulário', (caminho) => {
    const texto = ler(caminho);

    expect(texto).toContain('maxWidth: LarguraDoFormulario');
    expect(texto).not.toContain('MaxContentWidth');
    expect(texto).not.toMatch(/maxWidth: \d/);
});
