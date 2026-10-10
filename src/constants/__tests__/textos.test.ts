import {
    acertosDoTopico,
    antesEDepois,
    detalheDaEtapa,
    quandoARevisaoAbre,
    detalheDaSugestao,
    contarDias,
    licoesFeitas,
    passoFeitoEm,
    termoAceitoEm,
    proximaRevisao,
    rotuloDoBotaoDaLicao,
    tituloDaSugestao,
    situacaoDaLicao,
    verificacaoEHoje,
    formatarAcertos,
    formatarTaxa,
    formatarXp,
    formatarXpTotal,
    resumirQuadrantes,
} from '../textos';

describe('formatarXp', () => {
    it('ganho aparece com sinal de mais', () => {
        expect(formatarXp(3)).toBe('+3 XP');
    });

    it('perda aparece com sinal de menos tipográfico', () => {
        expect(formatarXp(-4)).toBe('−4 XP');
    });

    it('zero aparece sem sinal', () => {
        expect(formatarXp(0)).toBe('0 XP');
    });
});

describe('formatarXpTotal', () => {
    it('o total da home leva o rótulo na frente', () => {
        expect(formatarXpTotal(18)).toBe('XP: +18');
    });

    it('zero aparece sem sinal', () => {
        expect(formatarXpTotal(0)).toBe('XP: 0');
    });
});

describe('acertosDoTopico', () => {
    it('diz os acertos do tópico e o XP que ele rendeu', () => {
        expect(acertosDoTopico(6, 6, 'UX/UI em jogos', 18)).toBe(
            'Você acertou 6 de 6 questões de UX/UI em jogos · +18 XP'
        );
    });

    it('saldo negativo aparece como é', () => {
        expect(acertosDoTopico(1, 6, 'GDD', -5)).toBe('Você acertou 1 de 6 questões de GDD · −5 XP');
    });
});

