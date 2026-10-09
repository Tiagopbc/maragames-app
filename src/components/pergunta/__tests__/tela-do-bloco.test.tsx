import { render, screen, userEvent, within } from '@testing-library/react-native';

import { repositorio } from '@/data/repositorio';
import { ordemDasAlternativas } from '@/lib/embaralhar';
import type { RepositorioFalso } from '@/test/repositorio-falso';
import type { BlocoQuestao, Fase, FormaPre, Question } from '@/types/domain';

import { TelaDoBloco } from '../tela-do-bloco';

// A tela só enxerga a interface ProgressRepository; aqui ela recebe a versão em memória,
// e o módulo real (que carrega o Firebase) nem chega a ser importado.
jest.mock('@/data/repositorio', () => {
    const { RepositorioFalso } = require('@/test/repositorio-falso');
    return { repositorio: new RepositorioFalso() };
});

const repo = repositorio as unknown as RepositorioFalso;

const UID = 'u1';

let agora = 0; // o relógio que a tela enxerga; o teste adianta à mão
const aoSair = jest.fn();

function questao(id: string, topicId: string, bloco: BlocoQuestao, order: number): Question {
    return {
        id,
        lessonId: `licao_${topicId}`,
        topicId,
        order,
        bloco,
        dificuldade: 'basico',
        formato: 'multipla_escolha',
        enunciado: `Enunciado de ${id}`,
        alternativas: [
            { id: 'a', texto: `Certa de ${id}`, correta: true, explicacao: `Por que a de ${id} está certa.` },
            { id: 'b', texto: `Errada B de ${id}`, correta: false, explicacao: `Por que a B de ${id} está errada.` },
            { id: 'c', texto: `Errada C de ${id}`, correta: false, explicacao: `Por que a C de ${id} está errada.` },
            { id: 'd', texto: `Errada D de ${id}`, correta: false, explicacao: `Por que a D de ${id} está errada.` },
        ],
        fonte: null,
        versaoConteudo: 'v1',
    };
}

// Um tópico com 2 questões de prática, 2 da forma A e 2 da forma B.
beforeEach(() => {
    aoSair.mockClear();
    repo.reiniciar();
    repo.licoes = [{ id: 'licao_mda', title: 'Framework MDA', order: 1, topicId: 'mda' }];
    repo.questoes = [
        questao('mda_a1', 'mda', 'forma_a', 1),
        questao('mda_a2', 'mda', 'forma_a', 2),
        questao('mda_b1', 'mda', 'forma_b', 3),
        questao('mda_b2', 'mda', 'forma_b', 4),
        questao('mda_p1', 'mda', 'pratica', 5),
        questao('mda_p2', 'mda', 'pratica', 6),
    ];
});


async function abrir(fase: Fase, opcoes: { formaPre?: FormaPre | null; topicId?: string | null } = {}) {
    agora = 50_000;
    await render(
        <TelaDoBloco
            uid={UID}
            fase={fase}
            topicId={opcoes.topicId ?? null}
            formaPre={opcoes.formaPre === undefined ? 'A' : opcoes.formaPre}
            aoSair={aoSair}
            relogio={() => agora}
        />
    );
}

const alternativa = (texto: string) => screen.getByRole('radio', { name: new RegExp(texto) });
const confianca = (rotulo: string) => screen.getByRole('radio', { name: rotulo });
const confirmar = () => screen.getByRole('button', { name: 'Confirmar' });

async function responder(texto: string, rotulo: string) {
    const user = userEvent.setup();
    await user.press(alternativa(texto));
    await user.press(confianca(rotulo));
    await user.press(confirmar());
}

