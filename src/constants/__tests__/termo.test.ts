import { TERMO, VERSAO_DO_TERMO } from '../termo';

const texto = TERMO.map((secao) => `${secao.titulo} ${secao.texto}`).join(' ');

describe('o termo de participação', () => {
    it('não descreve mais o roteiro do piloto', () => {
        for (const sobra of [
            /piloto/i,
            /30 minutos/i,
            /quatro tópicos/i,
            /teste inicial/i,
            /teste final/i,
            /questionário/i,
            /tópico novo por dia/i,
            /encontros/i,
        ]) {
            expect(texto).not.toMatch(sobra);
        }
    });

    it('descreve o ciclo da lição com os nomes que a tela usa', () => {
        for (const passo of [/diagnóstico/i, /cartão/i, /prática/i, /verificação/i, /revisão/i]) {
            expect(texto).toMatch(passo);
        }
        expect(texto).toMatch(/7 dias/);
    });

    it('avisa que o diagnóstico, a verificação e a revisão não mostram resultado por questão', () => {
        expect(texto).toMatch(/só aparece no fim/i);
    });

    it('diz que a pessoa declara a confiança em cada resposta', () => {
        expect(texto).toMatch(/quanto confia/i);
    });

    it('lista o que fica gravado de cada resposta e do perfil', () => {
        for (const dado of [
            /alternativa escolhida/i,
            /confiança/i,
            /tempo/i,
            /horário/i,
            /nome/i,
            /apelido/i,
            /e-mail/i,
            /telefone/i,
            /instituição/i,
            /curso/i,
            /experiência/i,
            /faixa etária/i,
            /sexo/i,
            /cidade/i,
            /estado/i,
            /situação de estudo/i,
        ]) {
            expect(texto).toMatch(dado);
        }
    });

    it('nenhuma seção fica sem título ou sem texto', () => {
        for (const secao of TERMO) {
            expect(secao.titulo.trim()).not.toBe('');
            expect(secao.texto.trim()).not.toBe('');
        }
    });

    // Item 34: o que é novo no que o app guarda precisa estar no que a pessoa aceita.
    it('avisa das perguntas opcionais, das notas por área e de onde o app é usado', () => {
        expect(texto).toMatch(/opcionais/i);
        expect(texto).toMatch(/nota que você se dá/i);
        expect(texto).toMatch(/navegador ou no celular/i);
    });

    it('diz que o app é para maiores de 18 anos', () => {
        expect(texto).toMatch(/18 anos/);
    });

    it('diz que as mensagens da Beast Maragames só vão para quem aceitou', () => {
        expect(texto).toMatch(/só.*se você aceitar/i);
    });

    // Passo 4 do plano até o piloto (item 24): o termo diz para que serve cada dado, onde ele fica,
    // por quanto tempo, e o que a pessoa pode pedir.
    it('diz que no sexo há a opção de não informar', () => {
        expect(texto).toMatch(/Prefiro não informar/);
    });

    it('diz para que servem a faixa etária, o sexo e o telefone', () => {
        expect(texto).toMatch(/faixa etária e o sexo servem para/i);
        expect(texto).toMatch(/sempre em conjunto/i);
        expect(texto).toMatch(/menos de 5 pessoas/i);
        // O relatório mostra quantas pessoas há em cada grupo; o que some são os resultados.
        expect(texto).toMatch(/só quantas pessoas ele tem/i);
        expect(texto).not.toMatch(/não aparece em nenhum relatório/i);
        expect(texto).toMatch(/telefone é para o grupo/i);
    });

    it('diz onde os dados ficam, quem tem acesso e até quando', () => {
        expect(texto).toMatch(/Firebase/);
        expect(texto).toMatch(/fora do Brasil/i);
        expect(texto).toMatch(/só o grupo/i);
        expect(texto).toMatch(/segundo semestre de 2026/i);
    });

    it('diz que a pessoa pode pedir para ver ou apagar os próprios dados, e por onde', () => {
        expect(texto).toMatch(/ver o que foi gravado/i);
        expect(texto).toMatch(/apagar/i);
        expect(texto).toMatch(/seção Sobre/i);
    });

    it('fala dos riscos e dos benefícios', () => {
        expect(texto).toMatch(/risco/i);
        expect(texto).toMatch(/em troca/i);
    });

    it('tem a data da versão, para saber que texto cada pessoa aceitou', () => {
        expect(VERSAO_DO_TERMO).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
});
