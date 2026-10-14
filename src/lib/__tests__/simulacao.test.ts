import type { Answer, Question, Topico } from '../../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from '../bloco';
import { diaDeCalendario } from '../calendario';
import { ordemDasAlternativas } from '../embaralhar';
import { exportarDados } from '../exportacao';
import { DIAS_ATE_A_REVISAO } from '../licao';
import { modulosDosTopicos } from '../perfil';
import { perfilDeResposta } from '../perfis-de-resposta';
import { indicadoresDoRelatorio, relatorioHtml } from '../relatorio';
import { TIPOS_DE_ALUNO, conteudoDoRepositorio, sementeAleatoria, simularTurma, type TipoDeAluno, type Turma } from '../simulacao';

// A turma simulada é a base sintética para validar o app (itens 23 e 35): alunos virtuais de
// perfis variados, sorteados sem proporção fixa, respondendo às lições. Nada disto vem do banco
// nem vai para ele, e a página diz que os dados são sintéticos.

const topicosDoRepositorio = require('../../../content/topicos.json');
const questoesDoRepositorio = require('../../../content/questoes.json');

const CONTEUDO = conteudoDoRepositorio(topicosDoRepositorio, questoesDoRepositorio);
const INICIO = Date.parse('2026-09-01T00:00:00-03:00');

