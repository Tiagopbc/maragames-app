import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { TelaDoBloco } from '@/components/pergunta/tela-do-bloco';
import { PortaoDoRoteiro } from '@/components/roteiro/portao-do-roteiro';
import { participanteDoRoteiro } from '@/lib/participante';
import { travaVale } from '@/lib/passo';
import { useSession } from '@/lib/session';
import type { Fase } from '@/types/domain';

const FASES: readonly Fase[] = ['pre', 'pratica', 'pos', 'reteste'];

// O parâmetro da rota é texto livre (na web, qualquer coisa digitada na URL).
function ehFase(valor: unknown): valor is Fase {
    return FASES.includes(valor as Fase);
}

// /bloco/pratica, /bloco/pre, /bloco/pos, /bloco/reteste. Na prática, `?topicId=` diz o tópico.
// O bloco só abre se for o da etapa em que a pessoa está (item 23); senão, volta para a home.
export default function BlocoScreen() {
    const { fase, topicId } = useLocalSearchParams<{ fase: string; topicId?: string }>();
    const { user, perfil } = useSession();
    const router = useRouter();

    if (!user || !ehFase(fase)) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    const participante = participanteDoRoteiro(perfil);
    const chave = `${fase}|${topicId ?? ''}`;
    const bloco = (
        <TelaDoBloco
            // Outro bloco é outra tela: nada do estado anterior é reaproveitado.
            key={chave}
            uid={user.uid}
            fase={fase}
            topicId={topicId ?? null}
            // A forma nasce no aceite do termo. Sem ela, o bloco medido não abre.
            formaPre={participante.formaPre}
            aoSair={sair}
        />
    );
    const destino = { tipo: 'bloco', fase, topicId } as const;

    // Em desenvolvimento, os links da home abrem os blocos medidos fora da etapa.
    if (!travaVale(destino, __DEV__)) return bloco;

    return (
        <PortaoDoRoteiro
            key={chave}
            uid={user.uid}
            participante={participante}
            destino={destino}
            barrado={<Redirect href="/" />}>
            {bloco}
        </PortaoDoRoteiro>
    );
}
