// O conteúdo versionado em content/ (item 21), conferido pela mesma validação que o seed usa.
// Fica em JS puro, como os outros testes que leem arquivos do projeto: o script é Node.

const fs = require('fs');
const path = require('path');

const { validar } = require('../../scripts/seed-conteudo');

const ler = (nome) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'content', nome), 'utf8'));
const topicos = ler('topicos.json');
const questoes = ler('questoes.json');

const DIFICULDADES = ['avancado', 'basico', 'intermediario'];
const doBloco = (topicId, bloco) => questoes.filter((q) => q.topicId === topicId && q.bloco === bloco);

describe('o conteúdo do repositório', () => {
    it('passa na validação do seed', () => {
        expect(validar(topicos, questoes)).toEqual([]);
    });

    // A prova da Fase 8 do plano: os nove tópicos fazem o ciclo completo da lição.
    it.each(topicos.map((t) => t.topicId))('%s tem diagnóstico e verificação: formas A e B, uma questão por dificuldade', (topicId) => {
        for (const bloco of ['forma_a', 'forma_b']) {
            expect(doBloco(topicId, bloco).map((q) => q.dificuldade).sort()).toEqual(DIFICULDADES);
        }
        expect(doBloco(topicId, 'pratica').length).toBeGreaterThan(0);
    });

    it('nenhuma explicação começa com "Correto.": a tela já diz se a pessoa acertou', () => {
        const comPrefixo = questoes.flatMap((q) =>
            q.alternativas.filter((a) => /^\s*Correto\b/i.test(a.explicacao)).map((a) => `${q.id}/${a.id}`)
        );

        expect(comPrefixo).toEqual([]);
    });

    // O começo não é conferido: explicações de Lógica de Programação abrem com um número ou
    // com o nome de uma variável.
    it('toda explicação é uma frase fechada, com pontuação no fim', () => {
        const fora = questoes.flatMap((q) =>
            q.alternativas.filter((a) => !/[.!?)”"]$/.test(a.explicacao.trim())).map((a) => `${q.id}/${a.id}`)
        );

        expect(fora).toEqual([]);
    });

    it('toda questão diz de onde veio', () => {
        expect(questoes.filter((q) => typeof q.fonte !== 'string' || q.fonte.trim() === '').map((q) => q.id)).toEqual([]);
    });
});

describe('a validação do seed', () => {
    const semUma = (id) => questoes.filter((q) => q.id !== id);

    it('tópico com forma incompleta é erro: sem as três dificuldades não há antes e depois', () => {
        const umaDaFormaB = doBloco('gdd_documento', 'forma_b')[0];

        expect(validar(topicos, semUma(umaDaFormaB.id))).toEqual([
            expect.stringContaining('gdd_documento: forma_b deve ter uma questão básica, uma intermediária e uma avançada'),
        ]);
    });

    it('tópico só com prática continua válido: é o ciclo curto', () => {
        const soPratica = questoes.filter((q) => q.topicId !== 'gdd_documento' || q.bloco === 'pratica');

        expect(validar(topicos, soPratica)).toEqual([]);
    });

    it('tópico com uma forma só é erro', () => {
        const semFormaB = questoes.filter((q) => q.topicId !== 'gdd_documento' || q.bloco !== 'forma_b');

        expect(validar(topicos, semFormaB)).toEqual([expect.stringContaining('gdd_documento: forma_b')]);
    });
});
