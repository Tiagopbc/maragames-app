import type { Answer, Perfil, Question, Topico } from '../../types/domain';
import { questoesDaPratica, questoesDoBlocoMedido } from '../bloco';
import { diaDeCalendario } from '../calendario';
import { ordemDasAlternativas } from '../embaralhar';
import { incluiZero } from '../estatistica';
import { exportarDados } from '../exportacao';
import { DIAS_ATE_A_REVISAO } from '../licao';
import { modulosDosTopicos, perfilCompleto } from '../perfil';
import { perfilDeResposta } from '../perfis-de-resposta';
import { validarTelefone } from '../validacao';
import { indicadoresDoRelatorio, relatorioHtml } from '../relatorio';
import {
    CENARIOS,
    bancoFicticio,
    DIAS_DA_SIMULACAO,
    TIPOS_DE_ALUNO,
    conteudoDoRepositorio,
    matrizDeConfusao,
    sementeAleatoria,
    simularTurma,
    type OpcoesDaSimulacao,
    type TipoDeAluno,
    type Turma,
} from '../simulacao';

// A turma simulada é a base sintética para validar o app (itens 23 e 35): alunos virtuais de
// perfis variados, sorteados sem proporção fixa, respondendo às lições. Nada disto vem do banco
// nem vai para ele, e a página diz que os dados são sintéticos.

const topicosDoRepositorio = require('../../../content/topicos.json');
const questoesDoRepositorio = require('../../../content/questoes.json');

const CONTEUDO = conteudoDoRepositorio(topicosDoRepositorio, questoesDoRepositorio);
const INICIO = Date.parse('2026-09-01T00:00:00-03:00');

function turma(alunos: number, semente = 7, sementeDoPerfil?: number, extra: Partial<OpcoesDaSimulacao> = {}): Turma {
    return simularTurma(CONTEUDO, { alunos, semente, sementeDoPerfil, inicio: INICIO, ...extra });
}

function indicadoresDa(t: Turma) {
    return indicadoresDoRelatorio(exportarDados(t.dados, { agora: t.agora }), CONTEUDO);
}

const taxa = (t: { acertos: number; total: number }) => t.acertos / t.total;

describe('conteudoDoRepositorio', () => {
    it('as questões levam a versão do conteúdo que o script calcula, e não um valor fixo', () => {
        const comVersao = conteudoDoRepositorio(topicosDoRepositorio, questoesDoRepositorio, 'abc123def456');

        expect(new Set(comVersao.questoes.map((q) => q.versaoConteudo))).toEqual(new Set(['abc123def456']));
    });

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

        it('nada do cadastro entra no desempenho: trocar o sorteio do perfil não muda resposta nenhuma', () => {
            const outra = turma(100, 7, 99);
            const base = turma(100, 7);
            const campo = (t: Turma, nome: 'sexo' | 'faixaEtaria' | 'experiencia' | 'situacaoDeEstudo' | 'alunoDoSite') =>
                t.dados.perfis.map((p) => p[nome]);

            for (const nome of ['sexo', 'faixaEtaria', 'experiencia', 'situacaoDeEstudo', 'alunoDoSite'] as const) {
                expect(campo(outra, nome)).not.toEqual(campo(base, nome));
            }
            expect(outra.dados.respostas).toEqual(base.dados.respostas);
        });
    });
});

