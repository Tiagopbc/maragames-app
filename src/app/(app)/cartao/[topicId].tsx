import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { TelaDoCartao } from '@/components/cartao/tela-do-cartao';
import { PortaoDoRoteiro } from '@/components/roteiro/portao-do-roteiro';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

// Cartão de conceito de um tópico. Abre pelo "Continuar estudos" da home enquanto o tópico
// da vez não tem resposta de prática (item 22). Fora do estudo daquele tópico, o portão manda
// de volta para a home (item 23).
export default function CartaoScreen() {
    const { topicId } = useLocalSearchParams<{ topicId: string }>();
    const { user, perfil } = useSession();
    const router = useRouter();

    if (!user) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    function comecarPratica() {
        // `replace`, e não `push`: a prática toma o lugar do cartão, então sair dela volta à
        // home, e não a um cartão que já não deveria abrir.
        router.replace({ pathname: '/bloco/[fase]', params: { fase: 'pratica', topicId } });
    }

    return (
        <PortaoDoRoteiro
            // Outro tópico é outra pergunta ao roteiro, e outro cartão: recomeça do primeiro slide.
            key={topicId}
            uid={user.uid}
            participante={participanteDoRoteiro(perfil)}
            destino={{ tipo: 'cartao', topicId }}
            barrado={<Redirect href="/" />}>
            <TelaDoCartao topicId={topicId} aoComecarPratica={comecarPratica} aoSair={sair} />
        </PortaoDoRoteiro>
    );
}
