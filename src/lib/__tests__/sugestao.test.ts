import type { EstadoDaLicao, Licao } from '../licao';
import { sugestaoDoDia } from '../sugestao';

const progresso = { respondidas: 1, total: 3, proximaQuestaoId: 'q2' };

const licao = (topicId: string, estado: EstadoDaLicao, ultimaRespostaEm: number | null = null): Licao => ({
    topicId,
    ciclo: 'completo',
    estado,
    ultimaRespostaEm,
});

const nova = (topicId: string) => licao(topicId, { tipo: 'nova' });
const concluida = (topicId: string) => licao(topicId, { tipo: 'concluida', concluidaEm: 50 }, 50);
const aguardando = (topicId: string, liberaEm: number, diasRestantes: number) =>
    licao(topicId, { tipo: 'aguardando_revisao', liberaEm, diasRestantes }, 10);
const revisao = (topicId: string, liberadaEm: number) => licao(topicId, { tipo: 'revisao', liberadaEm, ...progresso }, 10);

describe('sugestaoDoDia', () => {
    it('revisão disponível vem antes de tudo', () => {
        const licoes = [nova('mda'), licao('pixel', { tipo: 'estudo', ...progresso }, 99), revisao('engine', 100)];

        expect(sugestaoDoDia(licoes)).toEqual({ tipo: 'revisao', topicId: 'engine' });
    });

    it('entre duas revisões, a que está liberada há mais tempo', () => {
        expect(sugestaoDoDia([revisao('mda', 200), revisao('pixel', 100)])).toEqual({ tipo: 'revisao', topicId: 'pixel' });
    });

    it('revisões liberadas no mesmo dia saem na ordem das lições', () => {
        expect(sugestaoDoDia([revisao('mda', 100), revisao('pixel', 100)])).toEqual({ tipo: 'revisao', topicId: 'mda' });
    });

    it.each(['diagnostico', 'estudo', 'verificacao'] as const)(
        'sem revisão, a lição parada em %s vem antes de uma lição nova',
        (tipo) => {
            const licoes = [nova('mda'), licao('pixel', { tipo, ...progresso }, 10)];

            expect(sugestaoDoDia(licoes)).toEqual({ tipo: 'continuar', topicId: 'pixel' });
        }
    );

    it('entre duas lições pela metade, a mexida mais recentemente', () => {
        const licoes = [
            licao('mda', { tipo: 'estudo', ...progresso }, 10),
            licao('pixel', { tipo: 'diagnostico', ...progresso }, 30),
            licao('engine', { tipo: 'verificacao', ...progresso }, 20),
        ];

        expect(sugestaoDoDia(licoes)).toEqual({ tipo: 'continuar', topicId: 'pixel' });
    });

    it('sem revisão e sem lição pela metade, a próxima lição nova na ordem sugerida', () => {
        const licoes = [concluida('mda'), aguardando('pixel', 500, 3), nova('engine'), nova('logica')];

        expect(sugestaoDoDia(licoes)).toEqual({ tipo: 'nova', topicId: 'engine' });
    });

    it('com tudo feito e revisão por vir, está em dia, e diz qual revisão abre primeiro', () => {
        const licoes = [aguardando('mda', 900, 5), concluida('gdd'), aguardando('pixel', 500, 3)];

        expect(sugestaoDoDia(licoes)).toEqual({ tipo: 'em_dia', topicId: 'pixel', liberaEm: 500, diasRestantes: 3 });
    });

    it('com todas as lições concluídas, não há o que sugerir', () => {
        expect(sugestaoDoDia([concluida('mda'), concluida('gdd')])).toEqual({ tipo: 'tudo_concluido' });
    });
});
