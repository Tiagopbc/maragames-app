import type { Answer, Question, Topico } from '../../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from '../bloco';
import { diaDeCalendario } from '../calendario';
import { ordemDasAlternativas } from '../embaralhar';
import { exportarDados } from '../exportacao';
import { DIAS_ATE_A_REVISAO } from '../licao';
import { modulosDosTopicos } from '../perfil';
import { indicadoresDoRelatorio, relatorioHtml } from '../relatorio';
import { CENARIOS, conteudoDoRepositorio, simularTurma, type Cenario, type Turma } from '../simulacao';

// A turma simulada serve para mostrar à Beast Maragames como o relatório fica com gente
// respondendo (item 23). São alunos virtuais: nada disto vem do banco nem vai para ele, e a
// página diz que os dados são simulados.

const topicosDoRepositorio = require('../../../content/topicos.json');
const questoesDoRepositorio = require('../../../content/questoes.json');

const CONTEUDO = conteudoDoRepositorio(topicosDoRepositorio, questoesDoRepositorio);
const INICIO = Date.parse('2026-09-01T00:00:00-03:00');

function turma(alunos: number, cenario: Cenario = 'confianca_preve', semente = 7): Turma {
    return simularTurma(CONTEUDO, { alunos, cenario, semente, inicio: INICIO });
}

function indicadoresDa(t: Turma) {
    return indicadoresDoRelatorio(exportarDados(t.dados, { agora: t.agora }), CONTEUDO);
}

const taxa = (t: { acertos: number; total: number }) => t.acertos / t.total;

describe('conteudoDoRepositorio', () => {
    it('transforma os arquivos de content/ nos tópicos e nas questões que as contas do app usam', () => {
        expect(CONTEUDO.topicos).toHaveLength(9);
        expect(CONTEUDO.questoes).toHaveLength(100);
        expect(CONTEUDO.topicos[0]).toEqual({ id: 'mda_framework', titulo: 'Framework MDA', modulo: 'Fundamentos de Game Design', ordem: 1 });
    });

    it('os tópicos saem na ordem sugerida, e as questões, na ordem do arquivo dentro de cada tópico', () => {
        const ordens = CONTEUDO.topicos.map((t) => t.ordem);
        expect(ordens).toEqual([...ordens].sort((a, b) => a - b));

        const doMda = CONTEUDO.questoes.filter((q) => q.topicId === 'mda_framework');
        expect(doMda.map((q) => q.order)).toEqual(doMda.map((_, i) => i + 1));
        expect(doMda[0].id).toBe('mda_framework_01');
    });
});