describe('o gerador para medir o instrumento', () => {
    const grande = turma(300);
    const pessoasPorTopico = (t: Turma) =>
        new Map(CONTEUDO.topicos.map((tp) => [tp.id, new Set(t.dados.respostas.filter((r) => r.topicId === tp.id && r.fase === 'pre').map((r) => r.uid))]));
    const inicioDeCadaLicao = (t: Turma, uid: string) => {
        const inicio = new Map<string, number>();
        for (const r of t.dados.respostas) if (r.uid === uid && r.fase === 'pre' && !inicio.has(r.topicId)) inicio.set(r.topicId, r.respondidaEm);
        return [...inicio].sort((a, b) => a[1] - b[1]);
    };

    describe('a escolha do tópico', () => {
        it('os nove tópicos entram na simulação', () => {
            for (const [, pessoas] of pessoasPorTopico(turma(100))) expect(pessoas.size).toBeGreaterThan(0);
        });

        it('cada aluno escolhe o tópico: a cobertura não cai pela ordem sugerida', () => {
            const tamanhos = [...pessoasPorTopico(grande).values()].map((p) => p.size);

            expect(Math.max(...tamanhos) / Math.min(...tamanhos)).toBeLessThan(2.5);
        });

        it('a turma guarda os tópicos de cada aluno, na ordem em que ele os começou', () => {
            for (const perfil of grande.dados.perfis.slice(0, 60)) {
                expect(grande.topicos[perfil.uid]).toEqual(inicioDeCadaLicao(grande, perfil.uid).map(([topicId]) => topicId));
            }
        });

        it('nenhum aluno repete um tópico', () => {
            for (const lista of Object.values(grande.topicos)) expect(new Set(lista).size).toBe(lista.length);
        });

        it('com o limite diário, ninguém começa duas lições novas no mesmo dia', () => {
            const limitada = turma(150, 7, undefined, { limiteDiario: true });

            for (const perfil of limitada.dados.perfis) {
                const dias = inicioDeCadaLicao(limitada, perfil.uid).map(([, quando]) => diaDeCalendario(quando));
                expect(new Set(dias).size).toBe(dias.length);
            }
            // Sem o limite, há quem faça duas no mesmo dia.
            const repetem = grande.dados.perfis.some((p) => {
                const dias = inicioDeCadaLicao(grande, p.uid).map(([, quando]) => diaDeCalendario(quando));
                return new Set(dias).size < dias.length;
            });
            expect(repetem).toBe(true);
        });

        it('com dias de estudo, as lições novas começam só nesses dias, e as revisões vêm depois', () => {
            const piloto = turma(150, 7, undefined, { diasDeEstudo: 6, limiteDiario: true });

            for (const perfil of piloto.dados.perfis) {
                const entrada = diaDeCalendario(perfil.consentiuEm!);
                for (const [, quando] of inicioDeCadaLicao(piloto, perfil.uid)) expect(diaDeCalendario(quando) - entrada).toBeLessThan(6);
                expect(piloto.topicos[perfil.uid].length).toBeLessThanOrEqual(6);
            }
            expect(piloto.dados.respostas.some((r) => r.fase === 'reteste')).toBe(true);
        });

        it('a forma A e a B se dividem em cada tópico, dentro de uma folga', () => {
            const formaDe = new Map(grande.dados.perfis.map((p) => [p.uid, p.formaPre]));
            for (const [, pessoas] of pessoasPorTopico(grande)) {
                const naA = [...pessoas].filter((uid) => formaDe.get(uid) === 'A').length;
                expect(naA / pessoas.size).toBeGreaterThan(0.3);
                expect(naA / pessoas.size).toBeLessThan(0.7);
            }
        });
    });

    describe('os sorteios', () => {
        it('os distratores atraem conforme a questão, e não pela posição no arquivo', () => {
            const questoes = CONTEUDO.questoes.filter((q) => q.bloco !== 'pratica');
            const primeiroEhOMaisEscolhido = questoes.filter((q) => {
                const erros = grande.dados.respostas.filter((r) => r.questionId === q.id && !r.correta);
                if (erros.length < 10) return false;
                const vezes = (id: string) => erros.filter((r) => r.escolha === id).length;
                const erradas = q.alternativas.filter((a) => !a.correta);
                return erradas.every((a) => vezes(erradas[0].id) >= vezes(a.id));
            });

            expect(primeiroEhOMaisEscolhido.length / questoes.length).toBeLessThan(0.6);
        });

        it('a duração da turma vem de uma constante só, exportada', () => {
            expect(grande.agora - INICIO).toBe(DIAS_DA_SIMULACAO * 24 * 60 * 60 * 1000);
        });
    });

    describe('os cenários', () => {
        const base = turma(300, 11);
        const ind = (t: Turma) => indicadoresDa(t);

        it('a turma é a mesma em todos: mudar o cenário não muda os alunos nem o caminho deles', () => {
            const cega = turma(300, 11, undefined, { cenario: 'confianca_cega' });

            expect(cega.tipos).toEqual(base.tipos);
            expect(cega.topicos).toEqual(base.topicos);
            // A confiança muda; o acerto e a alternativa escolhida, não.
            expect(cega.dados.respostas.map((r) => [r.questionId, r.fase, r.correta, r.escolha])).toEqual(
                base.dados.respostas.map((r) => [r.questionId, r.fase, r.correta, r.escolha])
            );
            expect(cega.dados.respostas.map((r) => r.confianca)).not.toEqual(base.dados.respostas.map((r) => r.confianca));
        });

        it('base: a turma aprende', () => {
            expect(base.cenario).toBe('base');
            expect(taxa(ind(base).pos) - taxa(ind(base).pre)).toBeGreaterThan(0.08);
        });

        it('nulo: sem aprender e sem esquecer, a verificação acerta o mesmo que o diagnóstico', () => {
            const nulo = ind(turma(300, 11, undefined, { cenario: 'nulo' }));

            expect(Math.abs(taxa(nulo.pos) - taxa(nulo.pre))).toBeLessThan(0.04);
        });

        it('confiança cega: a certeza não diz nada sobre saber, e Firmes não resistem mais que Frágeis', () => {
            const cega = ind(turma(300, 11, undefined, { cenario: 'confianca_cega' }));

            expect(Math.abs(taxa(cega.firmes) - taxa(cega.frageis))).toBeLessThan(0.06);
        });

        it('o intervalo do ganho exclui o zero na base e inclui no nulo, e a página diz isso', () => {
            const naBase = ind(turma(100, 11)).incerteza.ganhoDaTurma!;
            const doNulo = ind(turma(100, 11, undefined, { cenario: 'nulo' }));

            expect(incluiZero(naBase)).toBe(false);
            expect(incluiZero(doNulo.incerteza.ganhoDaTurma!)).toBe(true);
            expect(relatorioHtml(doNulo, { geradoEm: '2026-10-13', simulacao: { alunos: 100, semente: 11 } })).toContain('sem evidência de ganho');
        });

        it('forma B mais difícil: a forma B acerta menos, e o contrabalanceamento mantém o ganho da turma', () => {
            const dificil = turma(300, 11, undefined, { cenario: 'forma_b_dificil' });
            const blocoDe = new Map(CONTEUDO.questoes.map((q) => [q.id, q.bloco]));
            const acertoNaForma = (t: Turma, bloco: string) => {
                const rs = t.dados.respostas.filter((r) => blocoDe.get(r.questionId) === bloco && r.fase !== 'reteste');
                return rs.filter((r) => r.correta).length / rs.length;
            };

            expect(acertoNaForma(dificil, 'forma_a') - acertoNaForma(dificil, 'forma_b')).toBeGreaterThan(0.05);
            expect(Math.abs(ind(dificil).ganhoDaTurma! - ind(base).ganhoDaTurma!)).toBeLessThan(0.06);
        });
    });

    describe('a matriz de confusão', () => {
        it('cruza o tipo sorteado com o perfil lido, e soma o número de alunos', () => {
            const matriz = matrizDeConfusao(grande);
            const soma = Object.values(matriz).flatMap((linha) => Object.values(linha)).reduce((a, b) => a + b, 0);

            expect(Object.keys(matriz)).toEqual(Object.keys(TIPOS_DE_ALUNO));
            expect(soma).toBe(300);
        });
    });
});

