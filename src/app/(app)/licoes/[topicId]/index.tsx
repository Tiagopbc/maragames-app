import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { TelaDaLicao } from '@/components/licao/tela-da-licao';
import { useAoVoltarAoApp } from '@/hooks/use-ao-voltar-ao-app';
import { useLicao } from '@/hooks/use-licao';
import type { DestinoDaLicao } from '@/lib/licao';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

// A página de uma lição (item 30): /licoes/mda_framework. Qualquer lição abre, em qualquer
// ordem; a trava vale só para os passos dentro dela.
export default function LicaoScreen() {
    const { topicId } = useLocalSearchParams<{ topicId: string }>();
    const { user, perfil } = useSession();
    const router = useRouter();

    const { formaPre } = participanteDoRoteiro(perfil);
    const { estado, recarregar } = useLicao({ uid: user?.uid ?? '', topicId, formaPre });

    // Roda quando a página ganha foco, inclusive na volta de um passo ou do termo.
    useFocusEffect(
        useCallback(() => {
            recarregar();
        }, [recarregar])
    );
    // E quando o app volta do segundo plano: a revisão abre pela virada do dia.
    useAoVoltarAoApp(recarregar);

    if (!user) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    function abrir(destino: DestinoDaLicao) {
        if (destino.tipo === 'termo') {
            router.push('/consentimento');
            return;
        }
        if (destino.passo === 'cartao') {
            router.push({ pathname: '/licoes/[topicId]/cartao', params: { topicId } });
            return;
        }
        router.push({ pathname: '/licoes/[topicId]/[passo]', params: { topicId, passo: destino.passo } });
    }

    return (
        <TelaDaLicao estado={estado} temForma={formaPre !== null} aoAbrir={abrir} aoTentarDeNovo={recarregar} aoSair={sair} />
    );
}
