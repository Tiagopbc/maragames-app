import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { TelaDoTopico } from '@/components/progresso/tela-do-topico';
import { useLicoes } from '@/hooks/use-licoes';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

// O detalhe de um tópico no Progresso (Fase 5 do plano): /progresso/mda_framework.
export default function TopicoScreen() {
    const { topicId } = useLocalSearchParams<{ topicId: string }>();
    const { user, perfil } = useSession();
    const router = useRouter();

    const { formaPre } = participanteDoRoteiro(perfil);
    const { estado, recarregar } = useLicoes({ uid: user?.uid ?? '', formaPre });

    // Roda quando a tela ganha foco, inclusive na volta da lição.
    useFocusEffect(
        useCallback(() => {
            recarregar();
        }, [recarregar])
    );

    if (!user) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/progresso');
    }

    return (
        <TelaDoTopico
            estado={estado}
            topicId={topicId}
            aoAbrirLicao={() => router.push({ pathname: '/licoes/[topicId]', params: { topicId } })}
            aoTentarDeNovo={recarregar}
            aoSair={sair}
        />
    );
}
