// Em JavaScript, como o teste das cores: lê arquivos com o Node.
const { readFileSync } = require('fs');
const { join } = require('path');

const perfil = require('@/lib/perfil');

// A validação do perfil existe em dobro (item 9): no app, para a mensagem ser boa, e na regra
// do Firestore, que é a garantia. As listas de opções estão nos dois lugares; este teste barra
// uma lista mudar num e não no outro. O comportamento da regra é testado no emulador
// (`npm run test:regras`); aqui só se compara o texto.

const regras = readFileSync(join(__dirname, '..', '..', 'firestore.rules'), 'utf8').replace(/\s+/g, ' ');

const naRegra = (lista) => `[${lista.map((valor) => (typeof valor === 'number' ? valor : `'${valor}'`)).join(', ')}]`;

const LISTAS = {
    'faixas etárias': perfil.FAIXAS_ETARIAS,
    'siglas dos estados': perfil.UFS,
    'situações de estudo': perfil.SITUACOES_DE_ESTUDO,
    'níveis de experiência': perfil.EXPERIENCIAS,
    ocupações: perfil.OCUPACOES,
    engines: perfil.ENGINES,
    linguagens: perfil.LINGUAGENS,
    'estudos de game design': perfil.ESTUDOS_DE_GAME_DESIGN,
    interesses: perfil.INTERESSES,
    objetivos: perfil.OBJETIVOS,
    'tempos por semana': perfil.TEMPOS_POR_SEMANA,
    'como conheceu': perfil.COMO_CONHECEU,
    'notas da autoavaliação': perfil.NOTAS_DA_AUTOAVALIACAO,
};

it.each(Object.entries(LISTAS))('a lista de %s da regra é a do app', (_nome, lista) => {
    expect(regras).toContain(naRegra(lista));
});

it('a regra exige instituição e curso nas mesmas situações que o app', () => {
    const exigem = perfil.SITUACOES_DE_ESTUDO.filter((s) => perfil.pedeInstituicaoECurso(s));

    expect(regras).toContain(`!(d.situacaoDeEstudo in ${naRegra(exigem)})`);
});