describe('bancoFicticio', () => {
    const t = turma(100, 1250808581);
    const banco = bancoFicticio(t);

    it('tem as quatro coleções do Firestore, uma entrada por aluno em users e selfAssessments', () => {
        expect(Object.keys(banco).sort()).toEqual(['answers', 'attempts', 'selfAssessments', 'users']);
        expect(Object.keys(banco.users)).toHaveLength(100);
        expect(Object.keys(banco.selfAssessments)).toHaveLength(100);
    });

    it('users guarda o perfil, a forma e o aceite, sem e-mail', () => {
        const ana = banco.users['virtual-001'];

        expect(ana).toMatchObject({ uid: 'virtual-001', formaPre: 'A', consentiuEm: expect.any(Number), sexo: expect.any(String) });
        for (const usuario of Object.values(banco.users)) expect(usuario).not.toHaveProperty('email');
    });

    it('todo perfil em users passa no núcleo obrigatório do app, com contato que não existe', () => {
        for (const usuario of Object.values(banco.users)) {
            expect(perfilCompleto(usuario as Partial<Perfil>)).toBe(true);
            // DDD 20 não existe no Brasil: o número passa na validação e não é de ninguém.
            expect(usuario.telefone).toMatch(/^20\d{9}$/);
            expect(validarTelefone(usuario.telefone!)).toBeNull();
            expect(usuario.cidade).toBe('Cidade virtual');
        }
        const estudam = Object.values(banco.users).filter((u) => u.situacaoDeEstudo === 'graduacao' || u.situacaoDeEstudo === 'pos');
        expect(estudam.length).toBeGreaterThan(0);
        for (const u of estudam) expect(u).toMatchObject({ instituicao: 'Instituição virtual', curso: 'Curso virtual' });
    });

    it('answers são as respostas da turma, uma por questão confirmada, com os campos do app', () => {
        expect(banco.answers).toEqual(t.dados.respostas);
        expect(Object.keys(banco.answers[0]).sort()).toEqual(
            ['attemptId', 'confianca', 'correta', 'escolha', 'fase', 'id', 'ordemExibida', 'questionId', 'respondidaEm', 'tempoMs', 'topicId', 'uid'].sort()
        );
    });

    it('cada passo de lição é uma tentativa, com as questões respondidas nela, a plataforma e a versão', () => {
        const porId = new Map(banco.attempts.map((a) => [a.id, a]));

        expect(banco.attempts).toHaveLength(t.dados.tentativas!.length);
        for (const r of banco.answers) {
            const tentativa = porId.get(r.attemptId)!;
            expect(tentativa).toMatchObject({ uid: r.uid, fase: r.fase, lessonId: `licao_${r.topicId}` });
            expect(tentativa.respostas).toContain(r.questionId);
        }
        for (const a of banco.attempts) {
            expect(['web', 'android', 'ios']).toContain(a.plataforma);
            expect(a.createdAt).toBeLessThanOrEqual(Math.min(...banco.answers.filter((r) => r.attemptId === a.id).map((r) => r.respondidaEm)));
        }
    });

    it('a tentativa só fica concluída quando todas as questões do passo foram respondidas', () => {
        const desistentes = banco.attempts.filter((a) => !a.concluida);

        expect(banco.attempts.some((a) => a.concluida)).toBe(true);
        for (const a of desistentes) expect(a.fase).toBe('pre');
    });

    it('vira JSON e volta igual: é o arquivo do banco fictício', () => {
        expect(JSON.parse(JSON.stringify(banco))).toEqual(banco);
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

    it('avisa que nada do cadastro influencia o desempenho no gerador', () => {
        expect(simulada).toContain('nada do cadastro (sexo, faixa etária, experiência, estudo, aluno do site) influencia o desempenho');
    });

    it('o rodapé diz como repetir a turma: semente, versão do conteúdo e cenário', () => {
        const comTudo = relatorioHtml(ind, {
            geradoEm: '2026-10-13',
            simulacao: { alunos: 100, semente: 7, versaoConteudo: 'abc123def456', cenario: CENARIOS.nulo },
        });
        const rodape = comTudo.slice(comTudo.indexOf('<footer>'));

        expect(rodape).toContain('semente 7');
        expect(rodape).toContain('versão do conteúdo abc123def456');
        expect(rodape).toContain('cenário Nulo');
        expect(comTudo).toContain(CENARIOS.nulo.descricao);
    });

    it('com a matriz, mostra a conferência do classificador; sem ela, e na página real, não', () => {
        const matriz = { tipos: [{ rotulo: 'Domina o assunto', contagens: [3, 1] }], perfis: ['Domina o conteúdo', 'Em progresso'] };
        const comMatriz = relatorioHtml(ind, { geradoEm: '2026-10-13', simulacao: { alunos: 100, semente: 7, matriz } });

        expect(comMatriz).toContain('<h2>Conferência do classificador</h2>');
        expect(simulada).not.toContain('Conferência do classificador');
        expect(real).not.toContain('Conferência do classificador');
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