describe('a pergunta', () => {
    it('mostra o tópico, a posição no bloco, o enunciado, as 4 alternativas e os 3 níveis de confiança', async () => {
        await abrir('pratica');

        expect(await screen.findByText('Enunciado de mda_p1')).toBeOnTheScreen();
        expect(screen.getByText('Framework MDA')).toBeOnTheScreen();
        expect(screen.getByText('1/2')).toBeOnTheScreen();
        expect(screen.getAllByRole('radio', { name: /de mda_p1/ })).toHaveLength(4);
        expect(confianca('Palpite')).toBeOnTheScreen();
        expect(confianca('Tenho dúvida')).toBeOnTheScreen();
        expect(confianca('Tenho certeza')).toBeOnTheScreen();
    });

    it('mostra as alternativas na ordem sorteada pela semente do participante, da questão e da fase', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        const ordem = ordemDasAlternativas(UID, 'mda_p1', 'pratica', ['a', 'b', 'c', 'd']);
        const textoDe: Record<string, string> = {
            a: 'Certa de mda_p1',
            b: 'Errada B de mda_p1',
            c: 'Errada C de mda_p1',
            d: 'Errada D de mda_p1',
        };

        expect(screen.getAllByRole('radio', { name: /de mda_p1/ }).map((el) => el.props.accessibilityLabel)).toEqual(
            ordem.map((id, i) => `${'ABCD'[i]}. ${textoDe[id]}`)
        );
    });

    it('não tem opção de pular', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        expect(screen.queryByRole('button', { name: /pular/i })).not.toBeOnTheScreen();
    });
});

// Em tela de celular, o que fica dentro da área que rola pode sumir abaixo da dobra. A confiança
// não pode depender de rolagem: um nível que o participante não vê enviesa a medida.
describe('a barra de progresso', () => {
    const barra = () => screen.getByRole('progressbar');

    it('começa vazia e conta o total de questões do bloco', async () => {
        await abrir('pre');
        await screen.findByText('Enunciado de mda_a1');

        expect(barra()).toHaveAccessibilityValue({ min: 0, max: 2, now: 0 });
    });

    it('no bloco medido, anda quando a questão seguinte aparece', async () => {
        await abrir('pre');
        await screen.findByText('Enunciado de mda_a1');

        await responder('Certa de mda_a1', 'Palpite');
        await screen.findByText('Enunciado de mda_a2');

        expect(barra()).toHaveAccessibilityValue({ min: 0, max: 2, now: 1 });
    });

    it('na prática, anda já no feedback da questão respondida', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        await responder('Certa de mda_p1', 'Tenho certeza');
        await screen.findByText('Firme');

        expect(barra()).toHaveAccessibilityValue({ min: 0, max: 2, now: 1 });
    });

    it('quem retoma o bloco encontra a barra onde parou', async () => {
        await abrir('pre');
        await screen.findByText('Enunciado de mda_a1');
        await responder('Certa de mda_a1', 'Palpite');
        await screen.findByText('Enunciado de mda_a2');
        await screen.unmount();

        await abrir('pre');
        await screen.findByText('Enunciado de mda_a2');

        expect(barra()).toHaveAccessibilityValue({ min: 0, max: 2, now: 1 });
    });
});

describe('o rodapé fixo', () => {
    const rodape = () => within(screen.getByTestId('rodape-da-pergunta'));

    it('os três níveis de confiança e o Confirmar ficam no rodapé', async () => {
        await abrir('pre');
        await screen.findByText('Enunciado de mda_a1');

        expect(rodape().getByRole('radio', { name: 'Palpite' })).toBeOnTheScreen();
        expect(rodape().getByRole('radio', { name: 'Tenho dúvida' })).toBeOnTheScreen();
        expect(rodape().getByRole('radio', { name: 'Tenho certeza' })).toBeOnTheScreen();
        expect(rodape().getByRole('button', { name: 'Confirmar' })).toBeOnTheScreen();
    });

    it('enunciado e alternativas ficam na área que rola, fora do rodapé', async () => {
        await abrir('pre');
        await screen.findByText('Enunciado de mda_a1');

        expect(rodape().queryByText('Enunciado de mda_a1')).not.toBeOnTheScreen();
        expect(rodape().queryAllByRole('radio', { name: /de mda_a1/ })).toHaveLength(0);
    });

    it('no feedback da prática, a confiança declarada continua à vista no rodapé, travada', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await responder('Certa', 'Tenho dúvida');
        await screen.findByText('Você acertou');

        expect(rodape().getByRole('radio', { name: 'Tenho dúvida' })).toBeChecked();
        expect(rodape().getByRole('radio', { name: 'Tenho dúvida' })).toBeDisabled();
        expect(rodape().getByRole('button', { name: 'Próxima' })).toBeOnTheScreen();
    });

    it('o feedback fica na área que rola, e não empurra o rodapé', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await responder('Certa', 'Tenho certeza');
        await screen.findByText('Você acertou');

        expect(rodape().queryByText('Você acertou')).not.toBeOnTheScreen();
    });
});

