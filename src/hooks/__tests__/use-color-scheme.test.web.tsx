import { act, useState, type ReactElement } from 'react';

// Teste do projeto "web" do jest (jsdom + react-native-web): o defeito que ele cobre só existe lá.

type Esquema = 'light' | 'dark';
type Ouvinte = (evento: { matches: boolean }) => void;

// O jsdom não tem `matchMedia`. Esta consulta falsa imita o disparo do evento `change` do
// navegador nos dois pontos que importam aqui: a lista de ouvintes é copiada no começo do
// disparo e quem sai dela no meio do caminho não é chamado; e o React redesenha entre um ouvinte
// e o seguinte, porque trata `change` como evento discreto.
function criarConsultaFalsa() {
    let ouvintes: Ouvinte[] = [];
    return {
        matches: false,
        addListener(ouvinte: Ouvinte) {
            ouvintes.push(ouvinte);
        },
        removeListener(ouvinte: Ouvinte) {
            ouvintes = ouvintes.filter((o) => o !== ouvinte);
        },
        definir(esquema: Esquema) {
            this.matches = esquema === 'dark';
        },
        mudarPara(esquema: Esquema) {
            this.definir(esquema);
            for (const ouvinte of [...ouvintes]) {
                if (!ouvintes.includes(ouvinte)) continue;
                act(() => ouvinte({ matches: this.matches }));
            }
        },
    };
}

// O react-native-web lê `window.matchMedia` uma vez só, ao carregar. Por isso a consulta falsa
// entra antes, e o que depende dela vem por `require`, que não sobe para o topo do arquivo.
const consulta = criarConsultaFalsa();
window.matchMedia = () => consulta as unknown as MediaQueryList;

const { useColorScheme } = require('@/hooks/use-color-scheme') as typeof import('@/hooks/use-color-scheme');

// O react-dom vem com o Expo para a web, mas sem os tipos instalados; só isto é usado.
type Raiz = { render(elemento: ReactElement): void; unmount(): void };
const { createRoot, hydrateRoot } = require('react-dom/client') as {
    createRoot(onde: Element): Raiz;
    hydrateRoot(onde: Element, elemento: ReactElement, opcoes: { onRecoverableError(erro: unknown): void }): Raiz;
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Como a home: lê o esquema por conta própria e redesenha sozinha depois de montada (lá, quando
// o roteiro termina de carregar).
function Tela() {
    const esquema = useColorScheme();
    const [carregou, setCarregou] = useState(false);
    return (
        <button data-testid="tela" data-carregou={carregou} onClick={() => setCarregou(true)}>
            {esquema}
        </button>
    );
}

// Como o componente que o expo-router põe em volta de cada tela: também lê o esquema, e quando
// redesenha leva a tela junto.
function Moldura() {
    const esquema = useColorScheme();
    return (
        <div data-testid="moldura" data-esquema={esquema}>
            <Tela />
        </div>
    );
}

let onde: HTMLElement;
let raiz: Raiz | undefined;

const tela = () => onde.querySelector<HTMLElement>('[data-testid="tela"]')!;
const moldura = () => onde.querySelector<HTMLElement>('[data-testid="moldura"]')!;

beforeEach(() => {
    consulta.definir('light');
    onde = document.createElement('div');
    document.body.appendChild(onde);
});

afterEach(() => {
    act(() => raiz?.unmount());
    raiz = undefined;
    onde.remove();
});

describe('useColorScheme na web', () => {
    it('começa no esquema do sistema', () => {
        consulta.definir('dark');

        act(() => {
            raiz = createRoot(onde);
            raiz.render(<Moldura />);
        });

        expect(moldura().dataset.esquema).toBe('dark');
        expect(tela().textContent).toBe('dark');
    });

    it('a tela acompanha a troca de esquema mesmo redesenhada antes por quem está em volta', () => {
        act(() => {
            raiz = createRoot(onde);
            raiz.render(<Moldura />);
        });
        // A tela redesenha sozinha: o ouvinte dela passa a vir depois do ouvinte da moldura.
        act(() => tela().click());
        expect(tela().dataset.carregou).toBe('true');

        consulta.mudarPara('dark');

        expect(moldura().dataset.esquema).toBe('dark');
        expect(tela().textContent).toBe('dark');

        consulta.mudarPara('light');

        expect(moldura().dataset.esquema).toBe('light');
        expect(tela().textContent).toBe('light');
    });

    it('hidrata a página estática, que sai em claro, e só depois assume o esquema do sistema', () => {
        consulta.definir('dark');
        onde.innerHTML = '<button data-testid="tela" data-carregou="false">light</button>';
        const aoDivergir = jest.fn();

        act(() => {
            raiz = hydrateRoot(onde, <Tela />, { onRecoverableError: aoDivergir });
        });

        expect(aoDivergir).not.toHaveBeenCalled();
        expect(tela().textContent).toBe('dark');
    });
});