describe('simularTurma', () => {
    const { dados, agora } = turma(100);
    const respostasDe = (uid: string) => dados.respostas.filter((r) => r.uid === uid);

    it('cria o número de alunos pedido, todos com o termo aceito', () => {
        expect(dados.perfis).toHaveLength(100);
        expect(dados.perfis.every((p) => p.consentiuEm !== null && p.formaPre !== null)).toBe(true);
    });

    it('divide as formas A e B meio a meio, como o contador do termo faz', () => {
        expect(dados.perfis.filter((p) => p.formaPre === 'A')).toHaveLength(50);
        expect(dados.perfis.filter((p) => p.formaPre === 'B')).toHaveLength(50);
    });

    it('a mesma semente dá a mesma turma, e outra semente, outra turma', () => {
        expect(turma(20)).toEqual(turma(20));
        expect(turma(20, 'confianca_preve', 8).dados.respostas).not.toEqual(turma(20).dados.respostas);
    });

    it('os alunos são virtuais: sem nome de gente, sem contato e sem cidade', () => {
        for (const perfil of dados.perfis) {
            expect(perfil.nome).toMatch(/^Aluno virtual \d{3}$/);
            expect(perfil.uid).toMatch(/^virtual-\d{3}$/);
            expect(perfil.email).toBeUndefined();
            expect(perfil.telefone).toBeUndefined();
            expect(perfil.cidade).toBeUndefined();
        }
    });

    it('todo aluno tem o perfil do núcleo: faixa etária, experiência e situação de estudo', () => {
        expect(dados.perfis.every((p) => p.faixaEtaria && p.experiencia && p.situacaoDeEstudo)).toBe(true);
        // Uma turma de verdade não é toda igual.
        expect(new Set(dados.perfis.map((p) => p.experiencia)).size).toBe(3);
        expect(new Set(dados.perfis.map((p) => p.faixaEtaria)).size).toBeGreaterThan(2);
    });

    describe('cada resposta é uma resposta que o app gravaria', () => {
        const questaoPorId = new Map(CONTEUDO.questoes.map((q) => [q.id, q]));
        const tentativaPorId = new Map((dados.tentativas ?? []).map((t) => [t.id, t]));

        it('a escolha é uma alternativa da questão, e o acerto bate com o gabarito', () => {
            for (const r of dados.respostas) {
                const escolhida = questaoPorId.get(r.questionId)!.alternativas.find((a) => a.id === r.escolha);
                expect(escolhida).toBeDefined();
                expect(r.correta).toBe(escolhida!.correta);
            }
        });

        it('a ordem das alternativas é a que o app mostraria àquela pessoa, naquela questão e naquele passo', () => {
            for (const r of dados.respostas.slice(0, 300)) {
                const ids = questaoPorId.get(r.questionId)!.alternativas.map((a) => a.id);
                expect(r.ordemExibida).toEqual(ordemDasAlternativas(r.uid, r.questionId, r.fase, ids));
            }
        });

        it('a confiança é 1, 2 ou 3, e o tópico é o da questão', () => {
            for (const r of dados.respostas) {
                expect([1, 2, 3]).toContain(r.confianca);
                expect(r.topicId).toBe(questaoPorId.get(r.questionId)!.topicId);
                expect(r.tempoMs).toBeGreaterThan(0);
            }
        });

        it('toda resposta pertence a uma tentativa, com a plataforma e a versão do app', () => {
            for (const r of dados.respostas) {
                const tentativa = tentativaPorId.get(r.attemptId);
                expect(tentativa).toBeDefined();
                expect(['web', 'android', 'ios']).toContain(tentativa!.plataforma);
                expect(tentativa!.versaoDoApp).toBe('1.0.0');
            }
        });

        it('nenhuma resposta é do futuro, e as de cada pessoa estão em ordem', () => {
            for (const perfil of dados.perfis) {
                const horarios = respostasDe(perfil.uid).map((r) => r.respondidaEm);
                expect(horarios).toEqual([...horarios].sort((a, b) => a - b));
                expect(horarios.every((h) => h >= perfil.consentiuEm! && h <= agora)).toBe(true);
            }
        });
    });

    describe('cada lição segue as regras do app', () => {
        const porLicao = dados.perfis.flatMap((perfil) =>
            CONTEUDO.topicos.map((topico) => ({
                perfil,
                topicId: topico.id,
                respostas: respostasDe(perfil.uid).filter((r) => r.topicId === topico.id),
            }))
        );
        const daFase = (respostas: Answer[], fase: Answer['fase']) => respostas.filter((r) => r.fase === fase);
        const ids = (questoes: readonly Question[]) => questoes.map((q) => q.id).sort();

        it('o diagnóstico usa a forma da pessoa; a verificação, a outra; a revisão repete a verificação', () => {
            for (const { perfil, topicId, respostas } of porLicao) {
                const doPre = ids(questoesDoBlocoMedido(CONTEUDO.questoes, 'pre', [topicId], perfil.formaPre!));
                const doPos = ids(questoesDoBlocoMedido(CONTEUDO.questoes, 'pos', [topicId], perfil.formaPre!));

                for (const r of daFase(respostas, 'pre')) expect(doPre).toContain(r.questionId);
                for (const r of daFase(respostas, 'pos')) expect(doPos).toContain(r.questionId);
                for (const r of daFase(respostas, 'reteste')) expect(doPos).toContain(r.questionId);
            }
        });

        it('nenhum passo começa antes de o anterior terminar', () => {
            for (const { perfil, topicId, respostas } of porLicao) {
                const completo = (fase: 'pre' | 'pos') =>
                    daFase(respostas, fase).length === questoesDoBlocoMedido(CONTEUDO.questoes, fase, [topicId], perfil.formaPre!).length;
                const praticaCompleta = daFase(respostas, 'pratica').length === questoesDaPratica(CONTEUDO.questoes, topicId).length;
                const fim = (fase: Answer['fase']) => Math.max(...daFase(respostas, fase).map((r) => r.respondidaEm));
                const comeco = (fase: Answer['fase']) => Math.min(...daFase(respostas, fase).map((r) => r.respondidaEm));

                if (daFase(respostas, 'pratica').length > 0) {
                    expect(completo('pre')).toBe(true);
                    expect(comeco('pratica')).toBeGreaterThan(fim('pre'));
                }
                if (daFase(respostas, 'pos').length > 0) {
                    expect(praticaCompleta).toBe(true);
                    expect(comeco('pos')).toBeGreaterThan(fim('pratica'));
                }
                if (daFase(respostas, 'reteste').length > 0) {
                    expect(completo('pos')).toBe(true);
                    expect(diaDeCalendario(comeco('reteste')) - diaDeCalendario(fim('pos'))).toBeGreaterThanOrEqual(DIAS_ATE_A_REVISAO);
                }
            }
        });

        it('ninguém responde a mesma questão duas vezes no mesmo passo', () => {
            for (const { respostas } of porLicao) {
                const chaves = respostas.map((r) => `${r.fase}|${r.questionId}`);
                expect(new Set(chaves).size).toBe(chaves.length);
            }
        });

        it('as contas do app leem a turma inteira no ciclo completo, sem revisão antes da hora', () => {
            const exportado = exportarDados(dados, { agora });

            expect(exportado.licoes.every((l) => l.ciclo === 'completo')).toBe(true);
            expect(exportado.agregados.antesDaHora).toBe(0);
            expect(exportado.agregados.participantes).toBe(100);
        });
    });

    describe('a autoavaliação', () => {
        const modulos = modulosDosTopicos(CONTEUDO.topicos).map((m) => m.id);

        it('todo aluno se dá uma nota de 1 a 5 em cada módulo do conteúdo', () => {
            expect(dados.autoavaliacoes).toHaveLength(100);
            for (const a of dados.autoavaliacoes ?? []) {
                expect(Object.keys(a.notas).sort()).toEqual([...modulos].sort());
                for (const nota of Object.values(a.notas)) expect([1, 2, 3, 4, 5]).toContain(nota);
            }
        });

        it('a nota vem depois do termo e antes da primeira resposta', () => {
            for (const perfil of dados.perfis) {
                const nota = dados.autoavaliacoes!.find((a) => a.uid === perfil.uid)!;
                const primeira = Math.min(...respostasDe(perfil.uid).map((r) => r.respondidaEm), Infinity);
                expect(nota.respondidaEm).toBeGreaterThanOrEqual(perfil.consentiuEm!);
                expect(nota.respondidaEm).toBeLessThan(primeira);
            }
        });
    });

    describe('o que a turma mostra no relatório', () => {
        const ind = indicadoresDa(turma(100));

        it('nem todo mundo vai até o fim: há quem pare antes da verificação e quem não volte para a revisão', () => {
            const { licoes } = ind.engajamento;

            expect(licoes.verificadas).toBeGreaterThan(0);
            expect(licoes.verificadas).toBeLessThan(licoes.comecadas);
            expect(licoes.revisadas).toBeGreaterThan(0);
            expect(licoes.revisadas).toBeLessThan(licoes.verificadas);
        });

        it('a turma aprende: acerta mais na verificação do que no diagnóstico', () => {
            expect(taxa(ind.pos)).toBeGreaterThan(taxa(ind.pre) + 0.1);
            expect(ind.ganhoMedio).toBeGreaterThan(0.15);
        });

        it('a confiança acompanha o acerto: quem marca certeza acerta mais do que quem marca palpite', () => {
            expect(taxa(ind.porConfianca[3])).toBeGreaterThan(taxa(ind.porConfianca[1]) + 0.1);
        });

        it('há os quatro quadrantes, inclusive ponto cego', () => {
            for (const quantas of Object.values(ind.quadrantesNoPos)) expect(quantas).toBeGreaterThan(0);
        });

        it('os nove tópicos aparecem, e há questões com respostas suficientes para julgar', () => {
            expect(ind.porTopico).toHaveLength(9);
            expect(ind.conteudo.avaliadas).toBeGreaterThan(50);
            expect(ind.conteudo.aRever.length).toBeGreaterThan(0);
        });

        it('todo módulo tem a nota das pessoas ao lado do acerto no diagnóstico', () => {
            expect(ind.autoavaliacao).toHaveLength(modulosDosTopicos(CONTEUDO.topicos).length);
            expect(ind.autoavaliacao.every((a) => a.diagnostico.total > 0)).toBe(true);
        });

        it('as respostas vêm das três plataformas', () => {
            expect(ind.engajamento.plataformas.map((p) => p.rotulo).sort()).toEqual(['Android', 'Web', 'iPhone']);
        });
    });

    describe('os dois cenários da pergunta central', () => {
        // Com 300 alunos, a diferença plantada não se confunde com o acaso do sorteio.
        const preve = indicadoresDa(turma(300, 'confianca_preve'));
        const naoPreve = indicadoresDa(turma(300, 'confianca_nao_preve'));

        it('num, quem acertou com certeza esquece bem menos do que quem acertou sem certeza', () => {
            expect(taxa(preve.firmes) - taxa(preve.frageis)).toBeGreaterThan(0.2);
        });

        it('no outro, Firmes e Frágeis esquecem igual', () => {
            expect(Math.abs(taxa(naoPreve.firmes) - taxa(naoPreve.frageis))).toBeLessThan(0.08);
        });

        it('o resto da turma é o mesmo nos dois: só o esquecimento muda', () => {
            expect(naoPreve.pre).toEqual(preve.pre);
            expect(naoPreve.pos).toEqual(preve.pos);
            expect(naoPreve.engajamento.licoes.verificadas).toBe(preve.engajamento.licoes.verificadas);
        });

        it('cada cenário tem um título, uma frase que o explica e o arquivo em que a página é gravada', () => {
            expect(Object.keys(CENARIOS).sort()).toEqual(['confianca_nao_preve', 'confianca_preve']);
            expect(CENARIOS.confianca_preve.arquivo).toBe('index.html');
            expect(CENARIOS.confianca_nao_preve.arquivo).toBe('confianca-nao-preve.html');
            for (const cenario of Object.values(CENARIOS)) {
                expect(cenario.titulo.length).toBeGreaterThan(10);
                expect(cenario.descricao.length).toBeGreaterThan(30);
            }
        });
    });
});