describe('o botão Confirmar', () => {
    it('começa desabilitado', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        expect(confirmar()).toBeDisabled();
    });

    it('continua desabilitado só com a alternativa marcada', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        await userEvent.setup().press(alternativa('Certa'));

        expect(confirmar()).toBeDisabled();
        expect(screen.getByText('Falta dizer quanto você confia.')).toBeOnTheScreen();
    });

    it('continua desabilitado só com a confiança marcada', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        await userEvent.setup().press(confianca('Palpite'));

        expect(confirmar()).toBeDisabled();
        expect(screen.getByText('Falta escolher uma alternativa.')).toBeOnTheScreen();
    });

    it('habilita com alternativa e depois confiança', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        const user = userEvent.setup();

        await user.press(alternativa('Certa'));
        await user.press(confianca('Palpite'));

        expect(confirmar()).toBeEnabled();
    });

    it('habilita com confiança e depois alternativa', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        const user = userEvent.setup();

        await user.press(confianca('Tenho certeza'));
        await user.press(alternativa('Errada B'));

        expect(confirmar()).toBeEnabled();
    });

    it('tocar no botão desabilitado não grava nada', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        const user = userEvent.setup();

        await user.press(alternativa('Certa'));
        await user.press(confirmar());

        expect(repo.respostas).toEqual([]);
    });
});

describe('a confirmação', () => {
    it('trocar de seleção antes de confirmar não grava nada, e vale a última', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        const user = userEvent.setup();

        await user.press(alternativa('Errada B'));
        await user.press(confianca('Tenho certeza'));
        await user.press(alternativa('Certa'));
        await user.press(confianca('Tenho dúvida'));
        expect(repo.respostas).toEqual([]);

        await user.press(confirmar());
        await screen.findByText('Você acertou');

        expect(repo.respostas).toHaveLength(1);
        expect(repo.respostas[0]).toMatchObject({ escolha: 'a', confianca: 2 });
    });

    it('grava o evento completo, com a ordem em que as alternativas apareceram', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        await responder('Errada C', 'Palpite');
        await screen.findByText('Você errou');

        expect(repo.respostas).toHaveLength(1);
        expect(repo.respostas[0]).toMatchObject({
            uid: UID,
            questionId: 'mda_p1',
            topicId: 'mda',
            attemptId: repo.attempts[0].id,
            fase: 'pratica',
            escolha: 'c',
            ordemExibida: ordemDasAlternativas(UID, 'mda_p1', 'pratica', ['a', 'b', 'c', 'd']),
            correta: false,
            confianca: 1,
        });
    });

    it('mede o tempo de quando a questão aparece até o Confirmar', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        agora += 8_200;
        await responder('Certa', 'Palpite');
        await screen.findByText('Você acertou');

        expect(repo.respostas[0].tempoMs).toBe(8_200);
    });

    it('zera o cronômetro a cada questão', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        agora += 8_200;
        await responder('Certa', 'Palpite');
        await screen.findByText('Você acertou');

        agora += 60_000; // tempo lendo o feedback não conta
        await userEvent.setup().press(screen.getByRole('button', { name: 'Próxima' }));
        await screen.findByText('Enunciado de mda_p2');
        agora += 3_000;
        await responder('Certa', 'Palpite');
        await screen.findByText('Você acertou');

        expect(repo.respostas[1].tempoMs).toBe(3_000);
    });
});

describe('o feedback na prática', () => {
    it('acerto com certeza: mostra o acerto, o selo Firme, o XP e a explicação', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        await responder('Certa', 'Tenho certeza');

        expect(await screen.findByText('Você acertou')).toBeOnTheScreen();
        expect(screen.getByText('Firme')).toBeOnTheScreen();
        expect(screen.getByText('+3 XP')).toBeOnTheScreen();
        expect(screen.getByText('Por que a de mda_p1 está certa.')).toBeOnTheScreen();
    });

    it('erro com certeza: mostra o erro, o selo Ponto cego, a perda de XP e as duas explicações', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        await responder('Errada D', 'Tenho certeza');

        expect(await screen.findByText('Você errou')).toBeOnTheScreen();
        expect(screen.getByText('Ponto cego')).toBeOnTheScreen();
        expect(screen.getByText('−4 XP')).toBeOnTheScreen();
        expect(screen.getByText('Por que a D de mda_p1 está errada.')).toBeOnTheScreen();
        expect(screen.getByText('Por que a de mda_p1 está certa.')).toBeOnTheScreen();
    });

    it('trava a resposta: depois do feedback não dá para marcar outra alternativa nem confirmar de novo', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await responder('Errada D', 'Palpite');
        await screen.findByText('Você errou');

        expect(alternativa('Certa')).toBeDisabled();
        expect(confianca('Tenho certeza')).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeOnTheScreen();
    });

    it('"Próxima" leva à questão seguinte, com nada marcado', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await responder('Certa', 'Tenho certeza');
        await screen.findByText('Você acertou');

        await userEvent.setup().press(screen.getByRole('button', { name: 'Próxima' }));

        expect(await screen.findByText('Enunciado de mda_p2')).toBeOnTheScreen();
        expect(screen.getByText('2/2')).toBeOnTheScreen();
        expect(confirmar()).toBeDisabled();
        expect(confianca('Tenho certeza')).not.toBeChecked();
    });
});

