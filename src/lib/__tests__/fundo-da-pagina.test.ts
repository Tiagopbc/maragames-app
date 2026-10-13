import { pintarFundoDaPagina } from '@/lib/fundo-da-pagina';

// No celular não existe página: quem pinta a barra do aparelho é o `StatusBar`, no layout raiz.
// A versão que faz alguma coisa é a da web (`fundo-da-pagina.web.ts`), testada no projeto "web".
describe('fundo da página fora da web', () => {
    it('não faz nada e não quebra', () => {
        expect(() => pintarFundoDaPagina('#0E1015')).not.toThrow();
        expect(pintarFundoDaPagina('#0E1015')).toBeUndefined();
    });
});
