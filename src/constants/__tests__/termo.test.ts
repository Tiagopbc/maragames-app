import { TERMO } from '../termo';

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
});
