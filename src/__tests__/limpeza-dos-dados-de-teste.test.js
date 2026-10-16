// As contas que o script de limpeza escolhe (scripts/limpar-dados-de-teste.js). Apagar não tem
// volta, então a escolha é testada aqui; a parte que fala com o banco não roda em teste.

const { escolherContas, resumirContas } = require('../../scripts/limpar-dados-de-teste');

const USUARIOS = [
    { uid: 'u2', email: 'bia@exemplo.com', apelido: 'Bia' },
    { uid: 'u1', email: 'ana@exemplo.com', apelido: 'Ana', consentiuEm: 500, formaPre: 'A' },
];
const RESPOSTAS = [{ uid: 'u1' }, { uid: 'u1' }, { uid: 'u2' }];
const TENTATIVAS = [{ uid: 'u1' }];
// As notas por módulo (`selfAssessments`) têm o uid como id do documento.
const NOTAS = ['u1'];

describe('resumirContas', () => {
    it('conta as respostas e as tentativas de cada conta, em ordem de e-mail, e diz se ela deu as notas por módulo', () => {
        expect(resumirContas(USUARIOS, RESPOSTAS, TENTATIVAS, NOTAS)).toEqual([
            { uid: 'u1', email: 'ana@exemplo.com', apelido: 'Ana', aceitouOTermo: true, deuAsNotas: true, respostas: 2, tentativas: 1 },
            { uid: 'u2', email: 'bia@exemplo.com', apelido: 'Bia', aceitouOTermo: false, deuAsNotas: false, respostas: 1, tentativas: 0 },
        ]);
    });
});

describe('escolherContas', () => {
    const contas = resumirContas(USUARIOS, RESPOSTAS, TENTATIVAS, NOTAS);

    it('fica só com as contas dos e-mails pedidos, sem diferenciar maiúsculas', () => {
        expect(escolherContas(contas, [' ANA@exemplo.com ']).map((c) => c.uid)).toEqual(['u1']);
    });

    it('e-mail que não é de ninguém é erro, e nenhuma conta é escolhida', () => {
        expect(() => escolherContas(contas, ['ana@exemplo.com', 'ninguem@exemplo.com'])).toThrow('ninguem@exemplo.com');
    });

    it('sem e-mail nenhum, nenhuma conta é escolhida', () => {
        expect(escolherContas(contas, [])).toEqual([]);
    });
});
