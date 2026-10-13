import { act, type ReactElement } from 'react';

// Teste do projeto "web" do jest (jsdom + react-native-web): o defeito que ele cobre só existe lá.
// No navegador do iPhone, a faixa do relógio e a barra de baixo são pintadas com o fundo da
// página, e não com o do app. Sem cor na página, o app em tema escuro ficava entre duas faixas
// brancas.

type Esquema = 'light' | 'dark';

// O jsdom não tem `matchMedia`, e o react-native-web lê `window.matchMedia` uma vez só, ao
// carregar. Por isso a consulta falsa entra antes, e o que depende dela vem por `require`.
const consulta = {
    matches: false,
    ouvintes: [] as ((evento: { matches: boolean }) => void)[],
    addListener(ouvinte: (evento: { matches: boolean }) => void) {
        this.ouvintes.push(ouvinte);
    },
    removeListener(ouvinte: (evento: { matches: boolean }) => void) {
        this.ouvintes = this.ouvintes.filter((o) => o !== ouvinte);
    },
    mudarPara(esquema: Esquema) {
        this.matches = esquema === 'dark';
        for (const ouvinte of [...this.ouvintes]) act(() => ouvinte({ matches: this.matches }));
    },
};
window.matchMedia = () => consulta as unknown as MediaQueryList;

const { FundoDaPagina } = require('@/components/fundo-da-pagina') as typeof import('@/components/fundo-da-pagina');
const { Colors } = require('@/constants/theme') as typeof import('@/constants/theme');
const { escolherTema } = require('@/lib/tema') as typeof import('@/lib/tema');

// O react-dom vem com o Expo para a web, mas sem os tipos instalados; só isto é usado.
type Raiz = { render(elemento: ReactElement): void; unmount(): void };
const { createRoot } = require('react-dom/client') as { createRoot(onde: Element): Raiz };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let onde: HTMLElement;
let raiz: Raiz | undefined;

function montar() {
    act(() => {
        raiz = createRoot(onde);
        raiz.render(<FundoDaPagina />);
    });
}

// O navegador devolve a cor do estilo em `rgb(...)`; o elemento de apoio converte o `#RRGGBB` do
// tema para a mesma escrita.
function comoONavegadorEscreve(cor: string) {
    const apoio = document.createElement('div');
    apoio.style.backgroundColor = cor;
    return apoio.style.backgroundColor;
}

const corDoTema = () => document.querySelectorAll('meta[name="theme-color"]');

beforeEach(async () => {
    consulta.mudarPara('light');
    await act(() => escolherTema('sistema'));
    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
    corDoTema().forEach((meta) => meta.remove());
    onde = document.createElement('div');
    document.body.appendChild(onde);
});

afterEach(() => {
    act(() => raiz?.unmount());
    raiz = undefined;
    onde.remove();
});

describe('fundo da página na web', () => {
    it('no tema claro, a página fica com o fundo claro do tema', () => {
        montar();

        expect(document.body.style.backgroundColor).toBe(comoONavegadorEscreve(Colors.light.background));
        expect(document.documentElement.style.backgroundColor).toBe(comoONavegadorEscreve(Colors.light.background));
    });

    it('com o aparelho em escuro, a página fica com o fundo escuro do tema', () => {
        consulta.mudarPara('dark');

        montar();

        expect(document.body.style.backgroundColor).toBe(comoONavegadorEscreve(Colors.dark.background));
        expect(document.documentElement.style.backgroundColor).toBe(comoONavegadorEscreve(Colors.dark.background));
    });

    it('a escolha de "Escuro" no Perfil troca o fundo da página na hora, com o aparelho em claro', async () => {
        montar();

        await act(() => escolherTema('escuro'));

        expect(document.body.style.backgroundColor).toBe(comoONavegadorEscreve(Colors.dark.background));
    });

    it('a troca de tema do aparelho com o app aberto troca o fundo da página', () => {
        montar();

        consulta.mudarPara('dark');

        expect(document.body.style.backgroundColor).toBe(comoONavegadorEscreve(Colors.dark.background));
    });

    it('diz ao navegador a cor do tema, para a barra dele', () => {
        consulta.mudarPara('dark');

        montar();

        expect(corDoTema()).toHaveLength(1);
        expect(corDoTema()[0].getAttribute('content')).toBe(Colors.dark.background);
    });

    it('ao trocar de tema, atualiza a mesma marca de cor, sem criar outra', async () => {
        montar();
        expect(corDoTema()[0].getAttribute('content')).toBe(Colors.light.background);

        await act(() => escolherTema('escuro'));

        expect(corDoTema()).toHaveLength(1);
        expect(corDoTema()[0].getAttribute('content')).toBe(Colors.dark.background);
    });

    it('aproveita a marca de cor que a página já tiver', () => {
        const existente = document.createElement('meta');
        existente.setAttribute('name', 'theme-color');
        existente.setAttribute('content', '#123456');
        document.head.appendChild(existente);

        montar();

        expect(corDoTema()).toHaveLength(1);
        expect(corDoTema()[0]).toBe(existente);
        expect(existente.getAttribute('content')).toBe(Colors.light.background);
    });
});
