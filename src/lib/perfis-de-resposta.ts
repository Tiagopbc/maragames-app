// O perfil de resposta de cada pessoa (item 35): o que as respostas dela dizem sobre como ela
// responde, sem perguntar nada. Função pura: sem React, sem Firebase, sem estado.
//
// As regras são de leitura direta, na ordem abaixo, e a primeira que vale decide. Os limites são
// escolhas do grupo, a revisar com dados de verdade: estão aqui para o relatório dizer, de cada
// perfil, como ele foi reconhecido.

import type { Confianca } from '../types/domain';

export type PerfilDeResposta =
    | 'domina'
    | 'em_progresso'
    | 'inseguro'
    | 'com_dificuldade'
    | 'confiante_demais'
    | 'chuta'
    | 'poucas_respostas';

export type RespostaDoPerfil = { correta: boolean; confianca: Confianca; tempoMs: number };

/** Com menos respostas que isto, o perfil não é dito: o acaso pesa mais que o jeito da pessoa. */
export const MINIMO_DE_RESPOSTAS = 6;

const CHUTE_ATE_O_ACERTO = 0.4; // perto do acaso, que é 25% com quatro alternativas
const CHUTE_ATE_O_TEMPO_MS = 6_000; // mediana: rápido demais para ler a questão
const PONTO_CEGO_A_PARTIR_DE = 0.25;
const DOMINA_A_PARTIR_DO_ACERTO = 0.75;
const DOMINA_A_PARTIR_DO_ACERTO_FIRME = 0.5;
const INSEGURO_A_PARTIR_DO_ACERTO = 0.55;
const INSEGURO_ATE_A_CERTEZA = 0.2;
const DIFICULDADE_ABAIXO_DO_ACERTO = 0.45;

// Na ordem em que o relatório mostra, e não na ordem em que as regras são testadas.
export const PERFIS_DE_RESPOSTA: Record<PerfilDeResposta, { rotulo: string; criterio: string }> = {
    domina: { rotulo: 'Domina o conteúdo', criterio: 'acerta três de cada quatro, e metade das respostas são acerto com certeza' },
    em_progresso: { rotulo: 'Em progresso', criterio: 'acerta boa parte, e a confiança acompanha o acerto' },
    inseguro: { rotulo: 'Sabe, mas duvida', criterio: 'acerta mais da metade, quase nunca marcando certeza' },
    com_dificuldade: { rotulo: 'Com dificuldade', criterio: 'acerta menos da metade, sem achar que sabe' },
    confiante_demais: { rotulo: 'Confiante demais', criterio: 'um quarto das respostas ou mais são erro com certeza' },
    chuta: { rotulo: 'Responde no chute', criterio: 'responde em poucos segundos e acerta perto do acaso' },
    poucas_respostas: { rotulo: 'Poucas respostas', criterio: `menos de ${MINIMO_DE_RESPOSTAS} respostas: ainda não dá para dizer` },
};

function mediana(valores: readonly number[]): number {
    const ordem = [...valores].sort((a, b) => a - b);
    const meio = Math.floor(ordem.length / 2);
    return ordem.length % 2 === 1 ? ordem[meio] : (ordem[meio - 1] + ordem[meio]) / 2;
}

/** O perfil de resposta de uma pessoa, pelas respostas dela. */
export function perfilDeResposta(respostas: readonly RespostaDoPerfil[]): PerfilDeResposta {
    const n = respostas.length;
    if (n < MINIMO_DE_RESPOSTAS) return 'poucas_respostas';

    const fracao = (conta: (r: RespostaDoPerfil) => boolean) => respostas.filter(conta).length / n;
    const acerto = fracao((r) => r.correta);
    const certeza = fracao((r) => r.confianca === 3);
    const acertoFirme = fracao((r) => r.correta && r.confianca === 3);
    const pontoCego = fracao((r) => !r.correta && r.confianca === 3);

    // O chute vem primeiro: quem responde sem ler pode marcar qualquer confiança.
    if (mediana(respostas.map((r) => r.tempoMs)) < CHUTE_ATE_O_TEMPO_MS && acerto <= CHUTE_ATE_O_ACERTO) return 'chuta';
    if (pontoCego >= PONTO_CEGO_A_PARTIR_DE) return 'confiante_demais';
    if (acerto >= DOMINA_A_PARTIR_DO_ACERTO && acertoFirme >= DOMINA_A_PARTIR_DO_ACERTO_FIRME) return 'domina';
    if (acerto >= INSEGURO_A_PARTIR_DO_ACERTO && certeza < INSEGURO_ATE_A_CERTEZA) return 'inseguro';
    if (acerto < DIFICULDADE_ABAIXO_DO_ACERTO) return 'com_dificuldade';
    return 'em_progresso';
}
