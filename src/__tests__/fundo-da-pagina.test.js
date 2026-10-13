// Em JavaScript, como o teste das cores: lê arquivos com o Node.
const { readFileSync } = require('fs');
const { join } = require('path');

// O fundo da página só acompanha o tema se o componente estiver no layout raiz, que é o único
// lugar por onde toda tela passa, inclusive o login. O comportamento dele é testado no projeto
// "web" (`src/components/__tests__/fundo-da-pagina.test.web.tsx`).

const layout = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

it('o layout raiz pinta o fundo da página', () => {
    expect(layout).toContain("import { FundoDaPagina } from '@/components/fundo-da-pagina';");
    expect(layout).toContain('<FundoDaPagina />');
});