function turma(alunos: number, semente = 7, sementeDoPerfil?: number): Turma {
    return simularTurma(CONTEUDO, { alunos, semente, sementeDoPerfil, inicio: INICIO });
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
        expect(turma(20, 8).dados.respostas).not.toEqual(turma(20).dados.respostas);
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

    it('todo aluno tem o perfil do núcleo: faixa etária, sexo, experiência e situação de estudo', () => {
        expect(dados.perfis.every((p) => p.faixaEtaria && p.sexo && p.experiencia && p.situacaoDeEstudo)).toBe(true);
        expect(new Set(dados.perfis.map((p) => p.sexo)).size).toBeGreaterThan(1);
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
            expect(taxa(ind.pos)).toBeGreaterThan(taxa(ind.pre));
            expect(ind.ganhoMedio).toBeGreaterThan(0);
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

    describe('a variedade da turma', () => {
        const grande = turma(300);
        const tipoDe = (uid: string) => grande.tipos[uid];
        const respostasDoTipo = (tipo: TipoDeAluno) =>
            grande.dados.respostas.filter((r) => tipoDe(r.uid) === tipo && r.fase !== 'reteste');
        const taxaDe = (respostas: Answer[], conta: (r: Answer) => boolean) => respostas.filter(conta).length / respostas.length;

        it('todo aluno tem um tipo, e a turma mistura vários', () => {
            expect(Object.keys(grande.tipos)).toHaveLength(300);
            expect(new Set(Object.values(grande.tipos)).size).toBeGreaterThanOrEqual(5);
        });

        it('as proporções dos tipos são sorteadas: mudam de uma turma para outra', () => {
            expect(turma(300, 7).proporcoes).not.toEqual(turma(300, 8).proporcoes);
            const soma = Object.values(grande.proporcoes).reduce((a, b) => a + b, 0);
            expect(soma).toBeCloseTo(1);
        });

        it('cada tipo tem um nome e uma frase que diz como ele responde', () => {
            expect(Object.keys(TIPOS_DE_ALUNO)).toEqual([
                'domina',
                'aluno_do_curso',
                'com_dificuldade',
                'chutador',
                'confiante_demais',
                'inseguro',
                'desiste_cedo',
            ]);
            for (const tipo of Object.values(TIPOS_DE_ALUNO)) expect(tipo.descricao.length).toBeGreaterThan(15);
        });

        it('há alunos que acertam quase tudo e alunos que acertam quase nada', () => {
            const acertoDe = (uid: string) => {
                const delas = grande.dados.respostas.filter((r) => r.uid === uid && r.fase !== 'reteste');
                return delas.length >= 6 ? taxaDe(delas, (r) => r.correta) : null;
            };
            const acertos = grande.dados.perfis.map((p) => acertoDe(p.uid)).filter((a): a is number => a !== null);

            expect(Math.max(...acertos)).toBeGreaterThan(0.85);
            expect(Math.min(...acertos)).toBeLessThan(0.25);
        });

        it('quem domina acerta mais do que quem tem dificuldade', () => {
            const correta = (r: Answer) => r.correta;
            expect(taxaDe(respostasDoTipo('domina'), correta)).toBeGreaterThan(taxaDe(respostasDoTipo('com_dificuldade'), correta) + 0.3);
        });

        it('quem chuta responde rápido e acerta perto do acaso', () => {
            const doChute = respostasDoTipo('chutador');
            const tempoMedio = (rs: Answer[]) => rs.reduce((s, r) => s + r.tempoMs, 0) / rs.length;

            expect(taxaDe(doChute, (r) => r.correta)).toBeLessThan(0.4);
            expect(tempoMedio(doChute)).toBeLessThan(tempoMedio(respostasDoTipo('domina')) / 2);
        });

        it('quem é confiante demais erra com certeza muito mais do que quem domina', () => {
            const pontoCego = (r: Answer) => !r.correta && r.confianca === 3;
            expect(taxaDe(respostasDoTipo('confiante_demais'), pontoCego)).toBeGreaterThan(taxaDe(respostasDoTipo('domina'), pontoCego) + 0.2);
        });

        it('quem duvida do que sabe acerta bem, mas quase não marca certeza', () => {
            const doInseguro = respostasDoTipo('inseguro');
            expect(taxaDe(doInseguro, (r) => r.correta)).toBeGreaterThan(0.55);
            expect(taxaDe(doInseguro, (r) => r.confianca === 3)).toBeLessThan(0.2);
        });

        it('quem desiste cedo para antes da prática da primeira lição', () => {
            const desistentes = grande.dados.perfis.filter((p) => tipoDe(p.uid) === 'desiste_cedo');
            for (const p of desistentes) expect(grande.dados.respostas.filter((r) => r.uid === p.uid).length).toBeLessThan(6);
        });

        it('a retenção não é plantada: sai de quem sabe de verdade, e muda de turma para turma', () => {
            const diferenca = (t: Turma) => {
                const ind = indicadoresDa(t);
                return taxa(ind.firmes) - taxa(ind.frageis);
            };
            // Acerto dado com certeza costuma ser de quem sabe, e o que se sabe tende a ficar.
            expect(diferenca(grande)).toBeGreaterThan(0);
            expect(diferenca(turma(300, 8))).not.toBeCloseTo(diferenca(grande), 2);
        });

        it('o perfil de resposta, tirado só das respostas, reconhece a maior parte dos tipos sorteados', () => {
            const esperado: Record<TipoDeAluno, string> = {
                domina: 'domina',
                aluno_do_curso: 'em_progresso',
                com_dificuldade: 'com_dificuldade',
                chutador: 'chuta',
                confiante_demais: 'confiante_demais',
                inseguro: 'inseguro',
                desiste_cedo: 'poucas_respostas',
            };
            const acertos = grande.dados.perfis.filter((p) => {
                const delas = grande.dados.respostas.filter((r) => r.uid === p.uid && r.fase !== 'reteste');
                return perfilDeResposta(delas) === esperado[tipoDe(p.uid)];
            });
            expect(acertos.length / grande.dados.perfis.length).toBeGreaterThan(0.6);
        });

        it('o sexo e a faixa etária não entram no desempenho: trocar o sorteio do perfil não muda resposta nenhuma', () => {
            const outra = turma(100, 7, 99);
            const base = turma(100, 7);

            expect(outra.dados.perfis.map((p) => p.sexo)).not.toEqual(base.dados.perfis.map((p) => p.sexo));
            expect(outra.dados.respostas).toEqual(base.dados.respostas);
        });
    });
});

describe('sementeAleatoria', () => {
    it('dá um inteiro positivo, e outro a cada chamada', () => {
        const a = sementeAleatoria();
        const b = sementeAleatoria();

        expect(Number.isInteger(a) && a > 0).toBe(true);
        expect(a).not.toBe(b);
    });
});

describe('a página do relatório com dados simulados', () => {
    const t = turma(100);
    const ind = indicadoresDa(t);
    const simulada = relatorioHtml(ind, { geradoEm: '2026-10-13', simulacao: { alunos: 100, semente: 7 } });
    const real = relatorioHtml(ind, { geradoEm: '2026-10-13' });

    it('diz, logo no topo, que os dados são sintéticos, para validar o app, e não evidência de retenção', () => {
        const topo = simulada.slice(simulada.indexOf('<body>'), simulada.indexOf('<h2'));

        expect(topo).toContain('Dados sintéticos para validação do aplicativo');
        expect(topo).toContain('100 alunos virtuais');
        expect(topo).toContain('semente 7');
        expect(topo).toContain('nenhum é evidência sobre a retenção de conteúdo');
    });

    it('avisa que sexo e idade não influenciam o desempenho no gerador', () => {
        expect(simulada).toContain('sexo e faixa etária não influenciam o desempenho');
    });

    it('o título da aba também avisa', () => {
        expect(simulada).toContain('<title>Beast Maragames · Relatório de aprendizagem (simulação)</title>');
    });

    it('em "Como ler", explica o que é a base sintética e o que ela não prova', () => {
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
        const { dados } = simularTurma({ topicos, questoes: semFormaB }, { alunos: 30, semente: 7, inicio: INICIO });

        expect(dados.respostas.some((r) => r.topicId === 'mda_framework')).toBe(false);
        expect(dados.respostas.length).toBeGreaterThan(0);
    });
});