describe.each(['pre', 'pos', 'reteste'] as const)('o bloco medido %s', (fase) => {
    // Com forma A no pré, o pós e o reteste usam a forma B.
    const [primeira, segunda] = fase === 'pre' ? ['mda_a1', 'mda_a2'] : ['mda_b1', 'mda_b2'];

    it('passa direto à questão seguinte, sem acerto, XP, selo nem explicação', async () => {
        await abrir(fase);
        await screen.findByText(`Enunciado de ${primeira}`);

        await responder('Certa', 'Tenho certeza');

        expect(await screen.findByText(`Enunciado de ${segunda}`)).toBeOnTheScreen();
        expect(repo.respostas).toHaveLength(1);
        expect(screen.queryByText('Você acertou')).not.toBeOnTheScreen();
        expect(screen.queryByText('Firme')).not.toBeOnTheScreen();
        expect(screen.queryByText(/XP/)).not.toBeOnTheScreen();
        expect(screen.queryByText(/Por que/)).not.toBeOnTheScreen();
    });

    it('avisa que o resultado só aparece no fim', async () => {
        await abrir(fase);

        expect(
            await screen.findByText('Sem resultado por questão: tudo aparece no fim do bloco.')
        ).toBeOnTheScreen();
    });
});

describe('blocos medidos e a forma do participante', () => {
    it('quem tem forma B faz a forma B no pré', async () => {
        await abrir('pre', { formaPre: 'B' });

        expect(await screen.findByText('Enunciado de mda_b1')).toBeOnTheScreen();
        expect(screen.getByText('Pré-teste')).toBeOnTheScreen();
    });

    it('sem forma definida, o bloco medido não abre', async () => {
        await abrir('pre', { formaPre: null });

        expect(
            await screen.findByText('Este bloco só abre depois do termo de consentimento.')
        ).toBeOnTheScreen();
        expect(repo.attempts).toEqual([]);
    });

    it('a prática não depende da forma', async () => {
        await abrir('pratica', { formaPre: null });

        expect(await screen.findByText('Enunciado de mda_p1')).toBeOnTheScreen();
    });
});

describe('retomada e fim do bloco', () => {
    it('volta na primeira questão ainda sem resposta nesta fase', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await responder('Certa', 'Palpite');
        await screen.findByText('Você acertou');
        await screen.unmount();

        await abrir('pratica');

        expect(await screen.findByText('Enunciado de mda_p2')).toBeOnTheScreen();
        expect(screen.getByText('2/2')).toBeOnTheScreen();
    });

    it('reaproveita a tentativa em andamento em vez de criar outra', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await screen.unmount();

        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        expect(repo.attempts).toHaveLength(1);
    });

    it('na última questão o botão vira "Concluir" e fecha a tentativa', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await responder('Certa', 'Palpite');
        await userEvent.setup().press(await screen.findByRole('button', { name: 'Próxima' }));
        await screen.findByText('Enunciado de mda_p2');
        await responder('Certa', 'Palpite');

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Concluir' }));

        expect(await screen.findByText('Resultado')).toBeOnTheScreen();
        expect(repo.attempts[0].concluida).toBe(true);
    });

    it('no bloco medido, a última confirmação já encerra o bloco', async () => {
        await abrir('pre');
        await screen.findByText('Enunciado de mda_a1');
        await responder('Certa', 'Palpite');
        await screen.findByText('Enunciado de mda_a2');

        await responder('Certa', 'Palpite');

        expect(await screen.findByText('Resultado')).toBeOnTheScreen();
        expect(repo.respostas).toHaveLength(2);
        expect(repo.attempts[0].concluida).toBe(true);
    });

    it('"Voltar ao início" chama a saída do bloco', async () => {
        repo.questoes = repo.questoes.filter((q) => q.bloco !== 'pratica');
        await abrir('pratica');

        await userEvent.setup().press(await screen.findByRole('button', { name: 'Voltar ao início' }));

        expect(aoSair).toHaveBeenCalled();
    });

    it('o X sai do bloco no meio da questão, sem gravar resposta', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');

        await userEvent.setup().press(screen.getByRole('button', { name: 'Sair do bloco' }));

        expect(aoSair).toHaveBeenCalled();
        expect(repo.respostas).toEqual([]);
    });
});

