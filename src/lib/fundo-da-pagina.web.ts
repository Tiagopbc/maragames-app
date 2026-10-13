// No navegador, o app ocupa a página, mas não é a página: a faixa do relógio e a barra de baixo
// do navegador do iPhone são pintadas com o fundo do `body`, e a barra de endereço de outros
// navegadores, com o `theme-color`. Sem isto, a página ficava branca e o app em tema escuro
// aparecia entre duas faixas brancas (item 31 das decisões).
export function pintarFundoDaPagina(cor: string): void {
    document.documentElement.style.backgroundColor = cor;
    document.body.style.backgroundColor = cor;

    let marca = document.querySelector('meta[name="theme-color"]');
    if (!marca) {
        marca = document.createElement('meta');
        marca.setAttribute('name', 'theme-color');
        document.head.appendChild(marca);
    }
    marca.setAttribute('content', cor);
}