describe('a página do relatório com dados simulados', () => {
    const t = turma(100);
    const ind = indicadoresDa(t);
    const simulada = relatorioHtml(ind, { geradoEm: '2026-10-13', simulacao: { alunos: 100, cenario: 'confianca_preve' } });
    const real = relatorioHtml(ind, { geradoEm: '2026-10-13' });

    it('diz, logo no topo, que os dados são simulados e de quantos alunos virtuais', () => {
        const topo = simulada.slice(simulada.indexOf('<body>'), simulada.indexOf('<h2'));

        expect(topo).toContain('Dados simulados');
        expect(topo).toContain('100 alunos virtuais');
        expect(topo).toContain('Nenhum número desta página veio de alunos de verdade');
    });

    it('diz qual é o cenário e leva ao outro', () => {
        expect(simulada).toContain(CENARIOS.confianca_preve.titulo);
        expect(simulada).toContain(CENARIOS.confianca_preve.descricao);
        expect(simulada).toContain(`href="${CENARIOS.confianca_nao_preve.arquivo}"`);
    });

    it('o título da aba também avisa', () => {
        expect(simulada).toContain('<title>Beast Maragames · Relatório de aprendizagem (simulação)</title>');
    });

    it('em "Como ler", explica o que é a simulação e o que ela não prova', () => {
        const comoLer = simulada.slice(simulada.indexOf('Como ler estes números'));

        expect(comoLer).toContain('alunos virtuais');
        expect(comoLer).toContain('não é resultado de pesquisa');
    });

    it('a página com dados de verdade não fala em simulação', () => {
        expect(real).not.toMatch(/simula/i);
        expect(real).not.toContain('virtuais');
    });

    it('continua sem buscar nada na internet e sem script', () => {
        expect(simulada).not.toMatch(/https?:/);
        expect(simulada).not.toContain('<script');
    });

    it('com cem alunos, os percentuais aparecem', () => {
        expect(simulada).toMatch(/<strong>\d+%<\/strong>/);
    });
});

describe('conteúdo pequeno demais', () => {
    it('tópico sem as duas formas fica de fora da simulação, que só faz lição de ciclo completo', () => {
        const topicos: Topico[] = [...CONTEUDO.topicos];
        const semFormaB = CONTEUDO.questoes.filter((q) => !(q.topicId === 'mda_framework' && q.bloco === 'forma_b'));
        const { dados } = simularTurma({ topicos, questoes: semFormaB }, { alunos: 30, cenario: 'confianca_preve', semente: 7, inicio: INICIO });

        expect(dados.respostas.some((r) => r.topicId === 'mda_framework')).toBe(false);
        expect(dados.respostas.length).toBeGreaterThan(0);
    });
});
