// As contas que o script de limpeza escolhe (scripts/limpar-dados-de-teste.js). Apagar não tem
// volta, então a escolha é testada aqui; a parte que fala com o banco não roda em teste.

const { escolherContas, resumirContas, validarOpcoes } = require('../../scripts/limpar-dados-de-teste');

const USUARIOS = [
    { uid: 'u2', email: 'bia@exemplo.com', apelido: 'Bia' },
    { uid: 'u1', email: 'ana@exemplo.com', apelido: 'Ana', consentiuEm: 500, formaPre: 'A' },
];
const RESPOSTAS = [{ uid: 'u1' }, { uid: 'u1' }, { uid: 'u2' }];
const TENTATIVAS = [{ uid: 'u1' }];
// As notas por módulo (`selfAssessments`) têm o uid como id do documento.
const NOTAS = ['u1'];
// Os logins do Firebase Auth. O Caio criou a conta e parou antes do perfil: só tem o login. A Bia
// tem perfil, mas o login dela já não existe.
const LOGINS = [
    { uid: 'u1', email: 'ana@exemplo.com' },
    { uid: 'u3', email: 'caio@exemplo.com' },
];

describe('resumirContas', () => {
    it('conta as respostas e as tentativas de cada conta, em ordem de e-mail, e diz se ela deu as notas por módulo', () => {
        expect(resumirContas(USUARIOS, RESPOSTAS, TENTATIVAS, NOTAS, LOGINS)).toEqual([
            {
                uid: 'u1',
                email: 'ana@exemplo.com',
                apelido: 'Ana',
                temPerfil: true,
                temLogin: true,
                aceitouOTermo: true,
                deuAsNotas: true,
                respostas: 2,
                tentativas: 1,
            },
            {
                uid: 'u2',
                email: 'bia@exemplo.com',
                apelido: 'Bia',
                temPerfil: true,
                temLogin: false,
                aceitouOTermo: false,
                deuAsNotas: false,
                respostas: 1,
                tentativas: 0,
            },
            {
                uid: 'u3',
                email: 'caio@exemplo.com',
                apelido: '',
                temPerfil: false,
                temLogin: true,
                aceitouOTermo: false,
                deuAsNotas: false,
                respostas: 0,
                tentativas: 0,
            },
        ]);
    });

    // Quem criou o login e parou antes do perfil não tem documento em `users`: sem os logins, a
    // lista não o mostraria, e a conta não teria como ser apagada.
    it('mostra também quem só tem o login, sem perfil', () => {
        expect(resumirContas(USUARIOS, [], [], [], LOGINS).map((c) => c.email)).toContain('caio@exemplo.com');
    });
});

describe('escolherContas', () => {
    const contas = resumirContas(USUARIOS, RESPOSTAS, TENTATIVAS, NOTAS, LOGINS);

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

describe('validarOpcoes', () => {
    it('apagar exige dizer de quais contas', () => {
        expect(() => validarOpcoes({ emails: [], apagar: true, apagarConta: false })).toThrow('--email');
    });

    // Apagar a conta inteira inclui a limpeza: não faz sentido apagar o login e deixar as respostas.
    it('apagar a conta exige dizer de quais contas', () => {
        expect(() => validarOpcoes({ emails: [], apagar: false, apagarConta: true })).toThrow('--email');
    });

    it('sem apagar nada, qualquer combinação passa', () => {
        expect(() => validarOpcoes({ emails: [], apagar: false, apagarConta: false })).not.toThrow();
        expect(() => validarOpcoes({ emails: ['a@exemplo.com'], apagar: true, apagarConta: true })).not.toThrow();
    });
});