describe('os textos da lição', () => {
    const progresso = (respondidas: number) => ({ respondidas, total: 3, proximaQuestaoId: 'q' });

    it('o botão diz o passo da vez', () => {
        expect(rotuloDoBotaoDaLicao({ tipo: 'nova' })).toBe('Começar');
        expect(rotuloDoBotaoDaLicao({ tipo: 'diagnostico', ...progresso(1) })).toBe('Continuar o diagnóstico');
        expect(rotuloDoBotaoDaLicao({ tipo: 'estudo', ...progresso(0) })).toBe('Abrir o cartão');
        expect(rotuloDoBotaoDaLicao({ tipo: 'estudo', ...progresso(2) })).toBe('Continuar a prática');
        expect(rotuloDoBotaoDaLicao({ tipo: 'verificacao', ...progresso(0) })).toBe('Fazer a verificação');
        expect(rotuloDoBotaoDaLicao({ tipo: 'verificacao', ...progresso(1) })).toBe('Continuar a verificação');
        expect(rotuloDoBotaoDaLicao({ tipo: 'revisao', liberadaEm: 0, ...progresso(0) })).toBe('Fazer a revisão');
        expect(rotuloDoBotaoDaLicao({ tipo: 'revisao', liberadaEm: 0, ...progresso(1) })).toBe('Continuar a revisão');
    });

    it('a etapa parada no meio diz onde a pessoa parou; as outras, o tamanho', () => {
        const noEstudo = { tipo: 'estudo', ...progresso(2) } as const;

        expect(detalheDaEtapa('estudo', 3, noEstudo)).toBe('2 de 3');
        expect(detalheDaEtapa('diagnostico', 3, noEstudo)).toBe('3 questões');
        expect(detalheDaEtapa('verificacao', 1, noEstudo)).toBe('1 questão');
    });

    it('a revisão diz quando abre, até abrir', () => {
        expect(detalheDaEtapa('revisao', 3, { tipo: 'nova' })).toBe('7 dias depois da verificação');
        expect(detalheDaEtapa('revisao', 3, { tipo: 'aguardando_revisao', liberaEm: 0, diasRestantes: 5 })).toBe('Abre em 5 dias');
        expect(detalheDaEtapa('revisao', 3, { tipo: 'aguardando_revisao', liberaEm: 0, diasRestantes: 1 })).toBe('Abre amanhã');
        expect(detalheDaEtapa('revisao', 3, { tipo: 'revisao', liberadaEm: 0, ...progresso(0) })).toBe('3 questões');
    });

    it('a situação da lição, para a lista', () => {
        expect(situacaoDaLicao({ tipo: 'nova' })).toBe('Nova');
        expect(situacaoDaLicao({ tipo: 'diagnostico', ...progresso(1) })).toBe('Em andamento');
        expect(situacaoDaLicao({ tipo: 'estudo', ...progresso(0) })).toBe('Em andamento');
        expect(situacaoDaLicao({ tipo: 'verificacao', ...progresso(0) })).toBe('Em andamento');
        expect(situacaoDaLicao({ tipo: 'aguardando_revisao', liberaEm: 0, diasRestantes: 5 })).toBe('Revisão em 5 dias');
        expect(situacaoDaLicao({ tipo: 'aguardando_revisao', liberaEm: 0, diasRestantes: 1 })).toBe('Revisão amanhã');
        expect(situacaoDaLicao({ tipo: 'revisao', liberadaEm: 0, ...progresso(0) })).toBe('Revisão disponível');
        expect(situacaoDaLicao({ tipo: 'concluida', concluidaEm: 0 })).toBe('Concluída');
    });

    it('o Para hoje: título, detalhe e a próxima revisão', () => {
        expect(tituloDaSugestao('Framework MDA', { tipo: 'nova' })).toBe('Framework MDA');
        expect(tituloDaSugestao('Framework MDA', { tipo: 'revisao', liberadaEm: 0, ...progresso(0) })).toBe('Revisão de Framework MDA');
        expect(detalheDaSugestao({ tipo: 'nova' })).toBe('Lição nova');
        expect(detalheDaSugestao({ tipo: 'estudo', ...progresso(0) })).toBe('Cartão e prática');
        expect(detalheDaSugestao({ tipo: 'diagnostico', ...progresso(2) })).toBe('Diagnóstico · 2 de 3');
        expect(detalheDaSugestao({ tipo: 'revisao', liberadaEm: 0, ...progresso(0) })).toBe('3 questões');
        expect(proximaRevisao('Framework MDA', 5)).toBe('Próxima revisão: Framework MDA, em 5 dias.');
        expect(proximaRevisao('Framework MDA', 1)).toBe('Próxima revisão: Framework MDA, amanhã.');
    });

    it('o atalho Lições conta as feitas, no singular e no plural', () => {
        expect(licoesFeitas(0, 9)).toBe('0 de 9 feitas');
        expect(licoesFeitas(1, 9)).toBe('1 de 9 feita');
        expect(licoesFeitas(3, 9)).toBe('3 de 9 feitas');
    });

    it('o histórico e o termo dizem a data no fuso de São Luís', () => {
        // 02:00 UTC de 09/10 ainda é 08/10 em São Luís.
        expect(passoFeitoEm('pre', Date.UTC(2026, 9, 9, 2))).toBe('Diagnóstico · 08/10');
        expect(passoFeitoEm('reteste', Date.UTC(2026, 9, 15, 15))).toBe('Revisão · 15/10');
        expect(termoAceitoEm(Date.UTC(2026, 9, 6, 15))).toBe('Termo de participação aceito em 06/10/2026.');
    });

    it('a sequência, no singular e no plural', () => {
        expect(contarDias(1)).toBe('1 dia');
        expect(contarDias(3)).toBe('3 dias');
    });

    it('o antes e o depois saem em contagem, e não em percentual', () => {
        expect(antesEDepois({ acertos: 1, total: 3 }, { acertos: 3, total: 3 })).toBe('Antes 1 de 3 → Depois 3 de 3');
        expect(verificacaoEHoje({ acertos: 3, total: 3 }, { acertos: 2, total: 3 })).toBe('Na verificação 3 de 3 → Hoje 2 de 3');
    });

    it('a data da revisão sai no fuso de São Luís, com o artigo do dia', () => {
        // 16/10/2026 é sexta; 17/10, sábado.
        expect(quandoARevisaoAbre(Date.UTC(2026, 9, 16, 3))).toBe('A revisão abre na sexta, 16/10.');
        expect(quandoARevisaoAbre(Date.UTC(2026, 9, 17, 3))).toBe('A revisão abre no sábado, 17/10.');
    });
});

describe('resumirQuadrantes', () => {
    it('lista o que há para revisar, do mais urgente ao menos, no plural certo', () => {
        expect(resumirQuadrantes({ firme: 1, fragil: 2, lacuna: 1, ponto_cego: 2 })).toBe(
            '2 pontos cegos · 1 lacuna · 2 frágeis'
        );
    });

    it('usa o singular quando é um só', () => {
        expect(resumirQuadrantes({ firme: 0, fragil: 1, lacuna: 0, ponto_cego: 1 })).toBe('1 ponto cego · 1 frágil');
    });

    it('deixa de fora o que está zerado e o que está firme', () => {
        expect(resumirQuadrantes({ firme: 3, fragil: 0, lacuna: 2, ponto_cego: 0 })).toBe('2 lacunas');
    });
});

describe('formatarTaxa e formatarAcertos', () => {
    it('a taxa diz quantos acertos em quantas respostas', () => {
        expect(formatarTaxa(2, 3)).toBe('2 de 3');
    });

    it('sem resposta naquele grupo, a taxa diz isso em vez de "0 de 0"', () => {
        expect(formatarTaxa(0, 0)).toBe('sem respostas');
    });

    it('o resumo de acertos não depende de plural', () => {
        expect(formatarAcertos(1, 2)).toBe('Acertou 1 de 2');
        expect(formatarAcertos(8, 12)).toBe('Acertou 8 de 12');
    });
});