describe('o resultado no fim do bloco', () => {
    // Prática de MDA: acerto com certeza na primeira (Firme, +3) e erro com certeza na segunda (Ponto cego, −4).
    async function terminarPratica() {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await responder('Certa', 'Tenho certeza');
        await userEvent.setup().press(await screen.findByRole('button', { name: 'Próxima' }));
        await screen.findByText('Enunciado de mda_p2');
        await responder('Errada B', 'Tenho certeza');
        await userEvent.setup().press(await screen.findByRole('button', { name: 'Concluir' }));
        await screen.findByText('Resultado');
    }

    it('mostra o saldo de XP do bloco, mesmo negativo, e os acertos', async () => {
        await terminarPratica();

        expect(screen.getByText('XP do bloco')).toBeOnTheScreen();
        expect(screen.getByText('−1 XP')).toBeOnTheScreen();
        expect(screen.getByText('Acertou 1 de 2')).toBeOnTheScreen();
    });

    it('mostra a contagem de cada quadrante', async () => {
        await terminarPratica();

        expect(screen.getByLabelText('Firme: 1')).toBeOnTheScreen();
        expect(screen.getByLabelText('Frágil: 0')).toBeOnTheScreen();
        expect(screen.getByLabelText('Lacuna: 0')).toBeOnTheScreen();
        expect(screen.getByLabelText('Ponto cego: 1')).toBeOnTheScreen();
    });

    it('na prática, manda revisar a questão errada com certeza e não a que está firme', async () => {
        await terminarPratica();

        expect(screen.getByText('O que revisar primeiro')).toBeOnTheScreen();
        expect(screen.getByText('Enunciado de mda_p2')).toBeOnTheScreen();
        expect(screen.queryByText('Enunciado de mda_p1')).not.toBeOnTheScreen();
    });

    it('na prática, não mostra acerto por tópico nem por confiança', async () => {
        await terminarPratica();

        expect(screen.queryByText('Acerto por tópico')).not.toBeOnTheScreen();
        expect(screen.queryByText('Acerto por confiança')).not.toBeOnTheScreen();
    });

    it('com tudo firme, diz que não há o que revisar', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        await responder('Certa', 'Tenho certeza');
        await userEvent.setup().press(await screen.findByRole('button', { name: 'Próxima' }));
        await screen.findByText('Enunciado de mda_p2');
        await responder('Certa', 'Tenho certeza');
        await userEvent.setup().press(await screen.findByRole('button', { name: 'Concluir' }));

        expect(await screen.findByText('Nada a revisar: tudo o que você respondeu está firme.')).toBeOnTheScreen();
    });

    describe.each(['pre', 'pos', 'reteste'] as const)('no bloco medido %s', (fase) => {
        const [primeira, segunda] = fase === 'pre' ? ['mda_a1', 'mda_a2'] : ['mda_b1', 'mda_b2'];

        // Acerto com palpite (Frágil, +1) e erro com certeza (Ponto cego, −4).
        async function terminar() {
            await abrir(fase);
            await screen.findByText(`Enunciado de ${primeira}`);
            await responder('Certa', 'Palpite');
            await screen.findByText(`Enunciado de ${segunda}`);
            await responder('Errada C', 'Tenho certeza');
            await screen.findByText('Resultado');
        }

        it('o XP e os quadrantes aparecem agora, no fim', async () => {
            await terminar();

            expect(screen.getByText('−3 XP')).toBeOnTheScreen();
            expect(screen.getByLabelText('Ponto cego: 1')).toBeOnTheScreen();
            expect(screen.getByLabelText('Frágil: 1')).toBeOnTheScreen();
        });

        it('mostra o acerto por tópico e por nível de confiança', async () => {
            await terminar();

            expect(screen.getByText('Acerto por tópico')).toBeOnTheScreen();
            expect(screen.getByLabelText('Framework MDA: 1 de 2')).toBeOnTheScreen();
            expect(screen.getByText('Acerto por confiança')).toBeOnTheScreen();
            expect(screen.getByLabelText('Palpite: 1 de 1')).toBeOnTheScreen();
            expect(screen.getByLabelText('Tenho dúvida: sem respostas')).toBeOnTheScreen();
            expect(screen.getByLabelText('Tenho certeza: 0 de 1')).toBeOnTheScreen();
        });

        it('manda revisar por tópico, sem revelar nenhuma questão nem gabarito', async () => {
            await terminar();

            expect(screen.getByText('O que revisar primeiro')).toBeOnTheScreen();
            expect(screen.getByText('1 ponto cego · 1 frágil')).toBeOnTheScreen();
            expect(screen.queryByText(/Enunciado de/)).not.toBeOnTheScreen();
            expect(screen.queryByText(/Certa de|Errada . de/)).not.toBeOnTheScreen();
            expect(screen.queryByText(/Por que/)).not.toBeOnTheScreen();
        });
    });

    it('reabrir um bloco já concluído mostra o mesmo resultado', async () => {
        await terminarPratica();
        await screen.unmount();

        await abrir('pratica', { topicId: 'mda' });

        expect(await screen.findByText('Resultado')).toBeOnTheScreen();
        expect(screen.getByText('−1 XP')).toBeOnTheScreen();
        expect(screen.getByText('Enunciado de mda_p2')).toBeOnTheScreen();
        expect(repo.respostas).toHaveLength(2);
    });

    it('"Voltar ao início" sai do resultado', async () => {
        await terminarPratica();

        await userEvent.setup().press(screen.getByRole('button', { name: 'Voltar ao início' }));

        expect(aoSair).toHaveBeenCalledTimes(1);
    });
});

