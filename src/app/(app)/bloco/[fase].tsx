import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { TelaDoBloco } from '@/components/pergunta/tela-do-bloco';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';
import type { Fase } from '@/types/domain';

const FASES: readonly Fase[] = ['pre', 'pratica', 'pos', 'reteste'];

// O parâmetro da rota é texto livre (na web, qualquer coisa digitada na URL).
function ehFase(valor: unknown): valor is Fase {
    return FASES.includes(valor as Fase);
}

// /bloco/pratica, /bloco/pre, /bloco/pos, /bloco/reteste. Na prática, `?topicId=` escolhe o
// tópico; sem ele, abre o primeiro com questão pendente.
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

    return (
        <TelaDoBloco
            // Outro bloco é outra tela: nada do estado anterior é reaproveitado.
            key={`${fase}|${topicId ?? ''}`}
            uid={user.uid}
            fase={fase}
            topicId={topicId ?? null}
            // A forma nasce no aceite do termo. Sem ela, o bloco medido não abre.
            formaPre={participanteDoRoteiro(perfil).formaPre}
            aoSair={sair}
        />
    );
}
