import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { TelaDoProgresso } from '@/components/progresso/tela-do-progresso';
import { useLicoes } from '@/hooks/use-licoes';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

// O Progresso (Fase 5 do plano): /progresso. O "Meu domínio" do aluno.
export default function ProgressoScreen() {
    const { user, perfil } = useSession();
    const router = useRouter();

    const { formaPre } = participanteDoRoteiro(perfil);
    const { estado, recarregar } = useLicoes({ uid: user?.uid ?? '', formaPre });

    // Roda quando a tela ganha foco, inclusive na volta do detalhe de um tópico.
    useFocusEffect(
        useCallback(() => {
            recarregar();
        }, [recarregar])
    );

    if (!user) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    return (
        <TelaDoProgresso
            estado={estado}
            aoAbrir={(topicId) => router.push({ pathname: '/progresso/[topicId]', params: { topicId } })}
            aoTentarDeNovo={recarregar}
            aoSair={sair}
        />
    );
}
