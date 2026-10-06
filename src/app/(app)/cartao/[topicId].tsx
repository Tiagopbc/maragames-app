import { useLocalSearchParams, useRouter } from 'expo-router';

import { TelaDoCartao } from '@/components/cartao/tela-do-cartao';

// Cartão de conceito de um tópico. Abre pelo "Continuar estudos" da home enquanto o tópico
// da vez não tem resposta de prática (item 22).
export default function CartaoScreen() {
    const { topicId } = useLocalSearchParams<{ topicId: string }>();
    const router = useRouter();

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
        // Outro tópico é outro cartão: recomeça do primeiro slide.
        <TelaDoCartao key={topicId} topicId={topicId} aoComecarPratica={comecarPratica} aoSair={sair} />
    );
}
