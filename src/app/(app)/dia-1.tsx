import { Redirect, useRouter } from 'expo-router';

import { TelaDoDia1 } from '@/components/espera/tela-do-dia-1';
import { PortaoDoRoteiro } from '@/components/roteiro/portao-do-roteiro';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

// Resultado do dia 1: abre pela home durante a espera do reteste (M5). Antes de o pós-teste
// terminar não há o que mostrar, e o portão manda de volta para a home (item 23).
export default function Dia1Screen() {
    const { user, perfil } = useSession();
    const router = useRouter();
    const participante = participanteDoRoteiro(perfil);

    // Sem a forma não houve pós-teste: nem chega a perguntar ao roteiro.
    if (!user || participante.formaPre === null) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    return (
        <PortaoDoRoteiro
            uid={user.uid}
            participante={participante}
            destino={{ tipo: 'dia1' }}
            barrado={<Redirect href="/" />}>
            <TelaDoDia1 uid={user.uid} formaPre={participante.formaPre} aoSair={sair} />
        </PortaoDoRoteiro>
    );
}