describe('falhas', () => {
    // O hook avisa no console quando a rede falha; aqui a falha é provocada de propósito.
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('se a gravação falha, avisa, mantém as seleções e não mostra o feedback', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        repo.falhasAoGravar = 1;

        await responder('Certa', 'Tenho certeza');

        expect(
            await screen.findByText('Não foi possível gravar a resposta. Confira a conexão e confirme de novo.')
        ).toBeOnTheScreen();
        expect(screen.queryByText('Você acertou')).not.toBeOnTheScreen();
        expect(alternativa('Certa')).toBeChecked();
        expect(confianca('Tenho certeza')).toBeChecked();
        expect(confirmar()).toBeEnabled();
    });

    it('confirmar de novo depois da falha grava uma vez só, com o tempo da primeira confirmação', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        repo.falhasAoGravar = 1;
        agora += 5_000;
        await responder('Certa', 'Tenho certeza');
        await screen.findByText(/Não foi possível gravar/);

        agora += 30_000; // tempo olhando o aviso de erro não é tempo de resposta
        await userEvent.setup().press(confirmar());

        expect(await screen.findByText('Você acertou')).toBeOnTheScreen();
        expect(repo.respostas).toHaveLength(1);
        expect(repo.respostas[0].tempoMs).toBe(5_000);
    });

    it('se o evento foi gravado mas a chamada falhou, confirmar de novo não duplica o evento', async () => {
        await abrir('pratica');
        await screen.findByText('Enunciado de mda_p1');
        repo.falhaDepoisDeGravar = true;
        await responder('Errada B', 'Palpite');
        await screen.findByText(/Não foi possível gravar/);

        await userEvent.setup().press(confirmar());

        expect(await screen.findByText('Você errou')).toBeOnTheScreen();
        expect(repo.respostas).toHaveLength(1);
    });

    it('se o conteúdo não carrega, mostra o erro e deixa tentar de novo', async () => {
        repo.falhaAoCarregar = true;
        await abrir('pratica');
        expect(await screen.findByText(/Não foi possível carregar as questões/)).toBeOnTheScreen();

        repo.falhaAoCarregar = false;
        await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar de novo' }));

        expect(await screen.findByText('Enunciado de mda_p1')).toBeOnTheScreen();
    });
});
